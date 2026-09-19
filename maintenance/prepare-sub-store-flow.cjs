// Pure candidate builder. No network, database writes, deployment or service control.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const PINNED_UPSTREAM = '8eeaaa87878e17b102922bc9145fd5d725b56c832bbcbfc13bb762ef02837d21';
function prepare(original, expectedHash, sourceName, cacheKey) {
  if (Buffer.byteLength(original) > 65536) throw Error('input exceeds 64 KiB');
  if (!/^[a-f0-9]{64}$/.test(expectedHash) || crypto.createHash('sha256').update(original).digest('hex') !== expectedHash) throw Error('reviewed input hash mismatch');
  if (typeof sourceName !== 'string' || !sourceName.trim() || sourceName.length > 128 || /[\r\n]/.test(sourceName)) throw Error('invalid source name');
  if (!/^[a-z0-9:_-]{1,64}$/.test(cacheKey)) throw Error('invalid cache slot');
  let helper = fs.readFileSync(path.join(__dirname, 'sub-store-flow-fallback.js'), 'utf8');
  helper = helper.replace("'__FLOW_SOURCE__'", JSON.stringify(sourceName)).replace("'__FLOW_CACHE__'", JSON.stringify(cacheKey));
  const replace = (before, after) => {
    if (original.split(before).length !== 2) throw Error('unknown or ambiguous upstream layout');
    original = original.replace(before, after);
  };
  replace('parseFlowHeaders, getFlowHeaders, normalizeFlowHeader', 'parseFlowHeaders, getFlowHeaders: originalGetFlowHeaders, normalizeFlowHeader');
  replace('  const subnames =', helper + '\n  const subnames =');
  replace('  return proxies', `  if ($options && flowCacheStatus) {
    const h = $options._res.headers;
    h['x-substore-flower-flow-state'] = flowCacheStatus.state;
    h['x-substore-flower-flow-observed-at'] = flowCacheStatus.observedAt ? new Date(flowCacheStatus.observedAt).toISOString() : 'unknown';
    if (flowCacheStatus.state === 'stale') h['plan-name'] = 'Includes cached flower quota: ' + h['x-substore-flower-flow-observed-at'];
  }
  return proxies`);
  new Function(original + '\nreturn operator');
  return original;
}
if (require.main === module) {
  try {
    if (process.argv.length !== 5) throw Error('usage: node prepare-sub-store-flow.cjs REVIEWED_SHA256 SOURCE_NAME CACHE_SLOT < sum.js');
    // Read at most one byte beyond the bound; never consume unbounded stdin.
    const buffer = Buffer.alloc(65537); let size = 0, count;
    while (size < buffer.length && (count = fs.readSync(0, buffer, size, buffer.length - size, null))) size += count;
    process.stdout.write(prepare(buffer.subarray(0, size).toString('utf8'), ...process.argv.slice(2)));
  } catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
module.exports = { prepare, PINNED_UPSTREAM };
