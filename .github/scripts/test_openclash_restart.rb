require_relative '../../maintenance/prepare-openclash-restart'
require 'open3'

def assert(value, message); raise message unless value; end
def shell(source)
  out, err, status = Open3.capture3('sh', '-s', stdin_data: source)
  assert(status.success?, 'synthetic shell failed: ' + err)
  out.strip
end

# Small synthetic upstream shape, never an installed init script.
fixture = <<~'SH'
  #!/bin/sh
  before='preserve unrelated behavior'
  stop_service() {
        LOG_OUT "Step 4: Restart Dnsmasq..."
        revert_dnsmasq
  }
  restart() {
     check_run_quick
     stop_service
     start
  }
  revert_firewall()
  {
              local lines=$($ipt |sed 1,2d |sed -n "/${comment}/=" 2>/dev/null |sort -rn)
  }
  add_rules() {
     iptables -t nat -I OUTPUT -p tcp --to-ports "$DNSPORT" -m comment --comment "OpenClash DNS Hijack"
     iptables -t nat -I OUTPUT -p udp --to-ports "$DNSPORT" -m comment --comment "OpenClash DNS Hijack"
     ip6tables -t nat -I OUTPUT -p tcp --to-ports "$DNSPORT" -m comment --comment "OpenClash DNS Hijack"
     ip6tables -t nat -I OUTPUT -p udp --to-ports "$DNSPORT" -m comment --comment "OpenClash DNS Hijack"
     iptables -I INPUT -m conntrack --ctstate DNAT -j ACCEPT -m comment --comment "OpenClash Redirect Accept"
     ip6tables -I INPUT -m conntrack --ctstate DNAT -j ACCEPT -m comment --comment "OpenClash Redirect Accept"
  }
  after='preserve unrelated behavior'
SH
sha = Digest::SHA256.hexdigest(fixture)
candidate = prepare_restart(fixture, sha)
assert(Digest::SHA256.hexdigest(fixture) == sha, 'input mutated')
assert(candidate.start_with?(fixture.split('stop_service()').first) && candidate.end_with?("after='preserve unrelated behavior'\n"), 'unrelated source changed')
_, err, status = Open3.capture3('sh', '-n', stdin_data: candidate)
assert(status.success?, 'candidate syntax: '+err)
[
  [fixture, '0'*64], [fixture, ''], [fixture+fixture, nil], [candidate, nil],
  [fixture.sub('check_run_quick', 'upstream_changed'), nil],
  [fixture.sub('ip6tables -t nat -I OUTPUT', 'changed -t nat -I OUTPUT'), nil],
  [fixture.sub('revert_firewall()', 'changed()'), nil],
  [fixture.b+"\xff".b, nil], ['x'*(512*1024+1), nil]
].each do |input, hash|
  rejected = false
  begin; prepare_restart(input, hash || Digest::SHA256.hexdigest(input)); rescue StandardError; rejected = true; end
  assert(rejected, 'unsafe or unknown input accepted')
end

stubs = <<~'SH'
  LOG_OUT() { :; }
  revert_dnsmasq() { echo restore; }
  check_run_quick() { :; }
  start() { [ -z "$OPENCLASH_DNS_RESTART" ] || return 99; echo start; }
  uci_get_config() { case "$1" in enable_redirect_dns) echo "$mode";; redirect_dns) echo "$active";; *) echo "$black";; esac; }
  uci() { echo "$port"; }
SH
[['1','1','1','start'], ['0','1','1',"restore\nstart"], ['1','2','1',"restore\nstart"], ['1','1','0',"restore\nstart"]].each do |en, mode, active, expected|
  result = shell(candidate+stubs+"\nenable=#{en}; mode=#{mode}; active=#{active}; restart\n")
  assert(result == expected, 'restart/disabled/mode restoration regression')
end
assert(shell(candidate+stubs+"\nenable=1; mode=1; active=1; stop_service\n") == 'restore', 'explicit stop must restore')

# Execute the actual eligibility block; no firewall commands are evaluated.
eligibility = candidate.split("revert_firewall()\n{\n", 2).last.split('            local lines=', 2).first
cases = [
  %w[1 1 1 1 none 0 default none 1], %w[0 1 1 1 none 0 default none 0],
  %w[1 0 1 1 none 0 default none 0], %w[1 1 2 1 none 0 default none 0],
  %w[1 1 1 0 none 0 default none 0], %w[1 1 1 1 fw4 0 default none 0],
  %w[1 1 1 1 none 1 default none 0], %w[1 1 1 1 none 0 1053 none 0],
  %w[1 1 1 1 none 0 default configured 0], %w[1 1 1 1 none 0 53 none 1]
]
cases.each do |flag,en,mode,active,fw4,acl,port,black,expected|
  values = "OPENCLASH_DNS_RESTART=#{flag}; enable=#{en}; enable_redirect_dns=#{mode}; active=#{active}; FW4=#{fw4=='none' ? '' : fw4}; lan_ac_mode=#{acl}; port=#{port=='default' ? '' : port}; black=#{black=='none' ? '' : black};\n"
  assert(shell(stubs+values+"probe() {\n"+eligibility+"echo \"$keep_restart_dns\";\n}; probe\n") == expected, 'unsupported restart eligibility')
