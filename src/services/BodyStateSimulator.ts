// src/services/BodyStateSimulator.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real-Time Body State Simulation Engine
//
// Maintains a continuously evolving internal state that:
//   1. Updates from new sensor readings (real measurements)
//   2. Interpolates between ML inference calls (smooth display)
//   3. Applies biologically inspired dynamics:
//      - Exponential decay toward baselines
//      - Lag buffers for glucose absorption delay
//      - Circadian rhythm modulation
//      - Cross-state coupling (stress → BP, glucose → energy)
//
// state(t+1) = f(state(t), sensorInputs(t), modelPrediction(t))
// ─────────────────────────────────────────────────────────────────────────────

import type { RiskPrediction } from './ModelService';
import type { RawSensorData } from './FeatureEngineeringService';

// ── State types ───────────────────────────────────────────────────────────────

export interface BodyState {
  glucose:    number;   // 0–1 (0.45 ≈ fasting baseline)
  stress:     number;   // 0–1
  bp:         number;   // 0–1 (0.35 ≈ resting baseline)
  energy:     number;   // 0–1
  timestamp:  number;   // unix ms
}

export interface StateHistory {
  timestamps: number[];
  glucose:    number[];
  stress:     number[];
  bp:         number[];
  energy:     number[];
}

// ── Dynamics constants ────────────────────────────────────────────────────────

const GLUCOSE_BASAL  = 0.45;
const BP_BASAL       = 0.35;
const ENERGY_BASAL   = 0.55;
const STRESS_BASAL   = 0.20;

const GLUCOSE_DECAY  = 0.9985;
const STRESS_DECAY   = 0.985;
const BP_DECAY       = 0.995;
const ENERGY_DECAY   = 0.9992;

const MAX_HISTORY    = 1440; // 24 hours at 1-min resolution

// ── BodyStateSimulator ────────────────────────────────────────────────────────

class BodyStateSimulator {
  private state: BodyState;
  private history: StateHistory;
  private glucoseLagBuffer: number[];
  private readonly LAG_MINUTES = 15;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: ((state: BodyState) => void)[] = [];

  constructor() {
    this.state = {
      glucose:   GLUCOSE_BASAL,
      stress:    STRESS_BASAL,
      bp:        BP_BASAL,
      energy:    ENERGY_BASAL,
      timestamp: Date.now(),
    };

    this.history = {
      timestamps: [],
      glucose: [],
      stress:  [],
      bp:      [],
      energy:  [],
    };

    // Initialize glucose lag buffer with zeros
    this.glucoseLagBuffer = new Array(this.LAG_MINUTES).fill(0);
  }

