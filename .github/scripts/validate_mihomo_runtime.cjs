// 可选隔离内核回归：只监听 loopback，不开启 TUN，不载入订阅或真实节点。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const dgram = require("node:dgram");
const net = require("node:net");
const { spawn } = require("node:child_process");
const YAML = require("yaml");
const { read, parse } = require("./build_profiles.cjs");
const { hash, validateBody } = require("./check_remote_rules.cjs");
const binary = process.env.MIHOMO_TEST_BIN;
assert(binary && path.isAbsolute(binary) && fs.existsSync(binary), "MIHOMO_TEST_BIN 须为已有内核的绝对路径");
const directory = fs.mkdtempSync(path.join(process.env.MIHOMO_TEST_OUTPUT || os.tmpdir(), "mihomo-loopback-"));
const cacheDirectory = process.env.MIHOMO_RULE_CACHE;
const children = new Set();
const sockets = new Set();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !/^(CLASH_|MIHOMO_|HTTP_PROXY$|HTTPS_PROXY$|ALL_PROXY$|NO_PROXY$)/i.test(key)));
const watchdog = setTimeout(() => {
  for (const child of children) child.kill();
  for (const socket of sockets) socket.close();
  console.error("隔离内核回归超过 45 秒");
  process.exit(2);
}, 45000);
function socket() {
  const value = dgram.createSocket("udp4"); sockets.add(value);
  value.once("close", () => sockets.delete(value)); return value;
}
async function bind(value) {
  await new Promise((resolve, reject) => { value.once("error", reject); value.bind(0, "127.0.0.1", resolve); });
  return value.address().port;
}
async function upstream(address) {
  const value = socket(); const port = await bind(value);
  value.on("message", (message, remote) => {
    let end = 12;
    while (end < message.length && message[end] !== 0) end += message[end] + 1;
    end += 5;
    if (end > message.length) return;
    const header = Buffer.alloc(12);
    message.copy(header, 0, 0, 2); header.writeUInt16BE(0x8180, 2);
    header.writeUInt16BE(1, 4); header.writeUInt16BE(1, 6);
    const answer = Buffer.from([0xc0,0x0c,0,1,0,1,0,0,0,1,0,4,...address]);
    value.send(Buffer.concat([header, message.subarray(12, end), answer]), remote.port, remote.address);
  });
  return port;
}
function base() {
  return { mode: "rule", "log-level": "warning", ipv6: false, "allow-lan": false,
    port: 0, "socks-port": 0, "mixed-port": 0, "redir-port": 0, "tproxy-port": 0,
    "external-controller": "", "geo-auto-update": false, "find-process-mode": "off",
    tun: { enable: false }, sniffer: { enable: false },
    profile: { "store-selected": false, "store-fake-ip": false }, rules: ["MATCH,DIRECT"] };
}
let configSequence = 0;
function start(config) {
  // 完整 DNS 策略与快照路径可能超过 Windows 命令行长度；只写入本次隔离目录。
  const file = path.join(directory, "case-" + (++configSequence) + ".yaml");
  fs.writeFileSync(file, YAML.stringify(config), { flag: "wx" });
  const child = spawn(binary, ["-d", directory, "-f", file],
    { windowsHide: true, env, stdio: ["ignore", "pipe", "pipe"] });
  children.add(child); let log = "";
  child.stdout.on("data", data => log = (log + data).slice(-16000));
  child.stderr.on("data", data => log = (log + data).slice(-16000));
  const closed = new Promise(resolve => {
    child.once("error", error => { log += error.message; children.delete(child); resolve(); });
    child.once("close", () => { children.delete(child); resolve(); });
  });
  return { child, closed, logs: () => log };
}
async function stop(running) {
  if (children.has(running.child)) running.child.kill();
  await running.closed;
}
async function query(port, domain) {
  const value = socket();
  const header = Buffer.alloc(12);
  header.writeUInt16BE(0x7321, 0); header.writeUInt16BE(0x0100, 2); header.writeUInt16BE(1, 4);
  const name = Buffer.concat(domain.split(".").map(part => Buffer.concat([Buffer.from([part.length]), Buffer.from(part)])));
  const packet = Buffer.concat([header, name, Buffer.from([0,0,1,0,1])]);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { value.close(); reject(Error("DNS timeout")); }, 500);
    value.once("error", error => { clearTimeout(timer); value.close(); reject(error); });
    value.once("message", response => { clearTimeout(timer); value.close(); resolve([...response.subarray(-4)].join(".")); });
    value.send(packet, port, "127.0.0.1");
  });
}
async function aiGroupsCase(region, empty) {
  const config = parse(read("防DNS泄露-" + region + "版.yaml"));
  const reserve = net.createServer();
  await new Promise(resolve => reserve.listen(0, "127.0.0.1", resolve));
  const port = reserve.address().port;
  await new Promise(resolve => reserve.close(resolve));
  const fixtures = ["美国 AI01", "美国 AI02", "日本 JP01", "新加坡 SG01", "香港 HK01",
    "台湾 TW01", "越南 VN01", "香港港广01_回国", "美国01_回国"];
  const candidates = empty ? [] : fixtures;
  const groups = config["proxy-groups"].map(group => ({ ...group, interval: 0 }));
  // 保留真实 URL 以检查内核读入结果；关闭全部周期探测，不请求公网测速地址。
  const running = start({ ...base(), "external-controller": "127.0.0.1:" + port,
    proxies: candidates.map(name => ({ name, type: "http", server: "127.0.0.1", port: 9 })),
    "proxy-groups": groups });
  try {
    let result;
    for (let i = 0; i < 20; i++) {
      assert(children.has(running.child), "AI 分组内核提前退出：" + running.logs());
      try {
        const response = await fetch("http://127.0.0.1:" + port + "/proxies", { signal: AbortSignal.timeout(400) });
        assert.equal(response.status, 200);
        result = (await response.json()).proxies;
        if (result.AI) break;
      } catch { /* Only this owned loopback controller is retried. */ }
      await pause(100);
    }
    assert(result?.AI, "AI 分组 API 未就绪：" + running.logs());
    assert.equal(result.AI.now, "美国-AI-自动");
    assert(!result["香港-AI-自动"], "内核不应出现香港 AI 组");
    assert(!result.AI.all.some(name => name.startsWith("香港")), "AI 不应包含香港直接候选");
    assert(result["香港节点"] && result["香港-自动"], "普通香港组须保留");
    for (const country of ["美国", "日本", "新加坡"]) {
      const group = result[country + "-AI-自动"];
      assert(group, "缺少地区 AI 组：" + country);
      assert.equal(group.type, "URLTest");
      assert.equal(group.hidden, true);
      assert.equal(group.testUrl, "https://auth.openai.com/favicon.ico");
      assert.equal(String(group.expectedStatus), "200");
      assert.equal(group.emptyFallback, "REJECT");
      assert.deepEqual([...group.all].sort(), empty ? ["REJECT"] :
        fixtures.filter(name => name.startsWith(country) && !name.includes("回国")).sort(), "内核实际地区筛选错误");
    }
    console.log(region + " Mihomo AI 分组：" + (empty ? "空节点 REJECT" : "实际地区/回国筛选") + "、隐藏/端点/默认值 OK（无公网探测）");
  } finally { await stop(running); }
}
async function dnsCase(region, general, ai, mutation) {
  const reserve = socket(); const port = await bind(reserve);
  await new Promise(resolve => reserve.close(resolve));
  const config = parse(read("防DNS泄露-" + region + "版.yaml"));
  const samples = {
    openai: ["+.chatgpt.com"], anthropic: ["+.claude.ai"],
    "github-copilot": ["+.githubcopilot.com"], "google-gemini": ["gemini.google.com"],
    "geolocation-!cn": ["+.chatgpt.com", "+.claude.ai", "+.githubcopilot.com", "+.google.com"],
  };
  const providers = Object.fromEntries(Object.entries(samples).map(([name, payload]) =>
    [name, { type: "inline", behavior: "domain", payload }]));
  let entries = Object.entries(config.dns["nameserver-policy"]).filter(([key]) =>
    key.startsWith("rule-set:") ? Object.hasOwn(samples, key.slice(9)) : ["chatgpt.com", ".chatgpt.com"].includes(key));
  if (mutation) entries = [
    ...entries.filter(([key]) => key === "rule-set:geolocation-!cn"),
    ...entries.filter(([key]) => key !== "rule-set:geolocation-!cn"),
  ];
  const policies = Object.fromEntries(entries.map(([key, values]) =>
    [key, ["udp://127.0.0.1:" + (values.every(value => value.endsWith("#AI")) ? ai : general)]]));
  const running = start({ ...base(), "rule-providers": providers, dns: {
    enable: true, listen: "127.0.0.1:" + port, ipv6: false, "enhanced-mode": "redir-host",
    "use-hosts": false, "use-system-hosts": false, nameserver: ["udp://127.0.0.1:" + general],
    "nameserver-policy": policies,
  } });
  try {
    let ready = false;
    for (let i = 0; i < 12; i++) {
      try { await query(port, "ready.example.test"); ready = true; break; } catch { await pause(100); }
    }
    assert(ready, "内核未就绪：" + running.logs());
    for (const host of ["chatgpt.com", "claude.ai", "api.githubcopilot.com", "gemini.google.com"]) {
      assert.equal(await query(port, host), mutation ? "198.51.100.10" : "203.0.113.20", host);
    }
    console.log(region + " Mihomo loopback DNS：" + (mutation ? "旧顺序负向控制" : "仓库修复后顺序") + " 4/4 OK");
  } finally { await stop(running); }
}
async function tampermonkeyDnsCase(region, general, direct, mutation) {
  const config = parse(read("防DNS泄露-" + region + "版.yaml"));
  const keys = new Set(["tampermonkey.net", ".tampermonkey.net"]);
  const entries = Object.entries(config.dns["nameserver-policy"]).filter(([key]) =>
    keys.has(key) || key === "rule-set:geolocation-!cn");
  assert.equal(entries.length, 3, "缺少 Tampermonkey 根域名/子域名和通用 DNS 对照");
  const policies = Object.fromEntries(entries.filter(([key]) => !mutation || !keys.has(key))
    .map(([key]) => [key, ["udp://127.0.0.1:" + (keys.has(key) ? direct : general)]]));
  const reserve = socket(); const port = await bind(reserve);
  await new Promise(resolve => reserve.close(resolve));
  const running = start({ ...base(), "rule-providers": {
    "geolocation-!cn": { type: "inline", behavior: "domain", payload: ["+.tampermonkey.net"] },
  }, dns: {
    enable: true, listen: "127.0.0.1:" + port, ipv6: false, "enhanced-mode": "redir-host",
    "use-hosts": false, "use-system-hosts": false, nameserver: ["udp://127.0.0.1:" + general],
    "nameserver-policy": policies,
  } });
  try {
    let ready = false;
    for (let i = 0; i < 12; i++) {
      assert(children.has(running.child), "内核提前退出：" + running.logs());
      try { await query(port, "ready.example.test"); ready = true; break; } catch { await pause(100); }
    }
    assert(ready, "Tampermonkey DNS 内核未就绪：" + running.logs());
    for (const host of ["tampermonkey.net", "accounts.tampermonkey.net", "www.tampermonkey.net"]) {
      assert.equal(await query(port, host), mutation ? "198.51.100.10" : "203.0.113.40", region + " " + host);
    }
    for (const host of ["nottampermonkey.net", "tampermonkey.net.evil.test", "accounts.google.com"]) {
      assert.equal(await query(port, host), "198.51.100.10", "不可扩大 DNS 匹配范围：" + host);
    }
    console.log(region + " Tampermonkey loopback DNS：" + (mutation ? "删除例外负向控制" : "根域名/子域名优先级") + " 6/6 OK");
  } finally { await stop(running); }
}
function snapshotProviders(file, manifest) {
  const original = parse(read(file))["rule-providers"];
  const providers = {};
  for (const [name, source] of Object.entries(original)) {
    const entry = manifest.entries.find(item => item.url === source.url);
    assert(entry && entry.behavior === source.behavior && entry.format === source.format, "快照与配置不符：" + name);
    assert.equal(entry.file, hash(source.url) + "." + source.format, "快照路径无效");
    const body = fs.readFileSync(path.join(cacheDirectory, entry.file));
    assert.equal(hash(body), entry.sha256, "快照哈希不同：" + name);
    validateBody(body, source);
    // 遵守内核 home/SAFE_PATHS 限制；只复制已校验的公开数据，不放宽安全路径。
    const target = path.join(directory, entry.file);
    if (fs.existsSync(target)) assert.equal(hash(fs.readFileSync(target)), entry.sha256, "隔离目录快照哈希不同");
    else fs.writeFileSync(target, body, { flag: "wx" });
    providers[name] = { type: "file", behavior: source.behavior, format: source.format, path: target };
  }
  return providers;
}
async function githubDnsCase(region, manifest, general, github, ai, mutation) {
  const file = "防DNS泄露-" + region + "版.yaml";
  const original = parse(read(file));
  const providers = snapshotProviders(file, manifest);
  let entries = Object.entries(original.dns["nameserver-policy"]);
  if (mutation) {
    const policies = original.dns["nameserver-policy"];
    entries = entries.map(([key, value]) => key === "rule-set:github"
      ? ["rule-set:microsoft", policies["rule-set:microsoft"]]
      : key === "rule-set:microsoft" ? ["rule-set:github", policies["rule-set:github"]] : [key, value]);
  }
  const aiKeys = new Set(["rule-set:openai", "rule-set:anthropic", "rule-set:google-gemini", "rule-set:github-copilot"]);
  const policies = Object.fromEntries(entries.map(([key, values]) => [key,
    ["udp://127.0.0.1:" + (key === "rule-set:github" ? github
      : aiKeys.has(key) || values.every(value => value.endsWith("#AI")) ? ai : general)]]));
  const reserve = socket(); const port = await bind(reserve);
  await new Promise(resolve => reserve.close(resolve));
  const running = start({ ...base(), "rule-providers": providers, dns: {
    enable: true, listen: "127.0.0.1:" + port, ipv6: false, "enhanced-mode": "redir-host",
    "use-hosts": false, "use-system-hosts": false, nameserver: ["udp://127.0.0.1:" + general],
    "nameserver-policy": policies,
  } });
  try {
    let ready = false;
    for (let i = 0; i < 12; i++) {
      assert(children.has(running.child), "内核提前退出：" + running.logs());
      try { await query(port, "ready.example.test"); ready = true; break; } catch { await pause(100); }
    }
    assert(ready, "GitHub DNS 内核未就绪：" + running.logs());
    const githubHosts = ["github.com", "api.github.com", "raw.githubusercontent.com",
      "avatars.githubusercontent.com", "github.githubassets.com", "pages.github.io"];
    for (const host of githubHosts) {
      assert.equal(await query(port, host), mutation ? "198.51.100.10" : "203.0.113.30", region + " " + host);
    }
    assert.equal(await query(port, "api.githubcopilot.com"), "203.0.113.20", "Copilot 仍先匹配 AI");
    for (const host of ["teams.microsoft.com", "notgithub.com", "github.com.evil.test"]) {
      assert.equal(await query(port, host), "198.51.100.10", "普通微软/相似域名不可误入 GitHub");
    }
    console.log(file + "：真实 27 集合/完整 DNS 顺序，GitHub " + (mutation ? "旧顺序负向控制" : "修复后") + " 10/10 OK");
  } finally { await stop(running); }
}
async function providerCase(file, manifest) {
  const providers = snapshotProviders(file, manifest);
  const reserve = net.createServer();
  await new Promise((resolve, reject) => { reserve.once("error", reject); reserve.listen(0, "127.0.0.1", resolve); });
  const port = reserve.address().port;
  await new Promise(resolve => reserve.close(resolve));
  const running = start({ ...base(), "external-controller": "127.0.0.1:" + port,
    "rule-providers": providers, rules: [...Object.keys(providers).map(name => "RULE-SET," + name + ",DIRECT"), "MATCH,DIRECT"] });
  try {
    let ready = false;
    for (let i = 0; i < 30; i++) {
      assert(children.has(running.child), "内核提前退出：" + running.logs());
      try {
        const response = await fetch("http://127.0.0.1:" + port + "/providers/rules", { signal: AbortSignal.timeout(400) });
        assert.equal(response.status, 200);
        const result = (await response.json()).providers;
        ready = Object.keys(providers).every(name => result?.[name]?.ruleCount > 0);
        if (ready) break;
      } catch { /* Only this owned loopback endpoint is retried. */ }
      await pause(100);
    }
    assert(ready, "provider 未全部初始化：" + running.logs());
    console.log(file + "：27 个公开快照经 Mihomo 完整初始化 OK（不代表 Stash 实机通过）");
  } finally { await stop(running); }
}
(async () => {
  try {
    const general = await upstream([198,51,100,10]);
    const ai = await upstream([203,0,113,20]);
    for (const region of ["国内", "国外"]) {
      await aiGroupsCase(region, false);
      await aiGroupsCase(region, true);
      await dnsCase(region, general, ai, false);
      await dnsCase(region, general, ai, true);
    }
    const direct = await upstream([203,0,113,40]);
    for (const region of ["国内", "国外"]) {
      await tampermonkeyDnsCase(region, general, direct, false);
      await tampermonkeyDnsCase(region, general, direct, true);
    }
    if (cacheDirectory) {
      assert(path.isAbsolute(cacheDirectory), "MIHOMO_RULE_CACHE 须为绝对路径");
      const manifest = JSON.parse(fs.readFileSync(path.join(cacheDirectory, "manifest.json"), "utf8"));
      assert.equal(manifest.failures.length, 0, "不能使用失败的下载快照");
      await providerCase("防DNS泄露-国外版.yaml", manifest);
      await providerCase("stash-国外版.stoverride", manifest);
      const github = await upstream([203,0,113,30]);
      for (const region of ["国内", "国外"]) {
        await githubDnsCase(region, manifest, general, github, ai, false);
        await githubDnsCase(region, manifest, general, github, ai, true);
      }
    } else console.log("未指定 MIHOMO_RULE_CACHE，跳过远程快照完整初始化");
  } finally {
    for (const child of children) child.kill();
    for (const value of [...sockets]) value.close();
    clearTimeout(watchdog);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
