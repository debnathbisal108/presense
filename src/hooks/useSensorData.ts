// src/hooks/useSensorData.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real Device Sensor Hook
//
// Reads from:
//   • Apple HealthKit (iOS) / Google Fit Health Connect (Android)
//   • Device accelerometer via react-native-sensors
//   • System screen time (best-effort)
//   • AsyncStorage for user-logged nutrition data
//
// Falls back to simulated demo data when permissions denied or
// running in simulator / development environment.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RawSensorData } from '../services/FeatureEngineeringService';

// ── Storage keys ──────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  LAST_MEAL_TIME:   '@presense/lastMealTime',
  CARBS_LAST_MEAL:  '@presense/carbsLastMeal',
  SUGAR_LAST_MEAL:  '@presense/sugarLastMeal',
  WATER_TODAY:      '@presense/waterTodayLiters',
  SLEEP_START:      '@presense/sleepStartEst',
  SLEEP_END:        '@presense/sleepEndEst',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface SensorPermissions {
  healthKit:      boolean;
  motion:         boolean;
  screenTime:     boolean;
}

interface UseSensorDataReturn {
  sensorData:      RawSensorData;
  permissions:     SensorPermissions;
  isReady:         boolean;
  requestPermissions: () => Promise<void>;
  logMeal:         (carbs: number, sugar: number) => Promise<void>;
  logWater:        (liters: number) => Promise<void>;
}

// ── Motion sample buffer ──────────────────────────────────────────────────────

const MOTION_BUFFER_SIZE = 60;

function buildMotionSamples(x: number, y: number, z: number, buffer: number[]): number[] {
  const magnitude = Math.sqrt(x * x + y * y + z * z);
  const updated   = [...buffer, magnitude];
  return updated.length > MOTION_BUFFER_SIZE
    ? updated.slice(-MOTION_BUFFER_SIZE)
    : updated;
}

// ── Demo / fallback data generator ───────────────────────────────────────────

