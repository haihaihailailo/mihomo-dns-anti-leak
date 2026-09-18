# frozen_string_literal: true
# 唯一离线入口在有 Ruby 的环境调用；只有内存内合成数据，无网络和文件写入。
# 设备验收也可复用同一组样本，不需要安装 minitest/json 等额外组件。
require_relative 'openclash_node_aliases' unless defined?(OpenClashNodeAliases)

module OpenClashNodeAliasTests
  def self.run
    checks = 0
    check = lambda { |condition| raise 'node alias regression' unless condition; checks += 1 }
    base = { 'name' => '合成 SS', 'type' => 'ss', 'server' => 'entry.example.test',
             'port' => 1234, 'password' => 'synthetic-only', 'udp' => true }
    hosts = { 'entry.example.test' => 'relay.example.test' }
    input = [base, base.merge('name' => '另一个端口', 'port' => 5678)]
    result = OpenClashNodeAliases.rewrite(input, hosts)
    check.call(result == input.map { |p| p.merge('server' => 'relay.example.test') })
    check.call(input.all? { |p| p['server'] == 'entry.example.test' })
    check.call(OpenClashNodeAliases.rewrite(result, hosts) == result)
    check.call(OpenClashNodeAliases.rewrite(input, {}) == input)
    check.call(OpenClashNodeAliases.rewrite(input, { '*.example.test' => 'relay.example.test' }) == input)
    chained = hosts.merge('relay.example.test' => 'final.example.test')
    check.call(OpenClashNodeAliases.rewrite(input, chained).all? { |p| p['server'] == 'final.example.test' })
    # 更新后的映射自动生效，而不是硬编码上一次解析结果。
    changed = { 'entry.example.test' => 'new-relay.example.test' }
    check.call(OpenClashNodeAliases.rewrite(input, changed).all? { |p| p['server'] == 'new-relay.example.test' })
    ['192.0.2.1', '2001:db8::1', ['192.0.2.1', '192.0.2.2']].each do |ip|
      check.call(OpenClashNodeAliases.rewrite(input, hosts.merge('relay.example.test' => ip)) == input)
      check.call(OpenClashNodeAliases.rewrite(input, { 'entry.example.test' => ip }) == input)
    end
    check.call(OpenClashNodeAliases.rewrite(input, { 'ENTRY.EXAMPLE.TEST.' => 'RELAY.EXAMPLE.TEST.' }) == result)
    [base.merge('type' => 'trojan', 'sni' => 'entry.example.test'),
     base.merge('plugin' => 'shadow-tls'), base.merge('tls' => true),
     base.merge('server' => '192.0.2.1')].each do |special|
      check.call(OpenClashNodeAliases.rewrite([special], hosts) == [special])
    end
    obfs = base.merge('plugin' => 'obfs', 'plugin-opts' => { 'mode' => 'http', 'host' => 'cover.example.test' })
    check.call(OpenClashNodeAliases.rewrite([obfs], hosts) == [obfs.merge('server' => 'relay.example.test')])
    [obfs.merge('plugin-opts' => { 'mode' => 'tls', 'host' => 'cover.example.test' }),
     obfs.merge('plugin-opts' => { 'mode' => 'http' })].each do |special|
      check.call(OpenClashNodeAliases.rewrite([special], hosts) == [special])
    end
    invalids = [hosts.merge('relay.example.test' => 'entry.example.test'),
                { 'entry.example.test' => 'entry.example.test' },
                { 'entry.example.test' => ['relay.example.test'] },
                { 'entry.example.test' => 'https://relay.example.test' },
                { 'entry.example.test' => 'relay.example.test:443' },
                { 'entry.example.test' => '$(touch forbidden)' },
                { 'entry.example.test' => '-bad.example.test' },
                hosts.merge('ENTRY.EXAMPLE.TEST.' => 'other.example.test')]
    long_chain = (0..33).to_h { |i| ["hop#{i}.example.test", "hop#{i + 1}.example.test"] }
    invalids << hosts.merge('relay.example.test' => 'hop0.example.test').merge(long_chain)
    invalids.each do |bad|
      begin
        OpenClashNodeAliases.rewrite(input, bad)
        raise 'invalid mapping was accepted'
      rescue OpenClashNodeAliases::InvalidMapping
        check.call(input.first == base && base['server'] == 'entry.example.test')
      end
    end
    partial = [base, base.merge('server' => 'broken.example.test')]
    begin
      OpenClashNodeAliases.rewrite(partial, hosts.merge('broken.example.test' => 'broken.example.test'))
      raise 'partial failure was accepted'
    rescue OpenClashNodeAliases::InvalidMapping
      check.call(partial.first['server'] == 'entry.example.test')
    end
    puts "node alias synthetic checks: #{checks} PASS"
  end
end
OpenClashNodeAliasTests.run
