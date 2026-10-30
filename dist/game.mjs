export const DEFAULT_PROBABILITY = 0.01;
export const DURATIONS = Object.freeze({ fold: 600, hold: 150, unfold: 600, shake: 450 });

function validateProbability(value) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('概率必须介于 0 与 1 之间');
  return value;
}

export class FoldGame {
  constructor({ probability = DEFAULT_PROBABILITY, random = Math.random,
    wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
    onChange = () => {}, durations = DURATIONS } = {}) {
    this.random = random;
    this.wait = wait;
    this.onChange = onChange;
    this.durations = { ...DURATIONS, ...durations };
    this.generation = 0;
    this.reset(probability);
  }

  get snapshot() {
    return { phase: this.phase, score: this.score, probability: this.probability };
  }

  emit(phase) {
    this.phase = phase;
    this.onChange(this.snapshot);
  }

  reset(probability = this.probability) {
    this.probability = validateProbability(probability);
    this.generation += 1;
    this.score = 0;
    this.emit('ready');
  }

  async cycle() {
    if (this.phase !== 'ready') return false;
    const generation = this.generation;
    const pause = async (phase, duration) => {
      this.emit(phase);
      await this.wait(duration);
      return generation === this.generation;
    };
    if (!await pause('folding', this.durations.fold)) return false;
    if (!await pause('closed', this.durations.hold)) return false;
    if (!await pause('unfolding', this.durations.unfold)) return false;

    // Exactly one independent draw, only after the inner display has reopened.
    const failed = this.random() < this.probability;
    if (failed) {
      if (!await pause('damaged', this.durations.shake)) return false;
      this.emit('gameover');
    } else {
      this.score += 1;
      this.emit('ready');
    }
    return true;
  }
}
