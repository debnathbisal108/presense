// src/services/FeatureEngineeringService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Feature Engineering Pipeline
//
// Converts raw device sensor data into the 16 normalized features
// expected by the pre-trained on-device model.
//
// Feature order matches FEATURE_ORDER in ModelService.ts exactly.
// ─────────────────────────────────────────────────────────────────────────────

import { format } from 'date-fns';

// ── Raw sensor data types ─────────────────────────────────────────────────────

export interface RawSensorData {
  // From HealthKit / Google Fit
  stepCount:         number;    // steps in last hour
  stepCountToday:    number;    // steps today
  heartRate:         number;    // bpm (0 if unavailable)
  activeEnergy:      number;    // kcal burned today

  // From Accelerometer
  accelerometerX:    number;
  accelerometerY:    number;
  accelerometerZ:    number;
  motionSamples:     number[];  // last 60 magnitude readings

  // Inferred sleep
  lastActiveTime:    number;    // unix ms of last detected movement
  sleepStartEst:     number;    // unix ms estimated sleep start
  sleepEndEst:       number;    // unix ms estimated sleep end

  // App usage (from UsageStatsManager / Screen Time API)
  screenOnMinutesToday: number; // total screen-on minutes today
  screenOnMinutesLastHour: number;

  // Meal / nutrition (manual input from user, stored in AsyncStorage)
  lastMealTime:      number;    // unix ms
  carbsLastMeal:     number;    // grams
  sugarLastMeal:     number;    // grams

  // Water intake (manual input)
  waterTodayLiters:  number;

  // Time context
  currentTimestamp:  number;    // unix ms
}

// ── Engineered feature vector ─────────────────────────────────────────────────

export interface FeatureVector {
  activityLevel:        number;   // 0–1: physical activity intensity
  sleepQuality:         number;   // 0–1: estimated sleep quality
  circadianDisruption:  number;   // 0–1: circadian rhythm disruption
  screenStress:         number;   // 0–1: screen-induced stress proxy
  sedentaryTime:        number;   // 0–1: prolonged inactivity
  carbLoadScore:        number;   // 0–1: recent carbohydrate load
  glycemicRisk:         number;   // 0–1: glycemic spike risk
  sleepDebt:            number;   // 0–1: cumulative sleep deficit
  stressIndex:          number;   // 0–1: composite stress signal
  mealTimingGap:        number;   // 0–1: deviation from optimal meal timing
  hourOfDay:            number;   // 0–1: normalized hour (0=midnight, 1=23:00)
  heartRateNorm:        number;   // 0–1: normalized resting HR
  stepVelocity:         number;   // 0–1: step rate in recent window
  motionVariance:       number;   // 0–1: accelerometer variance (restlessness)
  hydrationProxy:       number;   // 0–1: hydration estimate
  recoveryScore:        number;   // 0–1: composite recovery state
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TARGET_SLEEP_HOURS  = 7.5;
const TARGET_STEPS_DAY    = 8000;
const TARGET_MEAL_GAP_HRS = 4.0;
const MAX_SCREEN_MINS_DAY = 480;    // 8 hours
const RESTING_HR_LOW      = 50;
const RESTING_HR_HIGH     = 100;
const TARGET_WATER_LITERS = 2.5;

// Circadian peak hours (when each metric is naturally elevated)
const CORTISOL_PEAK_HOUR  = 8;     // 08:00
const ENERGY_TROUGH_HOUR  = 14;    // 14:00 — post-lunch dip

// ── FeatureEngineeringService ─────────────────────────────────────────────────

class FeatureEngineeringService {

  /**
   * Main entry point: transform raw sensor readings into model-ready features.
   *
   * All outputs are in [0, 1]. Higher values = more of that dimension
   * (e.g., higher stressIndex = more stress, higher activityLevel = more active).
   */
  engineer(raw: RawSensorData): FeatureVector {
    const now  = new Date(raw.currentTimestamp);
    const hour = now.getHours() + now.getMinutes() / 60; // fractional hour

    return {
      activityLevel:       this.calcActivityLevel(raw, hour),
      sleepQuality:        this.calcSleepQuality(raw),
      circadianDisruption: this.calcCircadianDisruption(raw, hour),
      screenStress:        this.calcScreenStress(raw, hour),
      sedentaryTime:       this.calcSedentaryTime(raw),
      carbLoadScore:       this.calcCarbLoadScore(raw),
      glycemicRisk:        this.calcGlycemicRisk(raw),
      sleepDebt:           this.calcSleepDebt(raw),
      stressIndex:         this.calcStressIndex(raw, hour),
      mealTimingGap:       this.calcMealTimingGap(raw),
      hourOfDay:           hour / 23,
      heartRateNorm:       this.normalizeHeartRate(raw.heartRate),
      stepVelocity:        this.calcStepVelocity(raw),
      motionVariance:      this.calcMotionVariance(raw.motionSamples),
      hydrationProxy:      this.calcHydrationProxy(raw),
      recoveryScore:       this.calcRecoveryScore(raw, hour),
    };
  }

