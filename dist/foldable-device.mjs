const QUERIES = [
  '(device-posture: folded)',
  '(horizontal-viewport-segments: 2)',
  '(vertical-viewport-segments: 2)'
];

function mediaQueries(env) {
  return QUERIES.flatMap(query=>{
    try { const media=env.matchMedia?.(query);return media?[media]:[]; }
    catch { return []; }
  });
}

function hasEvidence(env, queries) {
  try { if(env.navigator?.devicePosture?.type === 'folded') return true; } catch { /* Try the other signals. */ }
  try { if(env.viewport?.segments?.length > 1) return true; } catch { /* May be unavailable. */ }
  return queries.some(query=>query.matches);
}

export function isFoldableDevice(env = globalThis) {
  return hasEvidence(env,mediaQueries(env));
}

export function watchFoldableDevice(onChange, {env=globalThis}={}) {
  const queries=mediaQueries(env),cleanups=[];
  let confirmed=false,stopped=false;
  const check=()=>{
    if(stopped || confirmed || env.document?.hidden) return;
    if(hasEvidence(env,queries)) { confirmed=true;onChange(true); }
  };
  const listen=(target,event)=>{
    if(typeof target?.addEventListener !== 'function') return;
    target.addEventListener(event,check);
    cleanups.push(()=>target.removeEventListener(event,check));
  };
  for(const query of queries) listen(query,'change');
  try { listen(env.navigator?.devicePosture,'change'); } catch { /* No exposed API. */ }
  // Resizing only prompts a fresh segment query; dimensions are never evidence.
  listen(env,'resize');listen(env,'pageshow');listen(env,'focus');
  listen(env.document,'visibilitychange');
  onChange(false);
  check();
  return ()=>{stopped=true;cleanups.forEach(cleanup=>cleanup());};
}
