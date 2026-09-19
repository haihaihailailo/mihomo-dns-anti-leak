// Inserted into the pinned xream sum.js operator. Only the configured source uses fallback.
const fallbackName = '__FLOW_SOURCE__';
const fallbackKey = '__FLOW_CACHE__';
const maxAge = 7 * 86400000;
let flowCacheStatus;
async function getFlowHeaders(...args) {
  const source = allSubs.find(s => s.name === fallbackName);
  const sourceUrl = String(source?.url || '').split(/[\r\n]+/)[0].split('#')[0];
  if (!sourceUrl || args[0]?.split('#')[0] !== sourceUrl || args[4]) {
    return originalGetFlowHeaders(...args);
  }
  const settings = $.read('settings') || {};
  const defaultUA = originalGetFlowHeaders.toString().match(/clash\.meta\/v[\d.]+/)?.[0];
  if (!args[1] && !settings.defaultFlowUserAgent && !defaultUA) throw new Error('Flow cache: unsupported backend');
  const ua = args[1] || settings.defaultFlowUserAgent || defaultUA;
  // Preserve native per-source flow headers, which upstream sum.js omits.
  const fragment = String(source.url).split('#')[1];
  let sourceArgs = {};
  if (fragment) {
    try { sourceArgs = JSON.parse(decodeURIComponent(fragment)); }
    catch { sourceArgs = Object.fromEntries(fragment.split('&').map(p => { const i = p.indexOf('='); return [i < 0 ? p : p.slice(0, i), i < 0 ? true : decodeURIComponent(p.slice(i + 1))]; })); }
  }
  const headerArg = sourceArgs.flowHeaders || sourceArgs.headers;
  let normalizedHeaders;
  if (headerArg) {
    const headers = typeof headerArg === 'string' ? JSON.parse(headerArg) : headerArg;
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) throw new Error('Flow cache: invalid headers');
    normalizedHeaders = { 'user-agent': ua };
    for (const key of Object.keys(headers)) normalizedHeaders[key.toLowerCase()] = headers[key];
    args[5] = headerArg;
  }
  const fingerprint = require('crypto').createHash('md5').update((normalizedHeaders ? JSON.stringify(normalizedHeaders) : ua) + sourceUrl).digest('hex');
  const ttl = Number(settings.headersCacheTtl || 900) * 1000;
  function valid(value) {
    if (typeof value !== 'string' || value.length > 4096) return false;
    return ['upload', 'download', 'total'].every(k => {
      const matches = [...value.matchAll(new RegExp('(?:^|;)\\s*' + k + '=(\\d+)\\s*(?=;|$)', 'g'))];
      return matches.length === 1 && Number.isSafeInteger(Number(matches[0][1]));
    });
  }
  function usable(entry) {
    if (!entry || entry.fingerprint !== fingerprint || !valid(entry.flow)) return false;
    const age = Date.now() - entry.observedAt;
    const expiry = entry.flow.match(/(?:^|;)\s*expire=(\d+)/)?.[1];
    return Number.isFinite(age) && age >= 0 && age < maxAge && (!expiry || +expiry === 0 || +expiry * 1000 > Date.now());
  }
  function nativeEntry() {
    try {
      const entry = JSON.parse($.read('#sub-store-cached-headers-resource') || '{}')[fingerprint];
      return entry && { fingerprint, flow: entry.data, observedAt: entry.time - ttl };
    } catch { return undefined; }
  }
  let saved = scriptResourceCache.get(fallbackKey);
  const nativeBefore = nativeEntry();
  if (usable(nativeBefore) && (!usable(saved) || nativeBefore.observedAt > saved.observedAt)) saved = nativeBefore;
  let fresh;
  try { fresh = await originalGetFlowHeaders(...args); } catch { /* Bound fallback below; no credential-bearing error text. */ }
  let selected;
  if (valid(fresh)) {
    const nativeAfter = nativeEntry();
    selected = usable(nativeAfter) && nativeAfter.flow === fresh ? nativeAfter :
      { fingerprint, flow: fresh, observedAt: Date.now() };
    flowCacheStatus = { state: 'available', observedAt: selected.observedAt };
  } else if (usable(saved)) {
    selected = saved;
    flowCacheStatus = { state: 'stale', observedAt: selected.observedAt };
    $.info('[flow-cache] source=flower state=stale observedAt=' + new Date(selected.observedAt).toISOString());
  } else {
    flowCacheStatus = { state: 'unavailable', observedAt: 0 };
    $.error('[flow-cache] source=flower state=unavailable; no valid last-good quota within 7 days');
    return undefined;
  }
  const remaining = maxAge - (Date.now() - selected.observedAt);
  if (remaining > 0) scriptResourceCache.set(fallbackKey, selected, remaining);
  return selected.flow;
}