  // ─── Individual feature calculations ───────────────────────────────────────

  /**
   * activityLevel (0–1)
   * Combines: step count, active energy, recent motion, heart rate elevation.
   * 0 = completely sedentary | 1 = very active
   */
  private calcActivityLevel(raw: RawSensorData, hour: number): number {
    const stepScore    = clamp(raw.stepCountToday / TARGET_STEPS_DAY, 0, 1);
    const stepVelocity = clamp(raw.stepCount / 500, 0, 1); // steps in last hour
    const energyScore  = clamp(raw.activeEnergy / 600, 0, 1);
    const motionScore  = this.calcMotionVariance(raw.motionSamples);

    // Weight recent motion more heavily than daily totals
    const combined = (
      0.30 * stepScore +
      0.25 * stepVelocity +
      0.25 * energyScore +
      0.20 * motionScore
    );

    return clamp(combined, 0, 1);
  }

  /**
   * sleepQuality (0–1)
   * Based on estimated sleep duration and consistency.
   * 1 = excellent sleep | 0 = very poor
   */
  private calcSleepQuality(raw: RawSensorData): number {
    if (!raw.sleepEndEst || !raw.sleepStartEst) {
      // No sleep data — return neutral estimate
      return 0.5;
    }

    const sleepDurationHrs = (raw.sleepEndEst - raw.sleepStartEst) / (1000 * 3600);

    // Penalize both under-sleep and over-sleep
    // Optimal: 7–8 hours → score ~1.0
    const durationScore = sleepDurationHrs <= 0
      ? 0
      : sleepDurationHrs < 4 ? sleepDurationHrs / 4 * 0.4
      : sleepDurationHrs < 6 ? 0.4 + (sleepDurationHrs - 4) / 2 * 0.35
      : sleepDurationHrs <= 9 ? 0.75 + (sleepDurationHrs - 6) / 3 * 0.25
      : 1.0 - (sleepDurationHrs - 9) / 3 * 0.3;  // over 9h — slight penalty

    // Motion during "sleep" window = restless sleep
    const sleepMotion = this.calcMotionVariance(raw.motionSamples);
    const motionPenalty = sleepMotion * 0.25;

    return clamp(durationScore - motionPenalty, 0, 1);
  }

  /**
   * circadianDisruption (0–1)
   * Measures misalignment between behavior and expected circadian phase.
   * High disruption = screen use at night, irregular sleep timing.
   */
  private calcCircadianDisruption(raw: RawSensorData, hour: number): number {
    // Screen during late-night hours (22:00–04:00) is maximally disruptive
    const lateNightScreen = (hour >= 22 || hour <= 4)
      ? raw.screenOnMinutesLastHour / 60
      : 0;

    // Sleep debt amplifies circadian disruption
    const sleepDebt = this.calcSleepDebt(raw);

    // Irregular wake time: farther from 07:00 target
    const wakeHour       = raw.sleepEndEst
      ? new Date(raw.sleepEndEst).getHours()
      : 7;
    const wakeDeviation  = Math.abs(wakeHour - 7) / 6; // normalized to 6h max deviation

    const combined = (
      0.40 * lateNightScreen +
      0.35 * sleepDebt +
      0.25 * clamp(wakeDeviation, 0, 1)
    );

    return clamp(combined, 0, 1);
  }

  /**
   * screenStress (0–1)
   * Proxy for cognitive / eye strain stress from device usage.
   * Accounts for time-of-day modulation.
   */
  private calcScreenStress(raw: RawSensorData, hour: number): number {
    // Daytime screen use has lower stress cost than evening use
    const timePenalty = hour >= 20 ? 1.4 : hour >= 18 ? 1.2 : 1.0;

    const dailyNorm   = clamp(raw.screenOnMinutesToday / MAX_SCREEN_MINS_DAY, 0, 1);
    const recentNorm  = clamp(raw.screenOnMinutesLastHour / 60, 0, 1);

    // Consecutive screen hours compound stress
    const combined = (0.40 * dailyNorm + 0.60 * recentNorm) * timePenalty;
    return clamp(combined, 0, 1);
  }

