# Reviewed fw3/dnsmasq init script in, candidate out. No deployment or UCI writes.
require 'digest'

def prepare_restart(original, expected_sha)
  raise 'expected reviewed lowercase SHA256' unless expected_sha&.match?(/\A[0-9a-f]{64}\z/)
  raise 'init exceeds 512 KiB' if original.bytesize > 512 * 1024
  raise 'init hash mismatch' unless Digest::SHA256.hexdigest(original) == expected_sha
  body = original.dup.force_encoding('UTF-8')
  raise 'invalid UTF-8 init' unless body.valid_encoding?
  raise 'already patched; review paired firewall hook' if body.include?('OPENCLASH_DNS_RESTART') || body.include?('keep_restart_dns')
  replace = lambda do |old, replacement|
    raise 'unknown or ambiguous init block; manual review required' unless body.scan(old).size == 1
    body = body.sub(old, replacement)
  end
  replacement = (<<~'SH').lines.map { |line| '      ' + line }.join
    LOG_OUT "Step 4: Restart Dnsmasq..."
    # Local maintenance: keep DNS fail-closed only during an enabled restart.
    # Explicit stop and changing away from dnsmasq retain native restoration.
    if [ "$OPENCLASH_DNS_RESTART" = "1" ] && [ "$enable" = "1" ] && \
       [ "$(uci_get_config enable_redirect_dns)" = "1" ] && \
       [ "$(uci_get_config redirect_dns)" = "1" ]; then
       LOG_OUT "Keep Dnsmasq On Core During Restart..."
    else
       revert_dnsmasq
    fi
  SH
  replace.call("      LOG_OUT \"Step 4: Restart Dnsmasq...\"\n      revert_dnsmasq\n", replacement)
  replace.call("   check_run_quick\n   stop_service\n   start\n",
               "   check_run_quick\n   OPENCLASH_DNS_RESTART=1\n   stop_service\n   unset OPENCLASH_DNS_RESTART\n   start\n")
  replace.call("revert_firewall()\n{\n", <<~'SH')
    revert_firewall()
    {
       # Keep native DNS redirects and WAN DNS guards during this device's restart.
       # No ACL/ipset references are retained; explicit stop remains native.
       local keep_restart_dns=0
       if [ "$OPENCLASH_DNS_RESTART" = "1" ] && [ "$enable" = "1" ] && \
          [ "$enable_redirect_dns" = "1" ] && [ "$(uci_get_config redirect_dns)" = "1" ] && \
          [ -z "$FW4" ] && [ "$lan_ac_mode" = "0" ]; then
          local restart_dns_port="$(uci -q get dhcp.@dnsmasq[0].port)"
          local restart_dns_acl="$(uci_get_config lan_ac_black_ips)$(uci_get_config lan_ac_black_ipv6s)$(uci_get_config lan_ac_black_macs)"
          if [ "${restart_dns_port:-53}" = "53" ] && [ -z "$restart_dns_acl" ]; then
             keep_restart_dns=1
          fi
       fi
  SH
  replace.call(%q{            local lines=$($ipt |sed 1,2d |sed -n "/${comment}/=" 2>/dev/null |sort -rn)},
               %q{            local lines=$($ipt |sed 1,2d |awk -v tag="$comment" -v keep="$keep_restart_dns" 'index($0,tag) && !(keep==1 && (index($0,"OpenClash DNS Hijack") || index($0,"OpenClash WAN DNS guard"))) {print NR}' |sort -rn)})
  changed = 0
  body = body.lines.map do |line|
    if line.match?(/^\s+ip6?tables -t nat -I OUTPUT /) && line.include?('--to-ports "$DNSPORT"') && line.include?('OpenClash DNS Hijack')
      changed += 1
      line.sub(' -I OUTPUT ', ' -C OUTPUT ').rstrip + ' 2>/dev/null || ' + line.strip + "\n"
    else
      line
    end
  end.join
  raise 'unknown OUTPUT redirect sites' unless changed == 4
  selector = %q{$1=="-A" && $2=="INPUT" {n++; if(index($0,"OpenClash WAN DNS guard")) last=n} END {print last+1}}
  %w[iptables ip6tables].each do |tool|
    old = tool + ' -I INPUT -m conntrack --ctstate DNAT -j ACCEPT -m comment --comment "OpenClash Redirect Accept"'
    replacement = tool + ' -I INPUT "$(' + tool + ' -w 5 -t filter -S INPUT | awk ' + "'#{selector}'" + ')" -m conntrack --ctstate DNAT -j ACCEPT -m comment --comment "OpenClash Redirect Accept"'
    replace.call(old, replacement)
  end
  body
end

if $PROGRAM_NAME == __FILE__
  begin
    raise 'usage: ruby prepare-openclash-restart.rb REVIEWED_SHA256 < init.before > init.candidate' unless ARGV.length == 1
    STDOUT.write(prepare_restart(STDIN.read(512 * 1024 + 1), ARGV.fetch(0)))
  rescue StandardError => e
    warn e.message
    exit 1
  end
end