function generateDemoSensorData(
  overrides: Partial<RawSensorData> = {}
): RawSensorData {
  const now  = Date.now();
  const hour = new Date().getHours();

  // Simulate realistic values based on time of day
  const isWorkHours = hour >= 9 && hour <= 17;
  const isEvening   = hour >= 18 && hour <= 22;
  const isNight     = hour >= 23 || hour <= 6;

  const stepBase = isWorkHours ? 400 : isEvening ? 200 : isNight ? 10 : 100;
  const screenBase = isWorkHours ? 45 : isEvening ? 40 : isNight ? 5 : 20;

  // Generate realistic motion samples
  const motionBase = isNight ? 0.05 : isWorkHours ? 0.15 : 0.25;
  const motionSamples = Array.from({ length: 60 }, () =>
    Math.abs(motionBase + (Math.random() - 0.5) * 0.1)
  );

  return {
    stepCount:               Math.round(stepBase + Math.random() * 100),
    stepCountToday:          Math.round(3000 + Math.random() * 5000),
    heartRate:               Math.round(65 + Math.random() * 15 + (isWorkHours ? 5 : 0)),
    activeEnergy:            Math.round(200 + Math.random() * 200),
    accelerometerX:          (Math.random() - 0.5) * 0.3,
    accelerometerY:          -9.8 + (Math.random() - 0.5) * 0.2,
    accelerometerZ:          (Math.random() - 0.5) * 0.3,
    motionSamples,
    lastActiveTime:          now - (isNight ? 3600000 : 120000 + Math.random() * 600000),
    sleepStartEst:           now - 7.5 * 3600000,
    sleepEndEst:             now - 1 * 3600000,
    screenOnMinutesToday:    Math.round(screenBase * 4 + Math.random() * 60),
    screenOnMinutesLastHour: Math.round(screenBase + Math.random() * 15),
    lastMealTime:            now - (2 + Math.random() * 3) * 3600000,
    carbsLastMeal:           Math.round(30 + Math.random() * 50),
    sugarLastMeal:           Math.round(10 + Math.random() * 30),
    waterTodayLiters:        parseFloat((0.5 + Math.random() * 2).toFixed(1)),
    currentTimestamp:        now,
    ...overrides,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSensorData(): UseSensorDataReturn {
  const [sensorData, setSensorData]   = useState<RawSensorData>(generateDemoSensorData());
  const [permissions, setPermissions] = useState<SensorPermissions>({
    healthKit: false, motion: false, screenTime: false,
  });
  const [isReady, setIsReady]         = useState(false);

  const motionBufferRef  = useRef<number[]>([]);
  const accelRef         = useRef({ x: 0, y: -9.8, z: 0 });
  const stepCountRef     = useRef(0);
  const stepTodayRef     = useRef(0);
  const heartRateRef     = useRef(72);
  const screenMinsRef    = useRef({ today: 0, lastHour: 0 });
  const appStateRef      = useRef<AppStateStatus>('active');
  const screenStartRef   = useRef<number>(Date.now());
  const subscriptionsRef = useRef<{ unsubscribe?: () => void }[]>([]);

  // ── Load persisted nutrition data ─────────────────────────────────────────

  const loadPersistedData = useCallback(async () => {
    try {
      const [mealTime, carbs, sugar, water, sleepStart, sleepEnd] =
        await AsyncStorage.multiGet([
          STORAGE_KEYS.LAST_MEAL_TIME,
          STORAGE_KEYS.CARBS_LAST_MEAL,
          STORAGE_KEYS.SUGAR_LAST_MEAL,
          STORAGE_KEYS.WATER_TODAY,
          STORAGE_KEYS.SLEEP_START,
          STORAGE_KEYS.SLEEP_END,
        ]);

      return {
        lastMealTime:    Number(mealTime[1]  ?? Date.now() - 3 * 3600000),
        carbsLastMeal:   Number(carbs[1]     ?? 40),
        sugarLastMeal:   Number(sugar[1]     ?? 15),
        waterTodayLiters:Number(water[1]     ?? 1.0),
        sleepStartEst:   Number(sleepStart[1]?? Date.now() - 8 * 3600000),
        sleepEndEst:     Number(sleepEnd[1]  ?? Date.now() - 1 * 3600000),
      };
    } catch {
      return {};
    }
  }, []);

  // ── Request permissions ───────────────────────────────────────────────────

  const requestPermissions = useCallback(async () => {
    const newPerms: SensorPermissions = { ...permissions };

    // ── HealthKit (iOS) ─────────────────────────────────────────────────────
    if (Platform.OS === 'ios') {
      try {
        const AppleHealthKit = require('react-native-health').default;
        const PERMS = AppleHealthKit.Constants.Permissions;
        await new Promise<void>((resolve, reject) => {
          AppleHealthKit.initHealthKit({
            permissions: {
              read: [PERMS.Steps, PERMS.HeartRate, PERMS.ActiveEnergyBurned,
                     PERMS.SleepAnalysis, PERMS.StepCount],
              write: [],
            },
          }, (err: Error) => {
            if (err) reject(err);
            else { newPerms.healthKit = true; resolve(); }
          });
        });
      } catch (e) {
        console.warn('[useSensorData] HealthKit unavailable:', e);
      }
    }

    // ── Google Health Connect (Android) ───────────────────────────────────
    if (Platform.OS === 'android') {
      try {
        const { initialize, requestPermission } = require('react-native-health-connect');
        await initialize();
        await requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'HeartRate' },
          { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
          { accessType: 'read', recordType: 'SleepSession' },
        ]);
        newPerms.healthKit = true;
      } catch (e) {
        console.warn('[useSensorData] Health Connect unavailable:', e);
      }
    }

    // ── Accelerometer ────────────────────────────────────────────────────
    try {
      const { accelerometer } = require('react-native-sensors');
      const sub = accelerometer({ updateInterval: 1000 }).subscribe(
        ({ x, y, z }: { x: number; y: number; z: number }) => {
          accelRef.current = { x, y, z };
          motionBufferRef.current = buildMotionSamples(x, y, z, motionBufferRef.current);
        },
        (error: Error) => console.warn('[useSensorData] Accelerometer error:', error)
      );
      subscriptionsRef.current.push(sub);
      newPerms.motion = true;
    } catch (e) {
      console.warn('[useSensorData] Accelerometer unavailable:', e);
    }

    setPermissions(newPerms);
  }, [permissions]);

  // ── Fetch health data (periodic) ─────────────────────────────────────────

  const fetchHealthData = useCallback(async () => {
    const persisted = await loadPersistedData();
    let healthOverrides: Partial<RawSensorData> = {};

    if (permissions.healthKit) {
      if (Platform.OS === 'ios') {
        healthOverrides = await fetchiOSHealthData();
      } else {
        healthOverrides = await fetchAndroidHealthData();
      }
    }

    setSensorData(generateDemoSensorData({
      ...healthOverrides,
      ...persisted,
      accelerometerX: accelRef.current.x,
      accelerometerY: accelRef.current.y,
      accelerometerZ: accelRef.current.z,
      motionSamples:  [...motionBufferRef.current],
      screenOnMinutesToday:    screenMinsRef.current.today,
      screenOnMinutesLastHour: screenMinsRef.current.lastHour,
      currentTimestamp: Date.now(),
    }));
  }, [permissions, loadPersistedData]);

  // ── iOS HealthKit data fetch ──────────────────────────────────────────────

  async function fetchiOSHealthData(): Promise<Partial<RawSensorData>> {
    try {
      const AppleHealthKit = require('react-native-health').default;
      const now   = new Date();
      const start = new Date(now.getTime() - 86400000); // last 24h

      const [steps, hr, energy, sleep] = await Promise.allSettled([
        new Promise<number>((res) => AppleHealthKit.getStepCount(
          { date: start.toISOString() },
          (_: Error, r: { value: number }) => res(r?.value ?? 0)
        )),
        new Promise<number>((res) => AppleHealthKit.getHeartRateSamples(
          { startDate: start.toISOString(), endDate: now.toISOString(), limit: 1 },
          (_: Error, r: { value: number }[]) => res(r?.[0]?.value ?? 0)
        )),
        new Promise<number>((res) => AppleHealthKit.getActiveEnergyBurned(
          { startDate: start.toISOString(), endDate: now.toISOString() },
          (_: Error, r: { value: number }[]) =>
            res(r?.reduce((a, b) => a + b.value, 0) ?? 0)
        )),
        new Promise<{ startDate: string; endDate: string }[]>((res) =>
          AppleHealthKit.getSleepSamples(
            { startDate: start.toISOString(), endDate: now.toISOString() },
            (_: Error, r: { startDate: string; endDate: string }[]) => res(r ?? [])
          )
        ),
      ]);

      const latestSleep = sleep.status === 'fulfilled' && sleep.value?.length
        ? {
            sleepStartEst: new Date(sleep.value[0].startDate).getTime(),
            sleepEndEst:   new Date(sleep.value[sleep.value.length - 1].endDate).getTime(),
          }
        : {};

      return {
        stepCountToday: steps.status === 'fulfilled' ? steps.value : undefined,
        heartRate:      hr.status === 'fulfilled' ? hr.value : undefined,
        activeEnergy:   energy.status === 'fulfilled' ? energy.value : undefined,
        ...latestSleep,
      };
    } catch (e) {
      return {};
    }
  }

  // ── Android Health Connect data fetch ─────────────────────────────────────

  async function fetchAndroidHealthData(): Promise<Partial<RawSensorData>> {
    try {
      const {
        readRecords,
        readTodayData,
      } = require('react-native-health-connect');
      const now   = new Date();
      const start = new Date(now.getTime() - 86400000);

      const timeFilter = {
        operator: 'between',
        startTime: start.toISOString(),
        endTime:   now.toISOString(),
      };

      const [steps, hr] = await Promise.allSettled([
        readTodayData('Steps'),
        readRecords('HeartRate', { timeRangeFilter: timeFilter }),
      ]);

      return {
        stepCountToday: steps.status  === 'fulfilled' ? steps.value?.count : undefined,
        heartRate:      hr.status     === 'fulfilled' && hr.value?.records?.length
          ? hr.value.records[hr.value.records.length - 1]?.samples?.[0]?.beatsPerMinute
          : undefined,
      };
    } catch {
      return {};
    }
  }

  // ── Screen time tracking via AppState ────────────────────────────────────

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      if (prev !== 'active' && nextState === 'active') {
        screenStartRef.current = Date.now();
      } else if (prev === 'active' && nextState !== 'active') {
        const elapsed = (Date.now() - screenStartRef.current) / 60000;
        screenMinsRef.current.today     += elapsed;
        screenMinsRef.current.lastHour  = Math.min(elapsed, 60);
      }
      appStateRef.current = nextState;
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  // ── Main polling loop ─────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await requestPermissions();
      if (mounted) {
        await fetchHealthData();
        setIsReady(true);
      }
    };

    init();

    // Refresh sensor data every 2 minutes
    const pollId = setInterval(() => {
      if (mounted) fetchHealthData();
    }, 120_000);

    return () => {
      mounted = false;
      clearInterval(pollId);
      subscriptionsRef.current.forEach(s => s.unsubscribe?.());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Nutrition logging ──────────────────────────────────────────────────────

  const logMeal = useCallback(async (carbs: number, sugar: number) => {
    const now = Date.now();
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.LAST_MEAL_TIME,  String(now)],
      [STORAGE_KEYS.CARBS_LAST_MEAL, String(carbs)],
      [STORAGE_KEYS.SUGAR_LAST_MEAL, String(sugar)],
    ]);
    setSensorData(prev => ({
      ...prev,
      lastMealTime:  now,
      carbsLastMeal: carbs,
      sugarLastMeal: sugar,
    }));
  }, []);

  const logWater = useCallback(async (liters: number) => {
    await AsyncStorage.setItem(STORAGE_KEYS.WATER_TODAY, String(liters));
    setSensorData(prev => ({ ...prev, waterTodayLiters: liters }));
  }, []);

  return { sensorData, permissions, isReady, requestPermissions, logMeal, logWater };
}
