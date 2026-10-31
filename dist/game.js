export const DEFAULT_PROBABILITY = 0.01;
export const MIN_TABLE_PROBABILITY = 0.02;
export const DEFAULT_TABLE_PROBABILITY = MIN_TABLE_PROBABILITY;
export const MIN_DROP_PROBABILITY = 0.20;
export const DEFAULT_DROP_PROBABILITY = MIN_DROP_PROBABILITY;
// One unit adds 0.001 percentage points. All successful actions share this wear.
export const WEAR_UNITS_PER_PROBABILITY = 100000;
export const WEAR_INCREMENTS = Object.freeze({ fold: 1, table: 5, drop: 100 });
export const DURATIONS = Object.freeze({ fold: 600, hold: 150, unfold: 600, shake: 450, place: 700, lift: 600, drop: 900, floorLift: 800 });

export function probabilityWithWear(base, wearUnits) {
  // Preserve deterministic 0% and 100% test settings.
  if (base === 0 || base === 1) return base;
  return Math.min(1, (base * WEAR_UNITS_PER_PROBABILITY + wearUnits) / WEAR_UNITS_PER_PROBABILITY);
}

function validateProbability(value, minimum = 0) {
  if (!Number.isFinite(value) || value < minimum || value > 1) throw new RangeError(`概率必须介于 ${minimum} 与 1 之间`);
  return value;
}

export class FoldGame {
  constructor({ probability = DEFAULT_PROBABILITY, tableProbability = DEFAULT_TABLE_PROBABILITY, dropProbability = DEFAULT_DROP_PROBABILITY, random = Math.random,
    wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
    onChange = () => {}, durations = DURATIONS } = {}) {
    this.random = random;
    this.wait = wait;
    this.onChange = onChange;
    this.durations = { ...DURATIONS, ...durations };
    this.generation = 0;
    this.reset(probability, tableProbability, dropProbability);
  }

  get snapshot() {
    return { phase: this.phase, score: this.score, probability: this.probability,
      tableProbability: this.tableProbability, onTable: this.onTable,
      dropProbability: this.dropProbability, onFloor: this.onFloor };
  }

  emit(phase) {
    this.phase = phase;
    this.onChange(this.snapshot);
  }

  reset(probability = this.probability, tableProbability = this.tableProbability, dropProbability = this.dropProbability) {
    const nextProbability = validateProbability(probability);
    const nextTableProbability = validateProbability(tableProbability, MIN_TABLE_PROBABILITY);
    const nextDropProbability = validateProbability(dropProbability, MIN_DROP_PROBABILITY);
    this.probability = nextProbability;
    this.tableProbability = nextTableProbability;
    this.dropProbability = nextDropProbability;
    this.generation += 1;
    this.score = 0;
    this.wearUnits = 0;
    this.onTable = false;
    this.onFloor = false;
    this.emit('ready');
  }

  async cycle() {
    if (this.phase !== 'ready' || this.onTable || this.onFloor) return false;
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
    const failed = this.random() < probabilityWithWear(this.probability, this.wearUnits);
    if (failed) {
      if (!await pause('damaged', this.durations.shake)) return false;
      this.emit('gameover');
    } else {
      this.score += 1;
      this.addWear('fold');
      this.emit('ready');
    }
    return true;
  }

  async putDown() {
    if (this.phase !== 'ready' || this.onTable || this.onFloor) return false;
    const generation = this.generation;
    this.onTable = true;
    this.emit('placing');
    await this.wait(this.durations.place);
    if (generation !== this.generation) return false;
    if (this.random() < probabilityWithWear(this.tableProbability, this.wearUnits)) {
      this.emit('damaged');
      await this.wait(this.durations.shake);
      if (generation !== this.generation) return false;
      this.emit('gameover');
    } else {
      this.score += 2;
      this.addWear('table');
      this.emit('onTable');
    }
    return true;
  }

  async pickUp() {
    const fromFloor = this.phase === 'onFloor' && this.onFloor;
    if (!fromFloor && (this.phase !== 'onTable' || !this.onTable)) return false;
    const generation = this.generation;
    this.onTable = false;
    this.onFloor = false;
    this.emit(fromFloor ? 'liftingFloor' : 'lifting');
    await this.wait(fromFloor ? this.durations.floorLift : this.durations.lift);
    if (generation !== this.generation) return false;
    this.emit('ready');
    return true;
  }

  async drop() {
    if (this.phase !== 'ready' || this.onTable || this.onFloor) return false;
    const generation = this.generation;
    this.onFloor = true;
    this.emit('dropping');
    await this.wait(this.durations.drop);
    if (generation !== this.generation) return false;
    if (this.random() < probabilityWithWear(this.dropProbability, this.wearUnits)) {
      this.emit('damaged');
      await this.wait(this.durations.shake);
      if (generation !== this.generation) return false;
      this.emit('gameover');
    } else {
      this.score += 20;
      this.addWear('drop');
      this.emit('onFloor');
    }
    return true;
  }

  addWear(action) {
    this.wearUnits = Math.min(WEAR_UNITS_PER_PROBABILITY, this.wearUnits + WEAR_INCREMENTS[action]);
  }
}
