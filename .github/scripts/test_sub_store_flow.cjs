// Synthetic in-memory checks only; invoked by validate_health_checks.py.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { prepare } = require('../../maintenance/prepare-sub-store-flow.cjs');
const helper = fs.readFileSync(path.join(__dirname, '../../maintenance/sub-store-flow-fallback.js'), 'utf8');
const now = Date.now(), day = 86400000, url = 'https://example.invalid/sub';
const flow = 'upload=10; download=20; total=150';
const hash = text => crypto.createHash('md5').update(text).digest('hex');
async function run({saved, native, fresh, headers, failure=true, other=false}={}) {
  const logs=[], writes=[], calls=[], db={settings:{headersCacheTtl:900}};
  const fingerprint=hash((headers ? JSON.stringify({'user-agent':headers['User-Agent'],accept:headers.Accept}) : 'clash.meta/v1.19.31')+url);
  db['#sub-store-cached-headers-resource']=JSON.stringify(native?{[fingerprint]:native}:{});
  async function originalGetFlowHeaders(input,ua,timeout,proxy,flowUrl,headerArg) {
    const defaultUA='clash.meta/v1.19.31'; calls.push(input);
    if (input!==url) return 'other untouched';
    if(headers) assert.deepEqual(JSON.parse(headerArg),headers);
    if(failure) throw Error('private error must not be logged');
    if(fresh) db['#sub-store-cached-headers-resource']=JSON.stringify({[fingerprint]:{data:fresh,time:Date.now()+900000}});
    return fresh;
  }
  const source={name:'__FLOW_SOURCE__',url:url+(headers?'#'+encodeURIComponent(JSON.stringify({headers:JSON.stringify(headers)})):'')};
  const api={read:k=>db[k],info:s=>logs.push(s),error:s=>logs.push(s)};
  const cache={get:()=>saved,set:(k,v,ttl)=>writes.push({k,v,ttl})};
  const wrapper=new Function('$','allSubs','originalGetFlowHeaders','scriptResourceCache','require',helper+'\nreturn async (...args) => ({flow:await getFlowHeaders(...args),state:flowCacheStatus});')(api,[source],originalGetFlowHeaders,cache,require);
  const result=await wrapper(other?'https://example.invalid/other':url);
  assert(!logs.join('').includes('private error'));
  return {...result,writes,calls,fingerprint};
}
(async()=>{
  let r=await run({native:{data:flow,time:now-3600000+900000}});
  assert.equal(r.flow,flow);assert.equal(r.state.state,'stale');assert.equal(r.writes[0].v.observedAt,now-3600000);
  const saved=r.writes[0].v;
  r=await run({saved});assert.equal(r.flow,flow);assert.equal(r.writes[0].v.observedAt,saved.observedAt);assert(r.writes[0].ttl<7*day-3599000);
  r=await run({saved,failure:false,fresh:'upload=20; download=30; total=200'});assert.equal(r.state.state,'available');assert.match(r.flow,/total=200/);
  for(const item of [undefined,{...saved,observedAt:now-8*day},{...saved,observedAt:now+day},{...saved,fingerprint:'different'},
    {...saved,flow:'upload=1; download=NaN; total=150'},{...saved,flow:flow+'; expire=1'},{...saved,flow:flow+'; total=150'}]) {
    r=await run({saved:item});assert.equal(r.flow,undefined);assert.equal(r.state.state,'unavailable');assert.equal(r.writes.length,0);
  }
  r=await run({saved,other:true});assert.equal(r.flow,'other untouched');assert.equal(r.writes.length,0);
  r=await run({failure:false,fresh:flow,headers:{'User-Agent':'configured-client',Accept:'application/json'}});
  assert.equal(r.writes[0].v.fingerprint,r.fingerprint);assert.equal(r.state.state,'available');
  // Independently authored builder fixture, not a bundled third-party script.
  const fixture=`async function operator(proxies) {\n const {parseFlowHeaders, getFlowHeaders, normalizeFlowHeader}=flowUtils;\n  const subnames = [];\n  return proxies\n}`;
  const sha=crypto.createHash('sha256').update(fixture).digest('hex');
  const candidate=prepare(fixture,sha,'A "quoted" source','test-flow-v1');assert(candidate.includes('A \\"quoted\\" source'));
  assert.throws(()=>prepare(fixture,'0'.repeat(64),'test','test'),/hash/);
  assert.throws(()=>prepare(fixture,sha,'test','../bad'),/slot/);
  const doubled=fixture+'\n  return proxies';const sha2=crypto.createHash('sha256').update(doubled).digest('hex');
  assert.throws(()=>prepare(doubled,sha2,'test','test'),/ambiguous/);
  console.log('Sub-Store bounded flow fallback checks PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
