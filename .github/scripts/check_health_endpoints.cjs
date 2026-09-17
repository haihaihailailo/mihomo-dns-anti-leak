// 默认只跑合成测试；联网由唯一入口的 MIHOMO_ENDPOINT_OUTPUT 显式启用。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const YAML = require("yaml");
const ROOT = path.resolve(__dirname, "../..");
const FILES = ["防DNS泄露-国内版.yaml", "防DNS泄露-国外版.yaml"];
// 只允许经过审核的公开测速 URL；不接受任意 URL、订阅、token 或本机控制器。
const ALLOWED = new Set([
  "https://cp.cloudflare.com/generate_204",
  "https://www.google.com.vn/generate_204",
  "https://auth.openai.com/favicon.ico",
  "https://cdn.cloudflare.steamstatic.com/favicon.ico",
  "https://www.microsoft.com/favicon.ico",
  "https://p.bstarstatic.com/fe-static/deps/bilibili_tv.ico?v=1",
  "https://connectivitycheck.gstatic.com/generate_204",
  "https://www.google.com.hk/generate_204",
  "https://www.google.com.tw/generate_204",
  "https://www.google.co.jp/generate_204",
  "https://www.google.com.sg/generate_204",
  "https://www.google.com/generate_204",
  "https://connectivitycheck.platform.hicloud.com/generate_204",
  "https://www.baidu.com",
]);
const ATTEMPTS = 3;
const CONCURRENCY = 4;
const RETRY_MS = 1500;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");

function readProfiles() {
  return FILES.map(file => {
    const text = read(file);
    return { file, sha256: createHash("sha256").update(text).digest("hex"),
      config: YAML.parse(text, { merge: true }) };
  });
}

function targets(profiles = readProfiles()) {
  const result = new Map();
  for (const { file, config } of profiles) {
    assert(Array.isArray(config["proxy-groups"]), "缺少 proxy-groups");
    for (const group of config["proxy-groups"]) {
      if (!group.url) {
        assert(group.type !== "url-test", "自动组缺少测速 URL");
        continue;
      }
      assert(ALLOWED.has(group.url), "新测速 URL 须人工审核");
      const expectedStatus = Number(group["expected-status"]);
      assert(Number.isInteger(expectedStatus) && expectedStatus >= 200 && expectedStatus <= 299,
        "测速预期状态须为明确的 2xx");
      assert(Number.isInteger(group.timeout) && group.timeout > 0 && group.timeout <= 10000,
        "测速超时须在 1-10000ms 内");
      const key = JSON.stringify([group.url, expectedStatus, group.timeout]);
      if (!result.has(key)) result.set(key, {
        url: group.url, expectedStatus, timeout: group.timeout, groups: [],
      });
      result.get(key).groups.push(file + " / " + group.name);
    }
  }
  assert(result.size > 0 && result.size <= 32, "测速目标为空或超过受控上限");
  return [...result.values()].sort((a, b) => a.url.localeCompare(b.url));
}

async function probe(target, { fetcher = fetch, wait = pause } = {}) {
  const attempts = [];
  for (let n = 0; n < ATTEMPTS; n++) {
    const start = Date.now();
    try {
      // Mihomo URLTest: HEAD + 不跟随重定向。这里只验证端点，不复刻节点延迟测量。
      const response = await fetcher(target.url, {
        method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(target.timeout),
        headers: { "User-Agent": "Go-http-client/1.1" },
      });
      await response.body?.cancel();
      attempts.push({ status: response.status, elapsedMs: Date.now() - start });
      if (response.status === target.expectedStatus) return { ...target, ok: true, attempts };
    } catch (error) {
      // 不保存响应正文、重定向地址、环境变量或可能携带凭据的异常文本。
      attempts.push({ error: String(error.cause?.code
        || (typeof error.code === "string" ? error.code : error.name) || "NetworkError"),
        elapsedMs: Date.now() - start });
    }
    if (n + 1 < ATTEMPTS) await wait(RETRY_MS);
  }
  return { ...target, ok: false, attempts };
}

async function scan(list, options) {
  const results = new Array(list.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= list.length) return;
      results[index] = await probe(list[index], options);
    }
  }));
  return results;
}

