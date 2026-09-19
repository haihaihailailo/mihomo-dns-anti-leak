require_relative '../../maintenance/prepare-openclash-watchdog'

fixture = <<~'SH'
  #!/bin/sh
  before='keep all other behavior'
  ## Log File Size Manage:
     LOGSIZE=`ls -l /tmp/openclash.log |awk '{print int($5/1024)}'`
     if [ "$LOGSIZE" -gt "$log_size" ]; then
        : > /tmp/openclash.log
        LOG_WATCHDOG "Log Size Limit, Clean Up All Log Records..."
     fi

  ## 防火墙检查
  after='preserve firewall checks'
SH
sha = Digest::SHA256.hexdigest(fixture)
result = prepare_watchdog(fixture, sha)
raise 'prefix changed' unless result.start_with?(fixture.split('## Log File Size Manage:').first)
raise 'suffix changed' unless result.end_with?("## 防火墙检查\n" + fixture.split("## 防火墙检查\n").last)
raise 'rotation missing' unless result.include?('/usr/sbin/logrotate -s /tmp/openclash-logrotate.status')
raise 'original mutated' unless Digest::SHA256.hexdigest(fixture) == sha

rejections = [
  [fixture, '0' * 64],
  [fixture, ''],
  [fixture + fixture, nil],
  [fixture.sub('Log Size Limit', 'changed upstream'), nil],
  [result, nil],
  [fixture + ": > /tmp/openclash.log\n", nil],
  [("x" * (512 * 1024 + 1)), nil],
  [fixture.b + "\xff".b, nil]
]
rejections.each_with_index do |(input, expected), index|
  expected ||= Digest::SHA256.hexdigest(input)
  rejected = false
  begin
    prepare_watchdog(input, expected)
  rescue StandardError
    rejected = true
  end
  raise "negative case #{index} accepted" unless rejected
end
puts 'OpenClash maintenance: candidate preservation and 8 rejection cases PASS (memory-only)'
