# 唯一验证入口调用的内存内合成检查，不访问订阅或真实配置。
require_relative 'openclash_telegram_split'
def check(value, message)
  raise message unless value
end
def copy(value)
  Marshal.load(Marshal.dump(value))
end
regions = ['新加坡-自动', '自动选择', '节点选择', '香港-自动', '香港节点',
           '台湾-自动', '台湾节点', '日本-自动', '日本节点', '新加坡节点',
           '美国-自动', '美国节点', '越南-自动', '越南节点']
base = {'proxy-groups'=>regions.map { |n| {'name'=>n} },
        'rules'=>['DOMAIN,example.test,DIRECT', 'RULE-SET,telegram,节点选择',
                  'RULE-SET,telegramcidr,节点选择,no-resolve', 'MATCH,节点选择'],
        'dns'=>{'nameserver-policy'=>{'rule-set:telegram'=>[
          'https://1.1.1.1/dns-query#节点选择', 'https://8.8.8.8/dns-query#节点选择'],
          'example.test'=>['https://223.5.5.5/dns-query']}},
        'proxies'=>[{'name'=>'synthetic', 'udp'=>true, 'tfo'=>false}],
        'tun'=>{'enable'=>false}, 'ipv6'=>false}
result = OpenClashTelegramSplit.apply(copy(base))
check(result['proxy-groups'][-1]['proxies'][0] == '新加坡-自动', 'default')
check(result['rules'][2] == 'RULE-SET,telegramcidr,电报消息,no-resolve', 'CIDR routing')
check(result['dns']['nameserver-policy']['rule-set:telegram'].all? { |s| s.end_with?('#电报消息') }, 'DNS')
check(OpenClashTelegramSplit.apply(copy(result)) == result, 'idempotence')
restored = copy(result)
restored['proxy-groups'].pop
restored['rules'] = base['rules']
restored['dns']['nameserver-policy']['rule-set:telegram'] = base['dns']['nameserver-policy']['rule-set:telegram']
check(restored == base, 'unrelated fields changed')
[
  ->(c) { c['proxy-groups'].shift },
  ->(c) { c['rules'].delete_at(2) },
  ->(c) { c['rules'][1] = 'RULE-SET,telegram,DIRECT' },
  ->(c) { c['dns']['nameserver-policy']['rule-set:telegram'] = ['bad'] }
].each do |mutate|
  bad = copy(base); mutate.call(bad); before = copy(bad)
  begin
    OpenClashTelegramSplit.apply(bad)
    raise 'unexpected success'
  rescue RuntimeError => error
    raise if error.message == 'unexpected success'
  end
  check(bad == before, 'partial mutation on failure')
end
puts 'Telegram Ruby: default, DNS/CIDR, unrelated preservation, idempotence, four atomic rejection cases PASS'
