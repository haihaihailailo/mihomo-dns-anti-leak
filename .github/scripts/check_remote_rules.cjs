// 显式联网检查，仅下载配置引用的公开规则；与默认离线入口隔离。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { read, parse } = require("./build_profiles.cjs");
const { parseShadow } = require("./build_native_profiles.cjs");
const { parsePayload } = require("./validate_rule_sources.cjs");
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
    for (const file of ["防DNS泄露-" + region + "版.yaml", "stash-" + region + "版.stoverride"]) {
      for (const { url, behavior, format } of Object.values(parse(read(file))["rule-providers"])) add({ url, behavior, format });
    }
    for (const rule of parseShadow(read("shadowrocket-" + region + "版.conf")).rules) {
      const [type, url] = rule.split(",");
      if (["DOMAIN-SET", "RULE-SET"].includes(type)) add({ url, behavior: type === "DOMAIN-SET" ? "domain" : "classical", format: "text" });
    }
  }
  return [...result.values()];
}
function validateBody(body, source) {
  assert(body.length > 0 && body.length <= LIMIT, "规则为空或超过 4 MiB");
  if (source.format === "mrs") {
    assert(body.length > 8 && body.subarray(0, 4).equals(Buffer.from("28b52ffd", "hex")), "MRS 缺少 Zstd 帧头");
    return null; // 只验证传输容器；完整解码由隔离 Mihomo 初始化检查完成。
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
  return parsePayload(text, source.behavior, source.format).length;
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
  assert(sources().length > 0);
  console.log("公开规则下载器：成功、403、HTML、空正文、超限、超时、格式错误合成检查 OK");
}
async function run(output) {
  assert(output, "用法：node check_remote_rules.cjs --output-dir <不存在的新目录>");
  const directory = path.resolve(output);
  fs.mkdirSync(directory); // 不覆盖旧快照；父目录必须已存在。
  const list = sources(); const results = []; const failures = [];
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (;;) {
      const source = list[next++];
      if (!source) return;
      try {
        const { body, rules } = await download(source);
        const file = hash(source.url) + "." + source.format;
        fs.writeFileSync(path.join(directory, file), body, { flag: "wx" });
        results.push({ ...source, file, sha256: hash(body), bytes: body.length, rules });
      } catch (error) { failures.push({ url: source.url, error: error.message }); }
    }
  }));
  const manifest = { entries: results.sort((a, b) => a.url.localeCompare(b.url)), failures };
  fs.writeFileSync(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2), { flag: "wx" });
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
