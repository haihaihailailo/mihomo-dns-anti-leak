#!/usr/bin/env ruby
# Read-only, bounded summary. Never print nodes, credentials or subscription URLs.
require 'yaml'

module OpenClashSettingsAudit
  MAX_UPDATE_SECONDS = 86_400

  def self.check(config, options)
    problems = []
    dns = config.fetch('dns', {})
    problems << 'DNS_DISABLED' unless dns['enable'] == true
    expected = options.fetch('en_mode', '').start_with?('fake-ip') ? 'fake-ip' : 'redir-host'
    problems << 'DNS_MODE_MISMATCH' if !options.fetch('en_mode', '').empty? && dns['enhanced-mode'] != expected
    problems << 'DNS_PORT_MISMATCH' if dns['listen'].to_s.split(':').last != options.fetch('dns_port', '7874')
    problems << 'DNS_IPV6_MISMATCH' if options.key?('ipv6_dns') && dns['ipv6'] != (options['ipv6_dns'] == '1')
    problems << 'DUPLICATE_GEO_SCHEDULER' if config['geo-auto-update'] == true
    %w[rule-providers proxy-providers].each do |kind|
      config.fetch(kind, {}).each_value do |provider|
        next unless provider['type'] == 'http'
        interval = provider['interval']
        problems << 'PROVIDER_UPDATE_OVER_24H_OR_DISABLED' unless interval.is_a?(Integer) && (1..MAX_UPDATE_SECONDS).cover?(interval)
      end
    end
    if options['auto_update'] == '1'
      valid = options['config_auto_update_mode'] == '1' ?
        (1..1440).cover?(options.fetch('config_update_interval', '').to_i) : options['config_update_week_time'] == '*'
      problems << 'SUBSCRIPTION_UPDATE_OVER_24H' unless valid
    end
    %w[geo geoip geosite geoasn chnr].each do |prefix|
      problems << 'DATA_UPDATE_OVER_24H' if options[prefix + '_auto_update'] == '1' && options[prefix + '_update_week_time'] != '*'
    end
    if options['lgbm_auto_update'] == '1'
      problems << 'MODEL_UPDATE_REQUIRES_MANUAL_REVIEW'
    end
    nodes = config.fetch('proxies', [])
    skipped = nodes.select { |node| node['skip-cert-verify'] == true }
    pinned = skipped.count { |node| node['type'] == 'hysteria2' && node['fingerprint'].to_s.delete(':').match?(/\A[0-9a-fA-F]{64}\z/) }
    problems << 'TLS_SKIP_WITHOUT_RECOGNIZED_PIN' if skipped.size > pinned
    {
      'scope' => 'CONFIG_ONLY_NOT_NETWORK_PROOF',
      'dns_interception' => options['enable_redirect_dns'],
      'dns_mode' => dns['enhanced-mode'],
      'dns_ipv6' => dns['ipv6'],
      'node_count' => nodes.size,
      'rule_provider_count' => config.fetch('rule-providers', {}).size,
      'tls_skip_count' => skipped.size,
      'hysteria2_sha256_pin_count' => pinned,
      'problems' => problems.uniq,
      'runtime_api_and_firewall' => 'NOT_CHECKED',
      'pin_enforcement' => 'NOT_EXERCISED'
    }
  end
end

if $PROGRAM_NAME == __FILE__
  begin
    raise 'one configuration path required' unless ARGV.size == 1
    file = ARGV.first
    raise 'unsafe or oversized configuration' if File.symlink?(file) || !File.file?(file) || File.size(file) > 4 * 1024 * 1024
    config = YAML.safe_load(File.read(file), aliases: true)
    keys = %w[en_mode dns_port ipv6_dns enable_redirect_dns auto_update config_auto_update_mode config_update_interval config_update_week_time lgbm_auto_update]
    %w[geo geoip geosite geoasn chnr].each { |p| keys.concat([p + '_auto_update', p + '_update_week_time']) }
    options = keys.to_h { |k| [k, IO.popen(['uci', '-q', 'get', 'openclash.config.' + k], err: File::NULL, &:read).strip] }
    result = OpenClashSettingsAudit.check(config, options)
    puts YAML.dump(result)
    exit(result['problems'].empty? ? 0 : 1)
  rescue StandardError => error
    warn "Audit incomplete (#{error.class}); no private data emitted"
    exit 2
  end
end
