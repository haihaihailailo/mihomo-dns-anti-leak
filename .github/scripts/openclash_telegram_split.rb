# 可选的设备本地补丁：在旧远程模板后恢复 Telegram 独立策略。
# 不读取订阅、不改变节点与设备字段；只在全部前置校验通过后赋值。
module OpenClashTelegramSplit
  def self.apply(value)
    name = '电报消息'
    groups = value.fetch('proxy-groups')
    names = groups.map { |g| g.fetch('name') }
    raise 'duplicate groups' unless names.uniq == names
    members = ['新加坡-自动', '自动选择', '节点选择', '香港-自动', '香港节点',
               '台湾-自动', '台湾节点', '日本-自动', '日本节点', '新加坡节点',
               '美国-自动', '美国节点', '越南-自动', '越南节点', 'DIRECT']
    raise 'missing region group' unless (members - names - ['DIRECT']).empty?
    group = {'name'=>name, 'type'=>'select', 'proxies'=>members,
             'url'=>'https://telegram.org/favicon.ico', 'expected-status'=>200,
             'timeout'=>10000,
             'icon'=>'https://testingcf.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/telegram.svg'}
    existing = groups.find { |g| g['name'] == name }
    raise 'unexpected existing Telegram group' if existing && existing != group
    rules = value.fetch('rules')
    expected = ['RULE-SET,telegram,', 'RULE-SET,telegramcidr,']
    expected.each do |prefix|
      hits = rules.select { |r| r.start_with?(prefix) }
      raise 'missing/duplicate Telegram rule' unless hits.length == 1
      raise 'unexpected Telegram target' unless ['节点选择', name].include?(hits[0].split(',')[2])
    end
    updated_rules = rules.map do |rule|
      parts = rule.split(',')
      parts[2] = name if parts[0] == 'RULE-SET' && ['telegram', 'telegramcidr'].include?(parts[1])
      parts.join(',')
    end
    policy = value.fetch('dns').fetch('nameserver-policy')
    servers = policy.fetch('rule-set:telegram')
    raise 'unexpected Telegram DNS' unless servers.is_a?(Array) && servers.length == 2 &&
      servers.all? { |s| s.end_with?('#节点选择', '#电报消息') }
    updated_policy = policy.merge('rule-set:telegram'=>servers.map { |s| s.sub(/#[^#]+$/, '#' + name) })
    # 仅更新三个独立字段；保留 OpenClash 并行覆写的节点/别名修复结果。
    value['proxy-groups'] = existing ? groups : groups + [group]
    value['rules'] = updated_rules
    value['dns']['nameserver-policy'] = updated_policy
    value
  end
end
