#!/bin/sh
# Source from the native custom-firewall hook, then call oc_wan_dns_guard.
# Explicit installation only. No UCI changes, downloads, cron or public listeners.
# fw3 implementation: unsupported backends fail without changing any rule.
oc_wan_dns_guard() {
    command -v fw4 >/dev/null 2>&1 && return 1
    local dns_port ipt wan_interfaces wan_if proto guard_comment guard_removed
    dns_port="$(uci -q get openclash.config.dns_port)"
    case "$dns_port" in ''|*[!0-9]*) return 1 ;; esac
    [ "$dns_port" -ge 1 ] && [ "$dns_port" -le 65535 ] || return 1
    for ipt in iptables ip6tables; do
        command -v "$ipt" >/dev/null 2>&1 || return 1
        wan_interfaces="$($ipt -w 5 -t filter -S INPUT | awk '
            $1 == "-A" && $2 == "INPUT" {
                dev=""; wan=0
                for (i=3; i<=NF; i++) {
                    if ($i == "-i") dev=$(i+1)
                    if ($i == "-j" && $(i+1) == "zone_wan_input") wan=1
                }
                if (wan && dev != "") print dev
            }' | sort -u)"
        [ -n "$wan_interfaces" ] || return 1
        for wan_if in $wan_interfaces; do
            case "$wan_if" in *[!A-Za-z0-9_.:-]*) return 1 ;; esac
            for proto in tcp udp; do
                # Protect this path while moving existing guards above native DNAT ACCEPT.
                "$ipt" -w 5 -t filter -I INPUT 1 -i "$wan_if" -p "$proto" \
                    -m multiport --dports "53,$dns_port" -m conntrack --ctdir ORIGINAL \
                    -m comment --comment "OpenClash WAN DNS guard staging" -j REJECT || return 1
                for guard_comment in "OpenClash WAN DNS guard"; do
                    guard_removed=0
                    while "$ipt" -w 5 -t filter -C INPUT -i "$wan_if" -p "$proto" \
                        -m multiport --dports "53,$dns_port" -m conntrack --ctdir ORIGINAL \
                        -m comment --comment "$guard_comment" -j REJECT 2>/dev/null; do
                        [ "$guard_removed" -lt 8 ] || return 1
                        "$ipt" -w 5 -t filter -D INPUT -i "$wan_if" -p "$proto" \
                            -m multiport --dports "53,$dns_port" -m conntrack --ctdir ORIGINAL \
                            -m comment --comment "$guard_comment" -j REJECT || return 1
                        guard_removed=$((guard_removed + 1))
                    done
                done
                "$ipt" -w 5 -t filter -I INPUT 1 -i "$wan_if" -p "$proto" \
                    -m multiport --dports "53,$dns_port" -m conntrack --ctdir ORIGINAL \
                    -m comment --comment "OpenClash WAN DNS guard" -j REJECT || return 1
                guard_removed=0
                while "$ipt" -w 5 -t filter -C INPUT -i "$wan_if" -p "$proto" \
                    -m multiport --dports "53,$dns_port" -m conntrack --ctdir ORIGINAL \
                    -m comment --comment "OpenClash WAN DNS guard staging" -j REJECT 2>/dev/null; do
                    [ "$guard_removed" -lt 8 ] || return 1
                    "$ipt" -w 5 -t filter -D INPUT -i "$wan_if" -p "$proto" \
                        -m multiport --dports "53,$dns_port" -m conntrack --ctdir ORIGINAL \
                        -m comment --comment "OpenClash WAN DNS guard staging" -j REJECT || return 1
                    guard_removed=$((guard_removed + 1))
                done
            done
        done
    done
}
