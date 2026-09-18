# frozen_string_literal: true

# 可选的 OpenClash 本地覆写库：只返回节点副本，不写文件、不查 DNS、不执行外部命令。
# 接在订阅/公共覆写及 UDP 修复之后；原始订阅保留，下一次更新重新读取 hosts。
module OpenClashNodeAliases
  class InvalidMapping < StandardError; end

  # 只接受精确 ASCII 域名；通配符、URL、端口和可执行内容不作为节点地址。
  def self.domain(value)
    return nil unless value.is_a?(String)
    name = value.downcase.sub(/\.$/, '')
    return nil if name.length > 253 || ip?(name)
    labels = name.split('.', -1)
    return nil unless labels.length >= 2 && labels.all? do |label|
      label.length.between?(1, 63) && label.match?(/\A[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\z/)
    end
    name
  end

  # IP 映射由 Mihomo 自己处理；本库不把动态入口解析后固定成 IP。
  def self.ip?(value)
    return false unless value.is_a?(String)
    value.match?(/\A\d+(?:\.\d+){3}\z/) ||
      (value.count(':') >= 2 && value.match?(/\A[0-9a-f:.]+\z/i))
  end

  def self.target(start, mappings)
    current = start
    visited = {}
    32.times do
      return current unless mappings.key?(current)
      raise InvalidMapping, 'node aliases: cyclic mapping' if visited[current]
      visited[current] = true
      value = mappings[current]
      # A -> B -> hosts 中的 IP 已被内核支持，保留原来的 A 和 IP 数组选择语义。
      return start if ip?(value) ||
        (value.is_a?(Array) && !value.empty? && value.all? { |item| ip?(item) })
      current = domain(value)
      raise InvalidMapping, 'node aliases: invalid domain target' unless current
    end
    raise InvalidMapping, 'node aliases: chain exceeds 32 entries'
  end

  # 已核对 Mihomo simple-obfs HTTP 使用独立的显式 host；只换入口不会改该请求头。
  # 其他插件及 TLS 留给各自的证书/SNI 适配，不套用本转换。
  def self.supported?(proxy)
    return false unless proxy['type'] == 'ss' && !proxy['tls']
    return true if !proxy['plugin'] || proxy['plugin'] == ''
    opts = proxy['plugin-opts']
    proxy['plugin'] == 'obfs' && opts.is_a?(Hash) &&
      opts['mode'] == 'http' && !!domain(opts['host'])
  end

  def self.rewrite(proxies, hosts)
    raise InvalidMapping, 'node aliases: proxies must be an array' unless proxies.is_a?(Array)
    raise InvalidMapping, 'node aliases: hosts must be a map' unless hosts.is_a?(Hash)
    raise InvalidMapping, 'node aliases: input limit exceeded' if proxies.length > 4096 || hosts.length > 4096
    mappings = {}
    hosts.each do |key, value|
      name = domain(key)
      next unless name # 不模拟通配符优先级，也不修改其他 hosts 用途。
      raise InvalidMapping, 'node aliases: duplicate normalized host' if mappings.key?(name)
      mappings[name] = value
    end
    # 全部计算成功后才由调用者赋值；后面的坏映射不会留下前面部分修改的节点。
    proxies.map do |proxy|
      raise InvalidMapping, 'node aliases: invalid proxy entry' unless proxy.is_a?(Hash)
      next proxy.dup unless supported?(proxy)
      original = domain(proxy['server'])
      next proxy.dup unless original && mappings.key?(original)
      destination = target(original, mappings)
      destination == original ? proxy.dup : proxy.merge('server' => destination)
    end
  end
end
