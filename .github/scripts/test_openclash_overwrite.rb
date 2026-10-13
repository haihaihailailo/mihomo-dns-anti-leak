# Executed only by the canonical validator. Synthetic in-memory data only.
require 'yaml'
require 'digest'
path = ARGV.fetch(0)
raise 'OPENCLASH_YAML_RB required' if path.empty?
raise 'OpenClash parser identity mismatch' unless Digest::SHA256.file(path).hexdigest == '1249abf411e1df9e8fe542fb3584f34a27e6e3a587942e5d9f759a32b1bd8261'
require path
payload = YAML.safe_load(STDIN.read, aliases: false)
unless payload.key?('shellFields')
  fields = IO.popen(['sh', '-s'], 'r+') { |io| io.write(payload.fetch('shellScript')); io.close_write; io.read }
  raise 'shell quoting failed' unless $?.success?
  payload['shellFields'] = fields.split("\0")
end
ENV['CONFIG_FILE'] = 'synthetic-only'
input = payload.fetch('input')
before = Marshal.dump(input)
value = Marshal.load(before)
commands = payload.fetch('commands')
parsed = commands.map { |line| YAML.overwrite_parse_line(line) }
raise 'native parse rejected' if parsed.any?(&:nil?)
raise 'shell/native argument mismatch' unless parsed.flat_map { |_, args| args } == payload.fetch('shellFields')
parsed.each do |fn, args|
  next unless YAML.overwrite_unsafe?(fn, args)
  rejected = []
  YAML::OVERWRITE_CODE.fetch(fn).each do |index|
    stack = [YAML.overwrite_parse_source(args[index - 1])]
    until stack.empty?
      node = stack.pop
      next unless node.is_a?(RubyVM::AbstractSyntaxTree::Node)
      rejected << node.type unless YAML::OVERWRITE_NODE_LOOKUP.key?(node.type)
      if [:CALL, :FCALL, :VCALL, :ATTRASGN].include?(node.type)
        method = YAML.overwrite_call_name(node)
        rejected << method unless YAML.overwrite_method_allowed?(method)
      end
      stack.concat(node.children)
    end
  end
  raise "native allowlist rejected #{args[1]}: #{rejected.uniq.join(', ')}"
end
2.times do
  parsed.each { |fn, args| YAML.overwrite_apply(value, fn, args) }
  raise 'full-object overwrite mismatch' unless value == payload.fetch('expected')
  raise 'DNS priority order changed' unless value.fetch('dns').fetch('nameserver-policy').keys == payload.fetch('expected').fetch('dns').fetch('nameserver-policy').keys
end
raise 'input mutated' unless Marshal.dump(input) == before
%w[module_eval unpack1 system].each { |method| raise 'unsafe method accepted' unless YAML.overwrite_code_unsafe?("Value.#{method}('blocked')") }
literal = payload.fetch('literalProbe')
raise 'literal refused' if YAML.overwrite_code_unsafe?(literal)
probe = {}
YAML.overwrite_apply(probe, 'ruby_edit', ['synthetic-only', '["probe"]', literal])
raise 'literal interpolation changed' unless probe['probe'] == { 'text' => '引号\'"\\ ${UNCHANGED} #{raise :bad} #@test `ignored`', 'missing' => nil }
require_relative 'openclash_node_aliases'
node_fn, node_args = parsed.last
raise 'node expression missing' unless node_args[1] == "['proxies']"
# Run the established adversarial cases through the actual native interpreter.
OpenClashNodeAliases.define_singleton_method(:rewrite) do |proxies, hosts|
  fixture = { 'proxies' => proxies, 'hosts' => hosts }
  begin
    YAML.overwrite_apply(fixture, node_fn, node_args)
  rescue KeyError => error
    raise OpenClashNodeAliases::InvalidMapping, error.message
  end
  fixture.fetch('proxies')
end
load File.join(__dir__, 'test_openclash_node_aliases.rb')
puts 'OpenClash 0.48.002 native overwrite: full config, shell literals, safety rejection, aliases, atomicity PASS'
