export const THEME_KEY='one-more-fold-theme';
export const normalizeTheme=value=>['dark','light','system'].includes(value)?value:'system';
export const resolveTheme=(preference,systemDark)=>normalizeTheme(preference)==='system'?(systemDark?'dark':'light'):preference;

export class ThemeController {
  constructor({env=globalThis,onChange=()=>{}}={}) {
    this.env=env;this.onChange=onChange;
    try { this.storage=env.localStorage; } catch { this.storage=null; }
    this.media=env.matchMedia?.('(prefers-color-scheme: dark)')??{matches:false};
    this.preference=this.readPreference();
    this.onSystemChange=()=>{if(this.preference==='system') this.emit();};
    this.onStorage=event=>{
      if(event.key!==THEME_KEY && event.key!==null) return;
      if(event.storageArea && event.storageArea!==this.storage) return;
      this.preference=event.key===null?this.readPreference():normalizeTheme(event.newValue);
      this.emit();
    };
    this.media.addEventListener?.('change',this.onSystemChange);
    env.addEventListener?.('storage',this.onStorage);
    this.emit();
  }
  readPreference() {
    try { return normalizeTheme(this.storage?.getItem(THEME_KEY)); } catch { return 'system'; }
  }
  get snapshot() { return {preference:this.preference,resolved:resolveTheme(this.preference,this.media.matches)}; }
  emit() { this.onChange(this.snapshot); }
  setPreference(preference) {
    this.preference=normalizeTheme(preference);
    try { this.storage?.setItem(THEME_KEY,this.preference); } catch { /* Apply for this visit anyway. */ }
    this.emit();
  }
  destroy() {
    this.media.removeEventListener?.('change',this.onSystemChange);
    this.env.removeEventListener?.('storage',this.onStorage);
  }
}
