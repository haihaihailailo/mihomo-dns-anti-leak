// 由唯一离线入口调用；只验证配置/合成请求，不连接服务器。
const assert = require("node:assert/strict");
const { read, parse, evaluate } = require("./build_profiles.cjs");
const { consolidateGroups } = require("./consolidate_groups.cjs");
const RULE = "AND,((IP-CIDR,47.81.15.184/32,no-resolve),(DST-PORT,22),(NETWORK,TCP)),DIRECT";
function check(config) {
  const selected = config.rules.filter(rule => rule.includes("47.81.15.184"));
  assert.deepEqual(selected, [RULE], "服务器例外须唯一且严格限制 IP/端口/协议/no-resolve");
  const at = config.rules.indexOf(RULE);
  assert(at > config.rules.indexOf("DOMAIN-SUFFIX,tampermonkey.net,DIRECT"));
  assert(at < config.rules.findIndex(rule => rule.startsWith("PROCESS-")), "SSH 例外须早于应用分流");
  const match = selected[0].match(/^AND,\(\(IP-CIDR,([^,]+),no-resolve\),\(DST-PORT,(\d+)\),\(NETWORK,(TCP|UDP)\)\),([^,]+)$/);
  assert(match);
  const [, cidr, port, network, target] = match;
  const matches = (ip, p, n) => ip === cidr.slice(0, -3) && String(p) === port && n === network;
  assert.equal(target, "DIRECT");
  assert(matches("47.81.15.184", 22, "TCP"));
  for (const row of [["47.81.15.184", 443, "TCP"], ["47.81.15.184", 23, "TCP"],
    ["47.81.15.184", 22, "UDP"], ["47.81.15.185", 22, "TCP"], ["203.0.113.1", 22, "TCP"],
    ["unresolved.example.test", 22, "TCP"]]) assert(!matches(...row), "例外越界：" + row);
}
function run() {
  for (const stem of [".github/config/shared", "防DNS泄露-国内版", "防DNS泄露-国外版"]) {
    for (const config of [parse(read(stem + ".yaml")), evaluate(read(stem + ".js"))]) {
      check(config);
      for (const badRule of [null, RULE.replace("/32", "/24"),
        RULE.replace(",no-resolve", ""), RULE.replace("DST-PORT,22", "DST-PORT,443"),
        RULE.replace("NETWORK,TCP", "NETWORK,UDP"), "IP-CIDR,47.81.15.184/32,DIRECT,no-resolve",
        "DST-PORT,22,DIRECT", RULE.replace(")),DIRECT", ")),节点选择")]) {
        if (badRule === RULE) continue;
        const broken = structuredClone(config);
        broken.rules = broken.rules.flatMap(rule => rule === RULE ? (badRule ? [badRule] : []) : [rule]);
        assert.throws(() => check(broken), { code: "ERR_ASSERTION" });
      }
    }
  }
  // 投影必须识别逻辑规则最外层策略，不改 payload；使用非 DIRECT 目标防止测试空过。
  const shared = parse(read(".github/config/shared.yaml"));
  const fixture = RULE.replace(")),DIRECT", ")),GitHub");
  shared.rules = [fixture];
  assert.deepEqual(consolidateGroups(shared, true).rules, [RULE.replace(")),DIRECT", ")),节点选择")]);
  console.log("服务器 TCP/22 精确直连：3 套 YAML/JS、范围负例、退化负向控制和逻辑规则投影 OK");
}
module.exports = { run, RULE };