  /**
   * sedentaryTime (0–1)
   * High when user has been inactive for extended periods.
   * Computed from low step count + low motion + time since last activity.
   */
  private calcSedentaryTime(raw: RawSensorData): number {
    const msSinceActive   = Date.now() - raw.lastActiveTime;
    const hoursSinceActive= msSinceActive / (1000 * 3600);

    // >4 hours without significant movement = highly sedentary
    const inactivityScore = clamp(hoursSinceActive / 4, 0, 1);

    // Low daily steps amplifies sedentary signal
    const lowSteps = 1 - clamp(raw.stepCountToday / (TARGET_STEPS_DAY * 0.5), 0, 1);

    const motionLow = 1 - this.calcMotionVariance(raw.motionSamples);

    return clamp(
      0.45 * inactivityScore +
      0.30 * lowSteps +
      0.25 * motionLow,
      0, 1
    );
  }

  /**
   * carbLoadScore (0–1)
   * Weighted recent carb + sugar intake, normalized.
   */
  private calcCarbLoadScore(raw: RawSensorData): number {
    const carbsNorm  = clamp(raw.carbsLastMeal / 100, 0, 1);
    const sugarNorm  = clamp(raw.sugarLastMeal / 80,  0, 1);
    return clamp(0.6 * carbsNorm + 0.4 * sugarNorm, 0, 1);
  }

  /**
   * glycemicRisk (0–1)
   * Amplifies carbLoadScore when meal gap is small (back-to-back eating)
   * and activity is low (no insulin buffering via muscle uptake).
   */
  private calcGlycemicRisk(raw: RawSensorData): number {
    const carbLoad        = this.calcCarbLoadScore(raw);
    const minsLastMeal    = (Date.now() - raw.lastMealTime) / 60000;
    const recentMeal      = clamp(1 - minsLastMeal / 120, 0, 1); // peak in first 2h
    const lowActivity     = 1 - clamp(raw.stepCount / 200, 0, 1);

    const risk = carbLoad * (0.5 + 0.3 * recentMeal + 0.2 * lowActivity);
    return clamp(risk, 0, 1);
  }

  /**
   * sleepDebt (0–1)
   * Normalized deficit from TARGET_SLEEP_HOURS.
   * 0 = fully rested | 1 = severely sleep deprived
   */
  private calcSleepDebt(raw: RawSensorData): number {
    if (!raw.sleepEndEst || !raw.sleepStartEst) return 0.3;
    const sleptHrs   = (raw.sleepEndEst - raw.sleepStartEst) / (1000 * 3600);
    const debt       = Math.max(0, TARGET_SLEEP_HOURS - sleptHrs);
    return clamp(debt / TARGET_SLEEP_HOURS, 0, 1);
  }

  /**
   * stressIndex (0–1)
   * Composite: screen stress + sleep debt + circadian disruption + heart rate
   */
  private calcStressIndex(raw: RawSensorData, hour: number): number {
    const screen      = this.calcScreenStress(raw, hour);
    const debt        = this.calcSleepDebt(raw);
    const circadian   = this.calcCircadianDisruption(raw, hour);
    const hrStress    = clamp((raw.heartRate - 70) / 30, 0, 1); // elevated HR

    // Cortisol naturally peaks in the morning — add circadian modulation
    const circadianStressBoost = 0.05 * Math.sin(
      (2 * Math.PI * hour) / 24 - (Math.PI / 2) + 0.5
    );

    return clamp(
      0.35 * screen +
      0.25 * debt +
      0.20 * circadian +
      0.15 * hrStress +
      0.05 + circadianStressBoost,
      0, 1
    );
  }

  /**
   * mealTimingGap (0–1)
   * Both extremes (ate just now OR very long ago) elevate risk.
   * Optimal: ~4 hours between meals.
   */
  private calcMealTimingGap(raw: RawSensorData): number {
    const hrsLastMeal = (Date.now() - raw.lastMealTime) / (1000 * 3600);
    const deviation   = Math.abs(hrsLastMeal - TARGET_MEAL_GAP_HRS);
    return clamp(deviation / TARGET_MEAL_GAP_HRS, 0, 1);
  }

