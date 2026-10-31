export const HIGH_SCORE_COOKIE = 'one-more-fold-best';
export const HIGH_SCORE_MAX_AGE = 365 * 24 * 60 * 60;

export function readHighScore(cookie) {
  const entry = String(cookie).split(';').map(part => part.trim())
    .find(part => part.startsWith(`${HIGH_SCORE_COOKIE}=`));
  if (!entry) return null;
  const value = entry.slice(HIGH_SCORE_COOKIE.length + 1);
  if (!/^\d+$/.test(value)) return null;
  const score = Number(value);
  return Number.isSafeInteger(score) ? score : null;
}

export class HighScoreStore {
  constructor({ readCookie = () => document.cookie,
    writeCookie = value => { document.cookie = value; },
    secure = globalThis.location?.protocol === 'https:' } = {}) {
    this.readCookie = readCookie;
    this.writeCookie = writeCookie;
    this.secure = secure;
    const stored = this.read();
    this.best = stored ?? 0;
    if (stored === null) this.save();
  }

  read() {
    try { return readHighScore(this.readCookie()); }
    catch { return null; }
  }

  save() {
    try {
      this.writeCookie(`${HIGH_SCORE_COOKIE}=${this.best}; Max-Age=${HIGH_SCORE_MAX_AGE}; Path=/; SameSite=Lax${this.secure ? '; Secure' : ''}`);
    } catch { /* Keep this visit's record when cookies are unavailable. */ }
  }

  record(score) {
    if (!Number.isSafeInteger(score) || score < 0) throw new RangeError('分数必须为非负安全整数');
    // Another tab may have finished a higher-scoring game since this one started.
    this.best = Math.max(this.best, this.read() ?? 0);
    const isNewRecord = score > this.best;
    if (isNewRecord) {
      this.best = score;
      this.save();
    }
    return { best: this.best, isNewRecord };
  }
}