  /**
   * Start continuous simulation at 1-minute intervals.
   * Call from app foreground startup.
   */
  start(sensors: () => RawSensorData): void {
    if (this.intervalId) this.stop();

    this.intervalId = setInterval(() => {
      const raw = sensors();
      this.tick(raw);
    }, 60_000); // 1-minute ticks

    // Run first tick immediately
    try {
      const raw = sensors();
      this.tick(raw);
    } catch (e) {
      // Sensor data may not be ready on first tick
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Advance simulation by one timestep using current sensor data.
   * Called every minute, or on-demand when new data arrives.
   */
  tick(raw: RawSensorData, modelPred?: RiskPrediction): void {
    const now  = new Date(raw.currentTimestamp);
    const hour = now.getHours() + now.getMinutes() / 60;

    const noise = () => (Math.random() - 0.5) * 0.006;

    // ── Derive per-tick inputs from sensor data ─────────────────────────────
    const actNorm    = clamp(raw.stepCount / 500, 0, 1);          // activity this minute
    const sleepNow   = this.inferSleepState(raw);                 // 0 or 1
    const screenNow  = clamp(raw.screenOnMinutesLastHour / 60, 0, 1);
    const typingNow  = screenNow * 0.6; // approximation

    // ── 1. GLUCOSE ──────────────────────────────────────────────────────────
    // Absorbed glucose from meal — push new carb into lag buffer
    const minsLastMeal    = (Date.now() - raw.lastMealTime) / 60000;
    const mealIntakeNow   = minsLastMeal < 60 && minsLastMeal >= 0
      ? (raw.carbsLastMeal * 0.0035 + raw.sugarLastMeal * 0.0046) / 60
      : 0;

    // Shift lag buffer — oldest value comes out, new intake goes in
    const absorbed = this.glucoseLagBuffer.shift() ?? 0;
    this.glucoseLagBuffer.push(mealIntakeNow);

    let glucose = this.state.glucose * GLUCOSE_DECAY;
    glucose += absorbed;
    glucose -= actNorm * 0.010 * this.state.glucose; // activity clears glucose
    glucose += this.circadian(hour, 'glucose');       // dawn phenomenon
    glucose = clamp(glucose + noise(), 0.10, 1.0);

    // Blend with model prediction if available
    if (modelPred) {
      const sugarTarget = 0.45 + modelPred.sugarSpikeRisk * 0.40;
      glucose = lerp(glucose, sugarTarget, 0.08); // slow pull toward prediction
    }

    // ── 2. STRESS ───────────────────────────────────────────────────────────
    let stress = this.state.stress * STRESS_DECAY;
    stress += screenNow * 0.008;
    stress += typingNow * 0.005;
    stress += Math.max(0, glucose - 0.70) * 0.004;
    stress -= sleepNow    * 0.015;
    stress -= actNorm     * 0.010;
    stress += this.circadian(hour, 'stress');
    stress = clamp(stress + noise(), 0.0, 1.0);

    if (modelPred) {
      stress = lerp(stress, modelPred.stressLevel, 0.10);
    }

    // ── 3. BLOOD PRESSURE ───────────────────────────────────────────────────
    // BP changes slowly — mean-reverts with stress and activity coupling
    let bp = this.state.bp * BP_DECAY + (1 - BP_DECAY) * BP_BASAL;
    bp += stress  * 0.004;
    bp -= actNorm * 0.003;
    bp += Math.max(0, glucose - 0.75) * 0.002;
    bp = clamp(bp + noise() * 0.5, 0.10, 1.0);

    if (modelPred) {
      bp = lerp(bp, modelPred.bpTrendRisk, 0.06);
    }

    // ── 4. ENERGY ───────────────────────────────────────────────────────────
    let energy = this.state.energy * ENERGY_DECAY;
    energy += sleepNow  * 0.020;
    energy -= actNorm   * 0.008;
    energy -= stress    * 0.005;
    energy += Math.max(0, glucose - GLUCOSE_BASAL) * 0.012; // post-meal boost
    energy += this.circadian(hour, 'energy');
    energy = clamp(energy + noise(), 0.0, 1.0);

    // ── Commit new state ────────────────────────────────────────────────────
    this.state = { glucose, stress, bp, energy, timestamp: raw.currentTimestamp };

    // Append to history (ring buffer)
    this.history.timestamps.push(raw.currentTimestamp);
    this.history.glucose.push(glucose);
    this.history.stress.push(stress);
    this.history.bp.push(bp);
    this.history.energy.push(energy);

    // Prune to MAX_HISTORY
    if (this.history.timestamps.length > MAX_HISTORY) {
      (Object.keys(this.history) as (keyof StateHistory)[]).forEach(k => {
        (this.history[k] as number[]).shift();
      });
    }

    // Notify subscribers
    this.listeners.forEach(fn => fn({ ...this.state }));
  }

  /**
   * Force-update state from a fresh model prediction.
   * Call after each ML inference to anchor the simulation.
   */
  applyPrediction(pred: RiskPrediction): void {
    const sugarTarget = 0.45 + pred.sugarSpikeRisk * 0.40;
    this.state = {
      ...this.state,
      glucose: lerp(this.state.glucose, sugarTarget,        0.15),
      stress:  lerp(this.state.stress,  pred.stressLevel,   0.15),
      bp:      lerp(this.state.bp,      pred.bpTrendRisk,   0.12),
      energy:  lerp(this.state.energy,  1 - pred.stressLevel * 0.6, 0.10),
    };
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────

  subscribe(fn: (state: BodyState) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  getState(): BodyState {
    return { ...this.state };
  }

  getHistory(): StateHistory {
    return { ...this.history };
  }

  /**
   * Get the last N minutes of history as arrays ready for charting.
   */
  getRecentHistory(minutes = 60): StateHistory {
    const len   = this.history.timestamps.length;
    const start = Math.max(0, len - minutes);
    return {
      timestamps: this.history.timestamps.slice(start),
      glucose:    this.history.glucose.slice(start),
      stress:     this.history.stress.slice(start),
      bp:         this.history.bp.slice(start),
      energy:     this.history.energy.slice(start),
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private inferSleepState(raw: RawSensorData): number {
    const msSinceActive = Date.now() - raw.lastActiveTime;
    const hoursSinceActive = msSinceActive / (1000 * 3600);
    // Likely asleep if no movement for 45+ minutes during night hours
    const hour = new Date().getHours();
    const nightTime = hour >= 22 || hour <= 7;
    return (nightTime && hoursSinceActive > 0.75) ? 1 : 0;
  }

  private circadian(hour: number, component: 'stress' | 'energy' | 'glucose'): number {
    const phase = (2 * Math.PI * hour) / 24;
    switch (component) {
      case 'stress':  return 0.025 * Math.sin(phase - 0.77) + 0.008 * Math.sin(2 * phase);
      case 'energy':  return 0.035 * Math.cos(phase - 1.5)  - 0.018 * Math.cos(2 * phase - 3.5);
      case 'glucose': return 0.012 * Math.exp(-Math.pow(hour - 6, 2) / (2 * 2 * 2));
      default:        return 0;
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const bodyStateSimulator = new BodyStateSimulator();
export default bodyStateSimulator;