end

filter = candidate[/awk -v tag=.*? '([^']+)'/,1]
rules = "REDIRECT OpenClash DNS Hijack\nREJECT OpenClash WAN DNS guard\nACCEPT OpenClash General\nJUMP openclash\nACCEPT unrelated\n"
%w[0 1].each do |keep|
  actual = %w[OpenClash openclash].flat_map do |tag|
    out, _, ok = Open3.capture3('awk','-v',"tag=#{tag}",'-v',"keep=#{keep}",filter,stdin_data:rules)
    assert(ok.success?, 'rule filter failed'); out.lines.map(&:to_i)
  end.sort
  assert(actual == (keep=='1' ? [3,4] : [1,2,3,4]), 'deletion indexes shifted')
end
position = candidate[/awk '([^']+)'/,1]
[['-P INPUT ACCEPT\n-A INPUT unrelated\n',1],['-A INPUT OpenClash WAN DNS guard\n-A INPUT unrelated\n',2],['-A INPUT unrelated\n-A INPUT OpenClash WAN DNS guard staging\n',3]].each do |ruleset,want|
  out, _, ok = Open3.capture3('awk',position,stdin_data:ruleset.gsub('\\n',"\n"))
  assert(ok.success? && out.to_i==want, 'DNAT ACCEPT precedes guard')
end
output_rules = candidate.lines.select { |l| l.include?('-C OUTPUT') }.join
%w[0 1].each do |exists|
  mock = "iptables() { case \" $* \" in *' -C OUTPUT '*) return #{exists};; *' -I OUTPUT '*) echo insert;; *) return 99;; esac; }; ip6tables() { iptables \"$@\"; };\n"
  assert(shell(mock+output_rules).lines.size == (exists=='0' ? 0 : 4), 'OUTPUT duplicate/missing redirect')
end

# Stateful in-memory firewall model. All mutation is to shell variables.
guard = File.read(File.expand_path('../../maintenance/openclash-wan-dns-guard.sh', __dir__))
mock = <<~'SH'
  command() { [ "$1" = -v ] && [ "$2" != fw4 ]; }
  uci() { echo 7874; }
  v4='OTHER ACCEPT wan_test/tcp/main wan_test/udp/main'
  v6="$v4"
  failures=0
  fake_iptables() {
    local family="$1" op='' proto='' comment='' item rules token next found=0
    shift
    while [ "$#" -gt 0 ]; do
      case "$1" in -S|-C|-I|-D) op="$1";; -p) shift; proto="$1";; --comment) shift; comment="$1";; esac
      shift
    done
    if [ "$op" = -S ]; then echo '-A INPUT -i wan_test -j zone_wan_input'; return; fi
    case "$comment" in 'OpenClash WAN DNS guard') item="wan_test/$proto/main";; 'OpenClash WAN DNS guard staging') item="wan_test/$proto/staging";; *) return 98;; esac
    if [ "$family" = 4 ]; then rules="$v4"; else rules="$v6"; fi
    case "$op" in
      -C) case " $rules " in *" $item "*) return 0;; *) return 1;; esac;;
      -I) rules="$item $rules";;
      -D)
        [ "$fail_delete" != 1 ] || return 97
        next=''
        for token in $rules; do
          if [ "$token" = "$item" ] && [ "$found" = 0 ]; then found=1; else next="$next $token"; fi
        done
        [ "$found" = 1 ] || return 96
        rules="$next";;
      *) return 95;;
    esac
    case " $rules " in *" wan_test/$proto/main "*|*" wan_test/$proto/staging "*) :;; *) failures=$((failures+1));; esac
    if [ "$family" = 4 ]; then v4="$rules"; else v6="$rules"; fi
  }
  iptables() { fake_iptables 4 "$@"; }
  ip6tables() { fake_iptables 6 "$@"; }
SH
out = shell(mock+guard+"\noc_wan_dns_guard || exit 90\noc_wan_dns_guard || exit 91\necho \"$v4\"; echo \"$v6\"; echo \"$failures\"\n")
assert(out.lines.first(2).all? { |l| l.split == %w[wan_test/udp/main wan_test/tcp/main OTHER ACCEPT] }, 'guard reordering/duplicates/unrelated rules')
assert(out.lines.last.strip=='0', 'guard removed without replacement protection')
out = shell(mock+guard+"\nfail_delete=1; if oc_wan_dns_guard; then exit 92; fi\necho \"$v4\"\n")
assert(out.split.include?('wan_test/tcp/staging') && out.split.include?('wan_test/tcp/main'), 'failure removed protection')
policy = File.read(File.expand_path('../../maintenance/openclash-logrotate.conf', __dir__))
%w[daily].each { |word| assert(policy.lines.map(&:strip).include?(word), 'daily rotation absent') }
['maxsize 2M','rotate 4','maxage 7'].each { |line| assert(policy.lines.map(&:strip).include?(line), 'rotation bound missing') }
puts 'OpenClash restart: atomic candidate rejection, stop restoration, eligibility, rule indexes, OUTPUT idempotence and stateful WAN ordering PASS'