function summary(results) {
  const cell = value => String(value).replace(/[|\r\n]/g, " ").replace(/[<>]/g, "");
  return [
    "## Public health-check endpoints", "",
    "HEAD; redirects disabled; TLS verification enabled; up to 3 attempts per endpoint.", "",
    "This is the runner's network view, not node bandwidth, AI unlock, DNS-leak or client-deployment proof.", "",
    "| URL | Expected | Attempts | Result |", "| --- | --- | --- | --- |",
    ...results.map(r => "| " + cell(r.url) + " | " + r.expectedStatus + " | "
      + r.attempts.map(a => cell(a.status ?? a.error)).join(" → ") + " | "
      + (r.ok ? (r.attempts.length > 1 ? "RECOVERED" : "PASS") : "FAIL") + " |"),
    "",
    ...results.filter(r => !r.ok).map(r => "- Affected groups: " + r.groups.map(cell).join("; ")),
    "",
  ].join("\n");
}

function requireVerifiedTls(env = process.env) {
  assert.notEqual(env.NODE_TLS_REJECT_UNAUTHORIZED, "0", "拒绝关闭 TLS 证书校验的探测环境");
}

async function run(output) {
  assert(output, "必须指定不存在的新输出目录");
  requireVerifiedTls();
  const profiles = readProfiles();
  const list = targets(profiles); // 哈希绑定本次实际读取的配置；先验证目标，再联网。
  const artifact = require("./artifact_lifecycle.cjs").begin("endpoints", output);
  const startedAt = new Date().toISOString();
  const results = await scan(list);
  const report = {
    startedAt, completedAt: new Date().toISOString(),
    method: "HEAD", redirects: false, tlsVerification: true,
    networkContext: process.env.GITHUB_ACTIONS === "true" ? "GitHub Actions runner"
      : "Local process; may follow system/TUN or an explicitly configured proxy",
    source: profiles.map(({ file, sha256 }) => ({ file, sha256 })),
    results,
  };
  artifact.put("report.json", JSON.stringify(report, null, 2), { materialize: true });
  const markdown = summary(results);
  artifact.put("report.md", markdown, { materialize: true });
  artifact.finish(results.every(r => r.ok) ? "validated" : "failed");
  console.log(markdown);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  assert(results.every(r => r.ok), "部分端点连续 3 次未通过；查看 report.json / Actions summary，不自动改配置");
}

async function selfTest() {
  const list = targets();
  const ai = list.find(t => t.url === "https://auth.openai.com/favicon.ico");
  assert(ai && ai.expectedStatus === 200 && ai.groups.length === 8, "AI 四组/两地版需去重为同一探测");
  const config = { "proxy-groups": [{ name: "fixture", type: "url-test",
    url: ai.url, "expected-status": 200, timeout: 10000 }] };
  for (const change of [
    { url: "http://127.0.0.1:9090/configs" }, { url: ai.url + "?token=secret" },
    { url: "https://example.test" }, { "expected-status": 403 }, { "expected-status": "" },
    { timeout: 0 }, { timeout: 10001 }, { url: "" },
  ]) assert.throws(() => targets([{ file: "fixture", config: {
    "proxy-groups": [{ ...config["proxy-groups"][0], ...change }],
  } }]));
  assert.throws(() => targets([]));
  requireVerifiedTls({});
  assert.throws(() => requireVerifiedTls({ NODE_TLS_REJECT_UNAUTHORIZED: "0" }));
  assert.equal(targets([{ file: "a", config }, { file: "b", config }]).length, 1);
  const noWait = async () => {};
  let calls = 0, cancelled = 0, waits = 0;
  const statusFetcher = statuses => async (url, options) => {
    assert.equal(url, ai.url);
    assert.equal(options.method, "HEAD");
    assert.equal(options.redirect, "manual");
    assert.equal(options.headers["User-Agent"], "Go-http-client/1.1");
    assert(options.signal instanceof AbortSignal);
    assert.equal(Object.keys(options).sort().join(","), "headers,method,redirect,signal");
    const status = statuses[Math.min(calls++, statuses.length - 1)];
    return { status, body: { cancel: async () => { cancelled++; } } };
  };
  for (const status of [200, 204]) {
    calls = 0;
    const result = await probe({ ...ai, expectedStatus: status }, { fetcher: statusFetcher([status]), wait: noWait });
    assert(result.ok && result.attempts.length === 1 && calls === 1);
  }
  for (const status of [302, 403, 429, 503]) {
    calls = 0;
    const result = await probe(ai, { fetcher: statusFetcher([status]), wait: noWait });
    assert(!result.ok && result.attempts.length === 3 && calls === 3);
  }
  calls = 0;
  const recovered = await probe(ai, { fetcher: statusFetcher([503, 200]), wait: async ms => {
    assert.equal(ms, RETRY_MS); waits++;
  } });
  assert(recovered.ok && calls === 2 && waits === 1 && cancelled === 16);
  for (const [actual, expected] of [[200, 204], [204, 200]]) {
    calls = 0;
    const mismatch = await probe({ ...ai, expectedStatus: expected },
      { fetcher: statusFetcher([actual]), wait: noWait });
    assert(!mismatch.ok && calls === 3, "不能把任意 2xx 当作预期状态");
  }
  const tlsFailure = await probe(ai, { fetcher: async () => {
    throw Object.assign(new Error("not saved"), { code: "CERT_HAS_EXPIRED" });
  }, wait: noWait });
  assert(!tlsFailure.ok && tlsFailure.attempts.every(a => a.error === "CERT_HAS_EXPIRED"));
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    const timedOut = await probe({ ...ai, timeout: 5 }, { fetcher: (_url, { signal }) =>
      new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })),
    wait: noWait });
    assert(!timedOut.ok && timedOut.attempts.length === 3
      && timedOut.attempts.every(a => a.error === "TimeoutError"));
  } finally { clearTimeout(keepAlive); }
  let active = 0, peak = 0;
  const parallel = await scan(Array.from({ length: 9 }, () => ai), { fetcher: async () => {
    active++; peak = Math.max(peak, active); await pause(2); active--;
    return { status: 200 };
  }, wait: noWait });
  assert(parallel.every(r => r.ok) && peak === CONCURRENCY);
  const markdown = summary([recovered, tlsFailure]);
  assert(markdown.includes("RECOVERED") && markdown.includes("FAIL") && markdown.includes("Affected groups"));
  checkWorkflows();
  console.log("公开测速端点：去重/白名单、HEAD、禁重定向、状态码、重试、TLS失败、超时、并发及 CI 隔离 OK（无公网探测）");
}