  /**
   * heartRateNorm (0–1)
   * Normalized heart rate. 0.5 ≈ healthy resting HR of 70 bpm.
   */
  private normalizeHeartRate(hr: number): number {
    if (!hr || hr < 30) return 0.5; // unavailable
    return clamp(
      (hr - RESTING_HR_LOW) / (RESTING_HR_HIGH - RESTING_HR_LOW),
      0, 1
    );
  }

  /**
   * stepVelocity (0–1)
   * Steps per minute in recent window — proxy for current movement intensity.
   */
  private calcStepVelocity(raw: RawSensorData): number {
    // stepCount = steps in last 60 minutes
    // Target: ~100 steps/min during moderate walking
    return clamp(raw.stepCount / (100 * 60), 0, 1);
  }

  /**
   * motionVariance (0–1)
   * Standard deviation of accelerometer magnitudes in recent window.
   * Low variance = sedentary | High variance = active movement
   */
  private calcMotionVariance(samples: number[]): number {
    if (!samples?.length) return 0.2;
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce(
      (sum, x) => sum + Math.pow(x - mean, 2), 0
    ) / samples.length;
    // Normalize: variance ~0.01 for walking, ~0 for sitting
    return clamp(Math.sqrt(variance) * 8, 0, 1);
  }

  /**
   * hydrationProxy (0–1)
   * 1 = well-hydrated | 0 = dehydrated
   * Based on water intake and time elapsed.
   */
  private calcHydrationProxy(raw: RawSensorData): number {
    const waterScore  = clamp(raw.waterTodayLiters / TARGET_WATER_LITERS, 0, 1);
    // Dehydration accrues over time if not drinking
    const hrSinceDrank= (Date.now() - raw.lastMealTime) / (1000 * 3600); // proxy
    const timePenalty = clamp(hrSinceDrank / 6, 0, 0.4);
    return clamp(waterScore - timePenalty, 0, 1);
  }

  /**
   * recoveryScore (0–1)
   * Composite of sleep quality, hydration, low stress, and activity balance.
   * 1 = excellent recovery state | 0 = severely depleted
   */
  private calcRecoveryScore(raw: RawSensorData, hour: number): number {
    const sleep   = this.calcSleepQuality(raw);
    const hydration = this.calcHydrationProxy(raw);
    const lowStress = 1 - this.calcStressIndex(raw, hour);
    const activity  = clamp(raw.stepCountToday / TARGET_STEPS_DAY, 0, 1);

    // Moderate activity improves recovery; extreme activity might impair it
    const activityScore = activity < 0.8
      ? activity * 1.1
      : 1.0 - (activity - 0.8) * 0.5;

    return clamp(
      0.35 * sleep +
      0.25 * lowStress +
      0.20 * clamp(activityScore, 0, 1) +
      0.20 * hydration,
      0, 1
    );
  }

  /**
   * Returns human-readable feature explanations for UI display
   */
  describeFeatures(fv: FeatureVector): Record<keyof FeatureVector, string> {
    return {
      activityLevel:       `Activity: ${pct(fv.activityLevel)} intensity`,
      sleepQuality:        `Sleep: ${pct(fv.sleepQuality)} quality`,
      circadianDisruption: `Circadian rhythm: ${pct(fv.circadianDisruption)} disrupted`,
      screenStress:        `Screen load: ${pct(fv.screenStress)}`,
      sedentaryTime:       `Sedentary: ${pct(fv.sedentaryTime)} of threshold`,
      carbLoadScore:       `Carb load: ${pct(fv.carbLoadScore)}`,
      glycemicRisk:        `Glycemic risk: ${pct(fv.glycemicRisk)}`,
      sleepDebt:           `Sleep debt: ${pct(fv.sleepDebt)}`,
      stressIndex:         `Stress composite: ${pct(fv.stressIndex)}`,
      mealTimingGap:       `Meal gap disruption: ${pct(fv.mealTimingGap)}`,
      hourOfDay:           `Time of day: ${Math.round(fv.hourOfDay * 23)}:00`,
      heartRateNorm:       `Heart rate: ${pct(fv.heartRateNorm)} of range`,
      stepVelocity:        `Step velocity: ${pct(fv.stepVelocity)}`,
      motionVariance:      `Motion: ${pct(fv.motionVariance)} variance`,
      hydrationProxy:      `Hydration: ${pct(fv.hydrationProxy)}`,
      recoveryScore:       `Recovery: ${pct(fv.recoveryScore)}`,
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function pct(val: number): string {
  return `${Math.round(val * 100)}%`;
}

export const featureService = new FeatureEngineeringService();
export default featureService;
