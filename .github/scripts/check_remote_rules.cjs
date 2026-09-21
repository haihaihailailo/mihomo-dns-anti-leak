// 显式联网检查，仅下载配置引用的公开规则；与默认离线入口隔离。
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { read, parse } = require("./build_profiles.cjs");
const { parsePayload, AI_DOMAIN_SOURCES, checkAiDomainPayload } = require("./validate_rule_sources.cjs");
const lifecycle = require("./artifact_lifecycle.cjs");
const hash = body => createHash("sha256").update(body).digest("hex");
const LIMIT = 4194304;
function sources() {
  const result = new Map();
  function add(source) {
    const url = new URL(source.url);
    assert(url.protocol === "https:" && !url.username && !url.password && !url.search);
    assert(["raw.githubusercontent.com", "cdn.jsdelivr.net"].includes(url.hostname), "新来源须人工审核：" + url.hostname);
    if (result.has(source.url)) assert.deepEqual(result.get(source.url), source, "同 URL 格式冲突");
    result.set(source.url, source);
  }
  for (const region of ["国内", "国外"]) {
    // 路由器投影会新增 geoip-vn；必须和手机/桌面 provider 一起下载、哈希和留存，
    // 不能只靠 mihomo -t 验证“配置能解析”却漏掉它的真实远程载荷。
    for (const file of ["防DNS泄露-" + region + "版.yaml", "防DNS泄露-路由器-" + region + "版.yaml"]) {
      for (const { url, behavior, format } of Object.values(parse(read(file))["rule-providers"])) add({ url, behavior, format });
    }
  }
  const gameMrs = [...result.values()].find(source => source.url.endsWith("/geo/geosite/category-games-cn.mrs"));
  if (gameMrs) {
    // MRS 是真实消费源但当前 JS 不直接反解其成员；同仓库同分支的 .list 只作为“成员变化告警伴随源”。
    // 这样未来新增具体 *.in.th 游戏域时，真实联网检查会报警；MRS 本身仍由隔离 Mihomo 完整初始化，
    // 不把文本伴随源冒充为二进制内容等价证明。
    add({ url: gameMrs.url.replace(/\.mrs$/, ".list"), behavior: "domain", format: "text", companionOf: gameMrs.url });
  }
  return [...result.values()];
}
function validateBody(body, source) {
  assert(body.length > 0 && body.length <= LIMIT, "规则为空或超过 4 MiB");
  if (source.format === "mrs") {
    assert(body.length > 8 && body.subarray(0, 4).equals(Buffer.from("28b52ffd", "hex")), "MRS 缺少 Zstd 帧头");
    return null; // 只验证 MRS 传输容器；真实消费语义仍由隔离 Mihomo 初始化，不能用伴随 .list 代替。
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
  const payload = parsePayload(text, source.behavior, source.format);
  const aiName = source.url && AI_DOMAIN_SOURCES.find(name => source.url.endsWith("/geo/geosite/" + name + ".list"));
  if (aiName) {
    assert.equal(source.behavior, "domain", "AI 来源不得悄然改为 classical");
    checkAiDomainPayload(payload, aiName);
  }
  if (source.url?.endsWith("/geo/geosite/category-games-cn.list")) {
    // 当前只存在误收的公共后缀。出现具体游戏子域时应审查例外，不能静默漏掉它。
    const specific = payload.filter(rule => rule.replace(/^[+.]+/, "").endsWith(".in.th"));
    assert.equal(specific.length, 0, "上游新增 in.th 游戏条目，须复核隔离及具体域名/DNS 例外：" + specific.join(", "));
  }
  return payload.length;
}
async function download(source, fetcher = fetch, timeout = 12000, limit = LIMIT) {
  const signal = AbortSignal.timeout(timeout);
  const response = await fetcher(source.url, { signal, redirect: "error" });
  if (response.status !== 200) {
    await response.body?.cancel();
    throw Error("HTTP " + response.status);
  }
  const reader = response.body?.getReader();
  assert(reader, "响应无正文");
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      assert(size <= limit, "下载体积超限");
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel(); reader.releaseLock(); }
  const body = Buffer.concat(chunks);
  const rules = validateBody(body, source);
  return { body, rules };
}
async function selfTest() {
  const source = { url: "https://raw.githubusercontent.com/fixture/list", behavior: "domain", format: "text" };
  assert.equal((await download(source, async () => new Response("+.example.test"))).rules, 1);
  for (const response of [
    new Response("denied", { status: 403 }), new Response("<html>error</html>"),
    new Response(""), new Response("DOMAIN,example.test,DIRECT"),
  ]) await assert.rejects(() => download(source, async () => response));
  await assert.rejects(() => download(source, async () => new Response("+.example.test"), 1000, 2));
  // Keep the event loop alive while AbortSignal.timeout's unreferenced timer fires.
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(() => download(source, (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    }), 10));
  } finally { clearTimeout(keepAlive); }
  assert.throws(() => validateBody(Buffer.from("payload: ["), { behavior: "classical", format: "yaml" }));
  assert.throws(() => validateBody(Buffer.from("<html>bad MRS</html>"), { format: "mrs" }));
  const gameSource = { ...source, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-games-cn.list" };
  assert.equal(validateBody(Buffer.from("+.wegame.com\n+.in.th"), gameSource), 2);
  await assert.rejects(() => download(gameSource, async () => new Response("+.wegame.com\n+.fixture-game.in.th")), /须复核隔离/);
  const aiSource = { ...source, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/openai.list" };
  assert.equal(validateBody(Buffer.from("+.openai.com\n+.chatgpt.com\no33249.ingest.sentry.io"), aiSource), 3);
  await assert.rejects(() => download(aiSource, async () => new Response("+.openai.com\n+.stripe.com")), /AI 上游误收共享服务/);
  await assert.rejects(() => download(aiSource, async () => new Response("IP-ASN,20473,no-resolve")), /无效纯域名规则/);
  const configured = sources();
  assert(configured.some(item => item.url.endsWith("/geo/geoip/vn.mrs")), "路由器专属 geoip-vn 必须进入远程载荷检查");
  assert(configured.some(item => item.url.endsWith("/geo/geosite/category-games-cn.list") && item.companionOf),
    "category-games-cn 的 in.th 成员告警伴随源必须进入真实下载清单");
  console.log("公开规则下载器：主/路由器来源、in.th 伴随告警、成功/403/HTML/空正文/超限/超时/格式及 AI 负向控制 OK");
}
async function run(output) {
  assert(output, "用法：node check_remote_rules.cjs --output-dir <不存在的新目录>");
  const run = lifecycle.begin("rules", output);
  const list = sources(); const results = []; const failures = [];
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (;;) {
      const source = list[next++];
      if (!source) return;
      try {
        const { body, rules } = await download(source);
        const file = hash(source.url) + "." + source.format;
        run.put(file, body); // identical public content reuses the registered file, no hardlinks.
        results.push({ ...source, file, sha256: hash(body), bytes: body.length, rules });
      } catch (error) { failures.push({ url: source.url, error: error.message }); }
    }
  }));
  // 伴随源必须和它监看的真实 MRS 一起成功进入同一 manifest；否则不能把“告警检查通过”当成有效证据。
  for (const item of results.filter(item => item.companionOf)) {
    assert(results.some(peer => peer.url === item.companionOf), "伴随规则源缺少对应真实 MRS：" + item.companionOf);
  }
  const manifest = { entries: results.sort((a, b) => a.url.localeCompare(b.url)), failures };
  run.put("manifest.json", JSON.stringify(manifest, null, 2), { materialize: true });
  run.finish(failures.length ? "failed" : "validated");
  for (const failure of failures) console.error(failure.error + " " + failure.url);
  assert.equal(failures.length, 0, "远程规则检查失败；详情在 manifest.json");
  console.log("公开规则下载/格式：" + results.length + " 个 URL OK；MRS 完整解码须另做内核初始化");
}
if (require.main === module) {
  const action = process.argv[2] === "--self-test" ? selfTest()
    : process.argv[2] === "--output-dir" ? run(process.argv[3]) : Promise.reject(Error("需要 --self-test 或 --output-dir"));
  action.catch(error => { console.error(error); process.exitCode = 1; });
}
module.exports = { sources, hash, validateBody };
