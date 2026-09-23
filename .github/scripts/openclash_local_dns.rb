# Public, data-only DNS adaptation for OpenClash's two DNS interception modes.
# No subscription values become code. No UCI/config/service writes or network I/O.
module OpenClashLocalDNS
  KEYS = {
    'mode' => 'openclash.config.enable_redirect_dns',
    'core_port' => 'openclash.config.dns_port',
    'domain' => 'dhcp.@dnsmasq[0].domain',
    'local' => 'dhcp.@dnsmasq[0].local',
    'port' => 'dhcp.@dnsmasq[0].port'
  }.freeze

  def self.settings
    KEYS.transform_values do |key|
      begin
        IO.popen(['uci', '-q', 'get', key], err: File::NULL, &:read).strip
      rescue Errno::ENOENT
        ''
      end
    end
  end

  def self.apply(dns, device)
    raise ArgumentError, 'DNS must be a mapping' unless dns.is_a?(Hash)
    # Mode 1: dnsmasq handles its own authoritative local zone before forwarding.
    # Mode 0/unknown: never guess an upstream or change an external DNS stack.
    return dns unless device['mode'] == '2'
    domain = device.fetch('domain', '').downcase
    return dns if domain.empty?
    raise ArgumentError, 'Invalid local DNS zone' unless domain.bytesize <= 253 &&
      domain.split('.', -1).all? { |s| s.match?(/\A[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\z/) }
    raise ArgumentError, 'Local DNS zone is not authoritative' unless device['local'] == "/#{domain}/"
    port = device.fetch('port', '')
    port = '53' if port.empty?
    raise ArgumentError, 'Invalid dnsmasq port' unless port.match?(/\A[0-9]{1,5}\z/) && (1..65535).cover?(port.to_i)
    raise ArgumentError, 'DNS ports form a loop' if port.to_i == device.fetch('core_port', '').to_i
    policy = dns.fetch('nameserver-policy')
    raise ArgumentError, 'DNS policy must be a mapping' unless policy.is_a?(Hash)
    key = '+.' + domain
    # Work on new hashes: failed validation never partially edits the input.
    dns.merge('nameserver-policy' => {key => ["127.0.0.1:#{port}#DIRECT"]}.merge(policy.reject { |k, _| k == key }))
  end
end
