require_relative 'openclash_local_dns'
require_relative '../../maintenance/openclash-settings-audit'
require 'open3'

def check(value, message); raise message unless value; end
dns = {'enable'=>true, 'listen'=>'0.0.0.0:7874', 'ipv6'=>true, 'enhanced-mode'=>'fake-ip',
       'nameserver-policy'=>{'rule-set:private'=>['https://dns.example.test'], '+.lan'=>['old.invalid']}}
device = {'mode'=>'2', 'domain'=>'lan', 'local'=>'/lan/', 'port'=>'', 'core_port'=>'7874'}
before = Marshal.dump(dns)
applied = OpenClashLocalDNS.apply(dns, device)
check(applied['nameserver-policy'].keys.first == '+.lan', 'local priority lost')
check(applied['nameserver-policy']['+.lan'] == ['127.0.0.1:53#DIRECT'], 'wrong local DNS target')
check(Marshal.dump(dns) == before, 'input mutated')
check(OpenClashLocalDNS.apply(applied, device) == applied, 'not idempotent')
%w[0 1 unknown].each { |mode| check(OpenClashLocalDNS.apply(dns, device.merge('mode'=>mode)) == dns, 'unexpected injection') }
alternate = OpenClashLocalDNS.apply(dns, device.merge('domain'=>'home.arpa', 'local'=>'/home.arpa/', 'port'=>'1053'))
check(alternate['nameserver-policy']['+.home.arpa'] == ['127.0.0.1:1053#DIRECT'], 'custom authoritative zone')
check(alternate['nameserver-policy']['rule-set:private'] == dns['nameserver-policy']['rule-set:private'], 'public DNS drift')
negatives = [{'domain'=>'x;touch bad'}, {'domain'=>'a..b'}, {'local'=>'/other/'}, {'port'=>'0'}, {'port'=>'65536'}, {'port'=>'7874'}, {'domain'=>'-lan'}]
negatives.each do |delta|
  rejected = false
  begin; OpenClashLocalDNS.apply(dns, device.merge(delta)); rescue ArgumentError; rejected = true; end
  check(rejected, 'unsafe settings accepted')
  check(Marshal.dump(dns) == before, 'failure mutated input')
end
config = {'dns'=>dns, 'geo-auto-update'=>false, 'rule-providers'=>{'x'=>{'type'=>'http','interval'=>86400}},
          'proxies'=>[{'type'=>'hysteria2','skip-cert-verify'=>true,'fingerprint'=>'a'*64}]}
options = {'en_mode'=>'fake-ip', 'dns_port'=>'7874', 'ipv6_dns'=>'1', 'enable_redirect_dns'=>'1',
           'auto_update'=>'1', 'config_auto_update_mode'=>'1', 'config_update_interval'=>'180',
           'geo_auto_update'=>'1','geo_update_week_time'=>'*'}
check(OpenClashSettingsAudit.check(config, options)['problems'].empty?, 'valid audit rejected')
check(OpenClashSettingsAudit.check(config, options.merge('geo_update_week_time'=>'1'))['problems'].include?('DATA_UPDATE_OVER_24H'), 'weekly accepted')
check(OpenClashSettingsAudit.check(config, options.merge('config_update_interval'=>'1441'))['problems'].include?('SUBSCRIPTION_UPDATE_OVER_24H'), 'slow subscription accepted')
bad = Marshal.load(Marshal.dump(config)); bad['rule-providers']['x']['interval']=86401
check(OpenClashSettingsAudit.check(bad, options)['problems'].include?('PROVIDER_UPDATE_OVER_24H_OR_DISABLED'), 'slow provider accepted')
bad['proxies'][0].delete('fingerprint')
check(OpenClashSettingsAudit.check(bad, options)['problems'].include?('TLS_SKIP_WITHOUT_RECOGNIZED_PIN'), 'unpinned skip accepted')

# Mock every mutating command; never execute host firewall tools.
guard = File.read(File.expand_path('../../maintenance/openclash-wan-dns-guard.sh', __dir__))
mock = <<~'SH'
  command() { [ "$1" = -v ] && [ "$2" != fw4 ]; }
  uci() { echo 7874; }
  fake_iptables() {
    case " $* " in
      *' -S INPUT '*) printf '%s\n' '-A INPUT -i wan_test -j zone_wan_input' ;;
      *' -C INPUT '*) return 1 ;;
      *' -I INPUT '*) echo "INSERT $*" ;;
      *) return 99 ;;
    esac
  }
  iptables() { fake_iptables "$@"; }
  ip6tables() { fake_iptables "$@"; }
SH
output, error, status = Open3.capture3('sh', '-s', stdin_data: mock+guard+"\noc_wan_dns_guard\n")
check(status.success? && output.lines.size==8, 'guard fixture failed: '+error)
check(output.lines.all?{|l|l.include?('--ctdir ORIGINAL') && l.include?('--dports 53,7874')}, 'reply protection missing')
_, _, status = Open3.capture3('sh', '-s', stdin_data: mock+guard+"\nuci() { echo bad; }; oc_wan_dns_guard\n")
check(!status.success?, 'invalid port accepted')
output, _, status = Open3.capture3('sh', '-s', stdin_data: mock+guard+"\ncommand() { return 0; }; oc_wan_dns_guard\n")
check(!status.success? && output.empty?, 'unsupported fw4 changed rules')
existing = mock.sub("*' -C INPUT '*) return 1", "*' -C INPUT '*) return 0")
output, _, status = Open3.capture3('sh', '-s', stdin_data: existing+guard+"\noc_wan_dns_guard\n")
check(!status.success? && output.lines.size==1, 'unbounded duplicate cleanup accepted')
puts 'OpenClash DNS: authoritative zone, both interception modes, atomicity, daily updates, pins and mocked WAN guard PASS'
