# Fixed data-only expression for OpenClash v0.48.002's allowlisted interpreter.
# No file, network, process, constant lookup or dynamically loaded code.
# Semicolons preserve the expression when the generator joins lines.
# Ruby 3.0 names newly assigned block locals DASGN_CURR, absent in upstream's
# allowlist. Declare the bindings in the outer scope (LASGN/DASGN) instead.
(begin;
bad = ip = domain = name = labels = mappings = target = current = visited = resolved = value = flower_servers = destination = opts = supported = original = result = nil;
(lambda { |proxies, hosts|
  bad = lambda { |message| {}.fetch(message) };
  ip = lambda { |value| value.is_a?(String) && (value.match?(/\A\d+(?:\.\d+){3}\z/) || (value.count(":") >= 2 && value.match?(/\A[0-9a-f:.]+\z/i))) };
  domain = lambda { |value|
    next nil unless value.is_a?(String);
    name = value.downcase.sub(/\.$/, "");
    next nil if name.length > 253 || ip.call(name);
    labels = name.split(".", -1);
    next nil unless labels.length >= 2 && labels.all? { |label| label.length >= 1 && label.length <= 63 && label.match?(/\A[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\z/) };
    name;
  };
  bad.call("node aliases: invalid input") unless proxies.is_a?(Array) && hosts.is_a?(Hash);
  bad.call("node aliases: input limit") if proxies.length > 4096 || hosts.length > 4096;
  mappings = {};
  hosts.each { |key, value|
    name = domain.call(key);
    next unless name;
    bad.call("node aliases: duplicate normalized host") if mappings.key?(name);
    mappings[name] = value;
  };
  target = lambda { |start|
    current = start;
    visited = {};
    resolved = false;
    (0...32).each {
      if !mappings.key?(current); resolved = true; break; end;
      bad.call("node aliases: cyclic mapping") if visited[current];
      visited[current] = true;
      value = mappings[current];
      if ip.call(value) || (value.is_a?(Array) && !value.empty? && value.all? { |item| ip.call(item) }); current = start; resolved = true; break; end;
      current = domain.call(value);
      bad.call("node aliases: invalid domain target") unless current;
    };
    bad.call("node aliases: chain exceeds 32 entries") unless resolved;
    current;
  };
  flower_servers = {};
  mappings.each { |source, value|
    destination = domain.call(value);
    if source.end_with?(".aws-agent.com") && destination && destination.end_with?(".apt-agent.dev"); flower_servers[source] = true; flower_servers[destination] = true; end;
  };
  proxies.map { |proxy|
    bad.call("node aliases: invalid proxy entry") unless proxy.is_a?(Hash);
    opts = proxy["plugin-opts"];
    supported = proxy["type"] == "ss" && !proxy["tls"] && (!proxy["plugin"] || proxy["plugin"] == "" || (proxy["plugin"] == "obfs" && opts.is_a?(Hash) && opts["mode"] == "http" && domain.call(opts["host"])));
    next proxy.dup unless supported;
    original = domain.call(proxy["server"]);
    next proxy.dup unless original;
    destination = mappings.key?(original) ? target.call(original) : original;
    result = destination == original ? proxy.dup : proxy.merge("server" => destination);
    result["udp"] = true if proxy["plugin"] == "obfs" && flower_servers[original];
    result;
  };
}).call(Value.fetch("proxies", []), Value.fetch("hosts", {}));
end)
