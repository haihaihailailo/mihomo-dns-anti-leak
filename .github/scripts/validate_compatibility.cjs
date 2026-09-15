// 唯一入口调用的离线回归：依赖锁定、YAML alias 行为和最低内核 CI 覆盖。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const ROOT = path.resolve(__dirname, "../..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const json = file => JSON.parse(read(file));
const clone = value => JSON.parse(JSON.stringify(value));

function checkMatrix(job) {
  assert.deepEqual(job.strategy.matrix.mihomo, ["v1.19.27", "latest"]);
  assert.equal(job.strategy["fail-fast"], false);
  assert.equal(job.strategy["max-parallel"], 2);
  assert.equal(job.needs, "validate-sources");
  assert.equal(job["timeout-minutes"], 10);
  assert(!job["continue-on-error"]);
  const download = job.steps.find(step => step.env?.MIHOMO_RELEASE);
  assert.equal(download?.env.MIHOMO_RELEASE, "${{ matrix.mihomo }}");
  assert(download.run.includes('release_path="tags/v1.19.27"'));
  assert(download.run.includes('release_path="latest"'));
  assert(download.run.includes('select(.draft == false and .prerelease == false)'));
  const checksum = download.run.indexOf("sha256sum --check -");
  assert(checksum >= 0 && checksum < download.run.indexOf("gzip -d"));
  assert(download.run.includes('resolved_tag" != "$MIHOMO_RELEASE"'));
  assert(download.run.includes('"Mihomo Meta $resolved_tag "*'));
  assert(!download["continue-on-error"]);
  const regression = job.steps.find(step => step.env?.MIHOMO_TEST_BIN);
  assert.equal(regression?.run, "python3 .github/scripts/validate_health_checks.py");
  assert(regression.env.MIHOMO_RULE_CACHE && !regression["continue-on-error"]);
  const load = job.steps.find(step => step.name === "Test config load");
  assert(load && !load["continue-on-error"]);
  for (const file of [".github/config/shared.yaml", "防DNS泄露-国内版.yaml", "防DNS泄露-国外版.yaml"])
    assert(load.run.includes('./mihomo -t -f "' + file + '"'));
}

function checkDependencies(config) {
  const updates = config.updates;
  assert.equal(updates.filter(item => item["package-ecosystem"] === "github-actions").length, 1);
  const npm = updates.filter(item => item["package-ecosystem"] === "npm");
  assert.equal(npm.length, 1);
  assert.equal(npm[0].directory, "/");
  assert.equal(npm[0].schedule.interval, "weekly");
  assert.equal(npm[0]["versioning-strategy"], "increase");
}

const manifest = json("package.json");
const lock = json("package-lock.json");
const version = manifest.devDependencies.yaml;
assert(/^\d+\.\d+\.\d+$/.test(version), "YAML 版本必须精确锁定");
assert.equal(lock.packages[""].devDependencies.yaml, version);
assert.equal(lock.packages["node_modules/yaml"].version, version);
assert.equal(lock.packages["node_modules/yaml"].resolved, "https://registry.npmjs.org/yaml/-/yaml-" + version + ".tgz");
assert(lock.packages["node_modules/yaml"].integrity.startsWith("sha512-"));
assert.equal(require("yaml/package.json").version, version, "已安装依赖与锁文件不一致");

// 正常 merge/alias 与显式键覆盖仍须保留；异常递归受有限 alias 预算约束。
const options = { merge: true, uniqueKeys: true, maxAliasCount: 20 };
const merged = YAML.parse("base: &base { timeout: 10000, lazy: true }\ncopy: { <<: *base, lazy: false }\n", options);
assert.deepEqual(merged.copy, { timeout: 10000, lazy: false });
assert.throws(() => YAML.parse("name: first\nname: second\n", options), /unique/i);
assert.throws(() => YAML.parse("loop: &loop { <<: *loop }\n", options), /alias count/i);
const { parse } = require("./build_profiles.cjs");
assert.deepEqual(parse("base: &base { timeout: 10000 }\ncopy: { <<: *base }\n").copy, { timeout: 10000 });

const workflow = YAML.parse(read(".github/workflows/validate-config.yml"));
// CI 内嵌 Ruby 与共同 DNS 契约一起维护，避免离线通过而云端仍拒绝新字段。
function checkDnsOwnership(step) {
  assert(step && !step["continue-on-error"]);
  for (const condition of ['if main.key?("ipv6")', 'unless dns["ipv6"] == true',
    'unless dns["fake-ip-range6"] == "fdfe:dcba:9876::1/64"', 'if tun.key?("inet6-address")']) {
    assert(step.run.includes(condition), "CI DNS/客户端边界断言缺失：" + condition);
  }
  for (const key of ["ipv6", "fake-ip-range6"]) assert(!step.run.includes('if dns.key?("' + key + '")'), "CI 仍在禁止公共 DNS 字段：" + key);
}
const policyStep = workflow.jobs["validate-sources"].steps.find(step => step.name === "Check policy semantics");
checkDnsOwnership(policyStep);
for (const condition of ['unless dns["ipv6"] == true', 'unless dns["fake-ip-range6"] == "fdfe:dcba:9876::1/64"']) {
  const broken = clone(policyStep);
  broken.run = broken.run.replace(condition, 'if false');
  assert.throws(() => checkDnsOwnership(broken));
}
const job = workflow.jobs["validate-mihomo"];
checkMatrix(job);
assert(read("README.md").includes("Mihomo v1.19.27 或更新内核"), "最低支持版本文档须同步");
for (const mutate of [
  draft => { draft.strategy.matrix.mihomo = ["latest"]; },
  draft => { draft.strategy["fail-fast"] = true; },
  draft => { draft["continue-on-error"] = true; },
  draft => { draft.steps.find(step => step.env?.MIHOMO_RELEASE).env.MIHOMO_RELEASE = "latest"; },
  draft => { const step = draft.steps.find(step => step.env?.MIHOMO_RELEASE); step.run = step.run.replace("sha256sum --check -", "true"); },
]) {
  const draft = clone(job); mutate(draft); assert.throws(() => checkMatrix(draft));
}
const dependabot = YAML.parse(read(".github/dependabot.yml"));
checkDependencies(dependabot);
const missingNpm = clone(dependabot);
missingNpm.updates = missingNpm.updates.filter(item => item["package-ecosystem"] !== "npm");
assert.throws(() => checkDependencies(missingNpm));
for (const file of ["validate-config.yml", "validate-health-checks.yml"]) {
  const config = YAML.parse(read(".github/workflows/" + file));
  for (const event of ["push", "pull_request"]) for (const entry of [
    ".github/scripts/validate_compatibility.cjs", ".github/dependabot.yml",
  ]) assert(config.on[event].paths.includes(entry), "依赖/兼容性回归修改不可漏检");
}
console.log("YAML " + version + " 锁定/alias、双内核与共同 DNS 的 CI 契约、npm 更新覆盖、8 个负向控制 OK");
