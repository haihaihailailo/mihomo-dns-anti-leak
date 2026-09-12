// 独立期望值验证：不能以生产投影函数的输出作为唯一 oracle。
const assert = require("node:assert/strict");
const clone = value => JSON.parse(JSON.stringify(value));

function checkConsolidation(actual, detailed, environment, client) {
  const domestic = environment === "国内";
  const merged = ["漏网之鱼", "GitHub", "YouTube", "Netflix", "谷歌服务", "电报消息", "Meta / X", "TikTok", "Spotify"];
  const deleted = ["韩国节点", "韩国-自动", ...(domestic ? ["中国节点", "中国-自动"] : [])];
  function expectedTarget(name) {
    if (merged.includes(name)) return "节点选择";
    if (["微软服务", "苹果服务"].includes(name)) return "微软/苹果服务";
    if (name === "全局直连" || (domestic && name === "国内服务")) return "DIRECT";
    return name;
  }
  const regionNames = ["香港", "台湾", "日本", "新加坡", "美国", "越南", ...(domestic ? [] : ["中国"])];
  const names = ["节点选择", "越南服务", ...(domestic ? [] : ["国内服务"]),
    "AI", "游戏平台", "微软/苹果服务", "哔哩哔哩港澳台", "广告过滤", "全部节点", "自动选择",
    ...regionNames.flatMap(region => [region + "节点", region + "-自动"])];
  const groups = actual["proxy-groups"];
  const map = Object.fromEntries(groups.map(group => [group.name, group]));
  assert.equal(groups.length, domestic ? 21 : 24);
  assert.deepEqual(groups.map(group => group.name).sort(), names.sort(), "公开入口组集合不符合精简方案");
  const old = Object.fromEntries(detailed["proxy-groups"].map(group => [group.name, group]));
  const expected = clone(detailed);
  expected["proxy-groups"] = [];
  for (const source of detailed["proxy-groups"]) {
    if (deleted.includes(source.name) || merged.includes(source.name)
        || source.name === "苹果服务" || source.name === "全局直连"
        || (domestic && source.name === "国内服务")) continue;
    const group = clone(source);
    group.name = expectedTarget(source.name);
    if (source.proxies) {
      const members = source.name === "微软服务" ? [...source.proxies, ...old["苹果服务"].proxies] : source.proxies;
      group.proxies = [...new Set(members.filter(name => !deleted.includes(name)).map(expectedTarget))];
    }
    if (group["policy-select-name"]) group["policy-select-name"] = expectedTarget(group["policy-select-name"]);
    expected["proxy-groups"].push(group);
  }
  expected.rules = detailed.rules.map(rule => {
    const parts = rule.split(",");
    const slot = ["MATCH", "FINAL"].includes(parts[0]) ? 1 : 2;
    assert(!deleted.includes(parts[slot]), "基线规则引用被删除地区，须单独审查");
    parts[slot] = expectedTarget(parts[slot]);
    return parts.join(",");
  });
  function expectedDNS(value) {
    if (Array.isArray(value)) return value.map(expectedDNS);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, expectedDNS(item)]));
    if (typeof value !== "string" || !value.includes("#")) return value;
    const index = value.indexOf("#");
    const [policy, ...options] = value.slice(index + 1).split("&");
    return value.slice(0, index + 1) + [expectedTarget(policy), ...options].join("&");
  }
  if (expected.dns) expected.dns = expectedDNS(detailed.dns);
  assert.deepEqual(actual, expected, "精简超出组成员、规则目标、DNS 策略引用的允许范围");
  assert.equal(actual.rules.length, detailed.rules.length, "不得删规则");
  assert.equal(map.AI.proxies[0], "美国-自动");
  assert.equal(map["节点选择"].proxies[0], domestic ? "自动选择" : "DIRECT");
  for (const name of ["越南服务", "微软/苹果服务", "哔哩哔哩港澳台", ...(domestic ? [] : ["国内服务"])]) {
    assert.equal(map[name].proxies[0], "DIRECT", name + " 应默认直连");
  }
  assert.equal(map["游戏平台"].proxies[0], "节点选择");
  for (const group of groups) {
    assert.equal(new Set(group.proxies || []).size, (group.proxies || []).length, "重复候选");
    if (group["policy-select-name"]) assert(group.proxies.includes(group["policy-select-name"]), "手选默认引用悬空");
  }
  const matches = (group, name) => new RegExp(
    (map[group].filter || map[group]["policy-regex-filter"]).replace(/^\(\?i\)/, ""), "i").test(name);
  const filters = groups.filter(group => group.filter || group["policy-regex-filter"]).map(group => group.name);
  for (const name of ["[SSR]港广专线3_回国", "[SSR]港沪专线3_回国", "IEPL回国", "广州回国01", "上海回国"]) {
    for (const group of filters) {
      assert.equal(matches(group, name), ["全部节点", "中国节点", "中国-自动"].includes(group), "回国节点隔离失败：" + group);
    }
  }
  for (const name of ["[TRO]新加坡V4", "[TRO]日本大阪15", "[SSR]台湾2", "韩国 KR01"]) {
    if (!domestic) for (const group of ["中国节点", "中国-自动"]) assert(!matches(group, name));
  }
  for (const name of ["韩国 KR01", "[SS]首尔 ICN01"]) {
    for (const group of ["全部节点", "自动选择"]) assert(matches(group, name), "仅删韩国组，不删除韩国订阅节点");
  }
  if (client === "mihomo") {
    assert.equal(groups.filter(group => group.hidden).length, domestic ? 7 : 8);
    for (const region of regionNames) assert(!map[region + "节点"].hidden, "保留地区手动组可见");
    for (const group of groups.filter(group => group["include-all"])) assert.equal(group["empty-fallback"], "REJECT");
  }
  console.log(client + " " + environment + ": " + groups.length + " 组；规则顺序/谓词/测速/设备字段保留，精简与回国隔离 OK");
}

module.exports = { checkConsolidation };