function checkWorkflows() {
  const monitor = YAML.parse(read(".github/workflows/check-health-endpoints.yml"));
  assert.deepEqual(Object.keys(monitor.on).sort(), ["schedule", "workflow_dispatch"]);
  assert.deepEqual(monitor.permissions, { contents: "read" });
  assert.deepEqual(monitor.on.schedule, [{ cron: "50 20 * * *" }]);
  const job = monitor.jobs.probe;
  assert.equal(job.if, "github.ref == 'refs/heads/main'");
  assert.equal(job["timeout-minutes"], 5);
  assert(!job["continue-on-error"]);
  const step = job.steps.find(s => s.env?.MIHOMO_ENDPOINT_OUTPUT);
  assert(step && step.run === "python3 .github/scripts/validate_health_checks.py");
  assert(!step["continue-on-error"]);
  const pins = new Set();
  for (const file of ["validate-config.yml", "validate-health-checks.yml", "check-health-endpoints.yml"]) {
    const workflow = YAML.parse(read(".github/workflows/" + file));
    assert(!workflow.on.pull_request_target && !workflow.on.workflow_run);
    for (const j of Object.values(workflow.jobs)) for (const s of j.steps) {
      if (!s.uses?.startsWith("actions/checkout@")) continue;
      assert(/^actions\/checkout@[a-f0-9]{40}$/.test(s.uses), "checkout 需要完整 SHA");
      assert.equal(s.with?.["persist-credentials"], false);
      pins.add(s.uses);
    }
    if (file === "check-health-endpoints.yml") continue;
    assert(!workflow.env?.MIHOMO_ENDPOINT_OUTPUT);
    for (const j of Object.values(workflow.jobs)) {
      assert(!j.env?.MIHOMO_ENDPOINT_OUTPUT);
      for (const s of j.steps) assert(!s.env?.MIHOMO_ENDPOINT_OUTPUT,
        "普通配置 CI 不得自动启用公网测速端点探测");
    }
    for (const event of ["push", "pull_request"]) for (const entry of [
      ".github/scripts/check_health_endpoints.cjs", ".github/workflows/check-health-endpoints.yml",
    ]) assert(workflow.on[event].paths.includes(entry), "新增监控脚本和 workflow 的离线回归不能漏触发");
  }
  assert.equal(pins.size, 1, "三个 workflow 的 checkout 版本必须同步");
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const timer = setTimeout(() => { console.error("Endpoint check exceeded watchdog"); process.exit(1); },
    args[0] === "--self-test" ? 12000 : 180000);
  const action = args.length === 1 && args[0] === "--self-test" ? selfTest()
    : args.length === 2 && args[0] === "--output-dir" ? run(args[1])
      : Promise.reject(Error("需要 --self-test 或 --output-dir <新目录>"));
  action.catch(error => { console.error(error.message); process.exitCode = 1; })
    .finally(() => clearTimeout(timer));
}
module.exports = { targets, probe, scan, summary };
