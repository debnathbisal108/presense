// src/hooks/useInference.ts
// ─────────────────────────────────────────────────────────────────────────────
// Main inference orchestration hook.
//
// Pipeline every N minutes:
//   RawSensorData
//     → FeatureEngineeringService.engineer()
//     → ModelService.predict()           ← ON-DEVICE, no API calls
//     → BodyStateSimulator.applyPrediction()
//     → Zustand store update
//
// Also runs the simulation tick on a faster 1-minute cycle between inferences.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import modelService  from '../services/ModelService';
import featureService from '../services/FeatureEngineeringService';
import { bodyStateSimulator } from '../services/BodyStateSimulator';
import { useAppStore } from '../store/useAppStore';
import type { RawSensorData } from '../services/FeatureEngineeringService';

interface UseInferenceOptions {
  sensorData:  RawSensorData;
  intervalMin: number;
  enabled:     boolean;
}

export function useInference({ sensorData, intervalMin, enabled }: UseInferenceOptions) {
  const {
    setModelReady,
    setPrediction,
    setFeatures,
    setBodyState,
    setStateHistory,
    setIsInferring,
    modelReady,
  } = useAppStore();

  const inferenceIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const simIntervalRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastInferenceTime     = useRef<number>(0);
  const sensorDataRef         = useRef<RawSensorData>(sensorData);

  // Keep sensor data ref fresh for use inside intervals
  useEffect(() => {
    sensorDataRef.current = sensorData;
  }, [sensorData]);

  // ── Initialize model on mount ───────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const ok = await modelService.initialize();
      if (mounted) {
        setModelReady(ok);
        console.log(`[useInference] Model initialized: ${ok}`);
      }
    };
    init();
    return () => { mounted = false; };
  }, [setModelReady]);

  // ── Core inference function ────────────────────────────────────────────
  const runInference = useCallback(async () => {
    if (!modelReady || !enabled) return;

    const raw = sensorDataRef.current;
    setIsInferring(true);

    try {
      // Step 1: Engineer features from raw sensor data
      const features = featureService.engineer(raw);
      setFeatures(features);

      // Step 2: On-device model inference (NO API calls)
      const prediction = await modelService.predict(features);
      setPrediction(prediction);

      // Step 3: Anchor simulation to prediction
      bodyStateSimulator.applyPrediction(prediction);

      // Step 4: Update body state
      const state   = bodyStateSimulator.getState();
      const history = bodyStateSimulator.getRecentHistory(60);
      setBodyState(state);
      setStateHistory(history);

      lastInferenceTime.current = Date.now();

      console.log(
        '[useInference] Inference complete:',
        `sugar=${prediction.sugarSpikeRisk.toFixed(3)}`,
        `stress=${prediction.stressLevel.toFixed(3)}`,
        `bp=${prediction.bpTrendRisk.toFixed(3)}`,
      );
    } catch (err) {
      console.error('[useInference] Inference failed:', err);
    } finally {
      setIsInferring(false);
    }
  }, [modelReady, enabled, setFeatures, setPrediction, setBodyState, setStateHistory, setIsInferring]);

  // ── Simulation tick (every minute, between inferences) ────────────────
  const runSimTick = useCallback(() => {
    const raw = sensorDataRef.current;
    try {
      bodyStateSimulator.tick(raw);
      const state   = bodyStateSimulator.getState();
      const history = bodyStateSimulator.getRecentHistory(60);
      setBodyState(state);
      setStateHistory(history);
    } catch (e) {
      // Silent — simulation not critical path
    }
  }, [setBodyState, setStateHistory]);

  // ── Start/stop inference loop based on enabled flag ───────────────────
  useEffect(() => {
    if (!modelReady || !enabled) return;

    // Run immediately
    runInference();

    // Inference loop: every N minutes
    inferenceIntervalRef.current = setInterval(
      runInference,
      intervalMin * 60 * 1000
    );

    // Simulation loop: every 1 minute
    simIntervalRef.current = setInterval(runSimTick, 60_000);

    // Subscribe simulation to state changes
    const unsubscribe = bodyStateSimulator.subscribe((state) => {
      setBodyState(state);
    });

    return () => {
      if (inferenceIntervalRef.current) clearInterval(inferenceIntervalRef.current);
      if (simIntervalRef.current)       clearInterval(simIntervalRef.current);
      unsubscribe();
    };
  }, [modelReady, enabled, intervalMin, runInference, runSimTick, setBodyState]);

  // ── Re-run inference when app comes to foreground ─────────────────────
  useEffect(() => {
    const handleAppState = (nextState: string) => {
      if (nextState === 'active') {
        const msSinceLastInference = Date.now() - lastInferenceTime.current;
        // Re-run if it's been more than half the inference interval
        if (msSinceLastInference > (intervalMin * 60 * 1000) / 2) {
          runInference();
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [runInference, intervalMin]);

  return { runInference };
}
