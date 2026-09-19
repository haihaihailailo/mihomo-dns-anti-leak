# Read a reviewed watchdog from stdin; print a candidate to stdout.
# No filesystem writes, downloads, service changes or configuration changes.
require 'digest'

def prepare_watchdog(original, expected_sha)
  raise 'expected one reviewed lowercase SHA256' unless expected_sha&.match?(/\A[0-9a-f]{64}\z/)
  raise 'watchdog exceeds 512 KiB' if original.bytesize > 512 * 1024
  raise 'watchdog hash mismatch' unless Digest::SHA256.hexdigest(original) == expected_sha
  original = original.dup.force_encoding('UTF-8')
  raise 'invalid UTF-8 watchdog' unless original.valid_encoding?
  old_block = <<~'SH'
    ## Log File Size Manage:
       LOGSIZE=`ls -l /tmp/openclash.log |awk '{print int($5/1024)}'`
       if [ "$LOGSIZE" -gt "$log_size" ]; then
          : > /tmp/openclash.log
          LOG_WATCHDOG "Log Size Limit, Clean Up All Log Records..."
       fi

  SH
  new_block = <<~'SH'
    ## Log File Size Manage: bounded native logrotate (local maintenance)
       /usr/sbin/logrotate -s /tmp/openclash-logrotate.status /etc/openclash/custom/openclash-logrotate.conf || \
          logger -t openclash-logrotate 'Rotation failed; existing logs preserved. Check configuration and space.'

  SH
  raise 'already patched; inspect installed configuration' if original.include?(new_block)
  raise 'unknown or ambiguous log block; manual review required' unless original.scan(old_block).length == 1
  result = original.sub(old_block, new_block)
  raise 'another log-clearing statement remains' if result.match?(/:\s*>\s*\/tmp\/openclash\.log/)
  result
end

if $PROGRAM_NAME == __FILE__
  begin
    raise 'usage: ruby prepare-openclash-watchdog.rb REVIEWED_SHA256 < watchdog.before > watchdog.candidate' unless ARGV.length == 1
    candidate = prepare_watchdog(STDIN.read(512 * 1024 + 1), ARGV.fetch(0))
    STDOUT.write(candidate)
  rescue StandardError => e
    warn e.message
    exit 1
  end
end
