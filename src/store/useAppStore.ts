// src/store/useAppStore.ts
// Global state management using Zustand
// Holds latest predictions, simulation state, and UI state

import { create } from 'zustand';
import type { RiskPrediction } from '../services/ModelService';
import type { BodyState, StateHistory } from '../services/BodyStateSimulator';
import type { FeatureVector } from '../services/FeatureEngineeringService';

interface PredictionRecord extends RiskPrediction {
  id: string;
}

interface AppStore {
  // ── Model state ──────────────────────────────────────────────────────────
  modelReady:       boolean;
  setModelReady:    (v: boolean) => void;

  latestPrediction: RiskPrediction | null;
  predictionHistory: PredictionRecord[];
  setPrediction:    (p: RiskPrediction) => void;

  latestFeatures:   FeatureVector | null;
  setFeatures:      (f: FeatureVector) => void;

  // ── Simulation state ─────────────────────────────────────────────────────
  bodyState:        BodyState | null;
  stateHistory:     StateHistory;
  setBodyState:     (s: BodyState) => void;
  setStateHistory:  (h: StateHistory) => void;

  // ── UI state ─────────────────────────────────────────────────────────────
  isInferring:      boolean;
  setIsInferring:   (v: boolean) => void;

  selectedMetric:   'glucose' | 'stress' | 'bp' | 'energy';
  setSelectedMetric:(m: 'glucose' | 'stress' | 'bp' | 'energy') => void;

  // ── User logged data ─────────────────────────────────────────────────────
  lastMealCarbs:    number;
  lastMealSugar:    number;
  waterToday:       number;
  setMealData:      (carbs: number, sugar: number) => void;
  setWaterData:     (liters: number) => void;

  // ── Settings ─────────────────────────────────────────────────────────────
  inferenceIntervalMin: number;
  setInferenceInterval: (min: number) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Model
  modelReady:        false,
  setModelReady:     (v) => set({ modelReady: v }),

  latestPrediction:  null,
  predictionHistory: [],
  setPrediction: (p) => set((state) => ({
    latestPrediction:  p,
    predictionHistory: [
      { ...p, id: `${p.timestamp}` },
      ...state.predictionHistory.slice(0, 287), // keep 24h at 5-min intervals
    ],
  })),

  latestFeatures:    null,
  setFeatures:       (f) => set({ latestFeatures: f }),

  // Simulation
  bodyState:         null,
  stateHistory:      { timestamps: [], glucose: [], stress: [], bp: [], energy: [] },
  setBodyState:      (s) => set({ bodyState: s }),
  setStateHistory:   (h) => set({ stateHistory: h }),

  // UI
  isInferring:       false,
  setIsInferring:    (v) => set({ isInferring: v }),

  selectedMetric:    'glucose',
  setSelectedMetric: (m) => set({ selectedMetric: m }),

  // User data
  lastMealCarbs:     40,
  lastMealSugar:     15,
  waterToday:        1.0,
  setMealData:       (carbs, sugar) => set({ lastMealCarbs: carbs, lastMealSugar: sugar }),
  setWaterData:      (liters) => set({ waterToday: liters }),

  // Settings
  inferenceIntervalMin: 5,
  setInferenceInterval: (min) => set({ inferenceIntervalMin: min }),
}));
