# Trusted local hook, installed explicitly beside openclash_local_dns.rb.
# The remote module cannot read UCI under OpenClash 0.48.002's safety contract.
require 'yaml'
require_relative 'openclash_local_dns'

if __FILE__ == $PROGRAM_NAME
  begin
    path = ARGV.fetch(0)
    raise 'regular config required' unless File.file?(path) && !File.symlink?(path)
    value = YAML.safe_load(File.read(path), aliases: true)
    dns = value.fetch('dns')
    adapted = OpenClashLocalDNS.apply(dns, OpenClashLocalDNS.settings)
    unless adapted == dns
      value['dns'] = adapted
      temporary = path + ".local-dns-#{Process.pid}"
      File.open(temporary, File::WRONLY | File::CREAT | File::EXCL, File.stat(path).mode & 0777) do |file|
        file.write(YAML.dump(value))
        file.flush
        file.fsync
      end
      File.rename(temporary, path)
    end
  rescue => error
    warn "OpenClash local DNS hook failed: #{error.class}"
    exit 1
  end
end
