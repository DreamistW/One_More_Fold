const isPosture = value => value === 'folded' || value === 'continuous';

// Feature-detect actual posture signals, never infer folds from viewport resizing.
export function detectPostureSource(env = globalThis) {
  if(!env.isSecureContext) return {availability:'insecure'};
  try {
    const posture=env.navigator?.devicePosture;
    if(posture && isPosture(posture.type) && typeof posture.addEventListener === 'function') {
      return {availability:'available',source:'api',read:()=>posture.type,
        subscribe:callback=>{
          posture.addEventListener('change',callback);
          return ()=>posture.removeEventListener('change',callback);
        }};
    }
  } catch { /* Some browser configurations expose an inaccessible API. */ }
  try {
    const folded=env.matchMedia?.('(device-posture: folded)');
    const continuous=env.matchMedia?.('(device-posture: continuous)');
    // Unknown media features may preserve their query string. Require one of
    // the two complementary supported values to match before enabling fallback.
    if((folded?.matches || continuous?.matches) && typeof folded.addEventListener === 'function') {
      return {availability:'available',source:'media',read:()=>folded.matches?'folded':continuous.matches?'continuous':null,
        subscribe:callback=>{
          folded.addEventListener('change',callback);
          continuous.addEventListener('change',callback);
          return ()=>{
            folded.removeEventListener('change',callback);
            continuous.removeEventListener('change',callback);
          };
        }};
    }
  } catch { /* Unsupported browsers retain manual controls. */ }
  return {availability:'unsupported'};
}

export class PhysicalFoldControl {
  constructor({source=detectPostureSource(),document:doc=globalThis.document,
    canPlay=()=>true,onCycle=()=>{},onState=()=>{},debounceMs=180,
    schedule=setTimeout,cancel=clearTimeout}={}) {
    this.source=source;this.document=doc;this.canPlay=canPlay;
    this.onCycle=onCycle;this.onState=onState;
    this.schedule=schedule;this.cancel=cancel;this.debounceMs=debounceMs;
    this.enabled=source.availability === 'available';
    this.armed=false;this.posture=null;this.pending=null;this.destroyed=false;
    this.onChange=()=>this.queue();this.onVisibility=()=>this.reset();
    if(this.enabled) {
      try { this.unsubscribe=source.subscribe(this.onChange); }
      catch { this.source={availability:'error'};this.enabled=false; }
    }
    this.document?.addEventListener('visibilitychange',this.onVisibility);
    this.reset();
  }
  get snapshot() {
    return {availability:this.source.availability,source:this.source.source??null,
      enabled:this.enabled,posture:this.posture,armed:this.armed,hidden:!!this.document?.hidden};
  }
  emit() { this.onState(this.snapshot); }
  clearPending() { if(this.pending !== null) this.cancel(this.pending);this.pending=null; }
  read() {
    try { const type=this.source.read?.();return isPosture(type)?type:null; }
    catch { this.source={availability:'error'};this.enabled=false;return null; }
  }
  reset() {
    this.clearPending();this.armed=false;this.posture=this.read();this.emit();
  }
  setEnabled(enabled) {
    this.enabled=!!enabled && this.source.availability === 'available';this.reset();
  }
  queue() {
    if(this.destroyed) return;
    this.clearPending();
    if(!this.enabled || this.document?.hidden || !this.canPlay()) { this.reset();return; }
    this.pending=this.schedule(()=>{
      this.pending=null;
      if(!this.enabled || this.document?.hidden || !this.canPlay()) { this.reset();return; }
      const next=this.read(), previous=this.posture;
      if(!next) { this.armed=false;this.emit();return; }
      if(next === previous) return;
      this.posture=next;
      let trigger=false;
      if(next === 'folded') this.armed=previous === 'continuous';
      else { trigger=this.armed && previous === 'folded';this.armed=false; }
      this.emit();
      if(trigger) this.onCycle();
    },this.debounceMs);
  }
  destroy() {
    this.destroyed=true;this.clearPending();this.unsubscribe?.();
    this.document?.removeEventListener('visibilitychange',this.onVisibility);
  }
}
