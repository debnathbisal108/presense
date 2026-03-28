# PreSense AI
## Predict Your Body Before It Reacts

> **Biologically Inspired On-Device Health Risk Prediction**
> A React Native app that runs a pre-trained TFLite model entirely on-device
> to estimate behavioral health risk from passive sensor signals.

---

## ⚠️ Disclaimer

All predictions are **AI-based behavioral estimates** derived from device sensor data.
This is **NOT** a medical device. Predictions are **NOT** medical measurements, diagnoses,
or health recommendations. Always consult a qualified healthcare professional.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRESENSE AI                             │
│                   On-Device Inference Engine                    │
└─────────────────────────────────────────────────────────────────┘

  SENSOR LAYER                FEATURE LAYER              MODEL LAYER
  ─────────────               ─────────────              ───────────
  HealthKit/               FeatureEngineering         TFLite / ONNX
  Google Fit    ──────►    Service                ──► On-Device Model
                           (16 features)              (no API calls)
  Accelerometer ──────►    ┌─────────────────┐         │
                           │ activityLevel   │         ▼
  AppState      ──────►    │ sleepQuality    │    ┌─────────────┐
  (screen time)            │ circadianDisr.  │    │sugar_spike  │
                           │ screenStress    │    │stress_level │
  Manual Input  ──────►    │ sedentaryTime   │    │bp_trend_risk│
  (meals, water)           │ carbLoadScore   │    └──────┬──────┘
                           │ glycemicRisk    │           │
                           │ sleepDebt       │           ▼
                           │ stressIndex     │   SIMULATION LAYER
                           │ mealTimingGap   │   ───────────────
                           │ hourOfDay       │   BodyStateSimulator
                           │ heartRateNorm   │   state(t+1) = f(state(t),
                           │ stepVelocity    │     inputs(t))
                           │ motionVariance  │
                           │ hydrationProxy  │   • 1-min simulation ticks
                           │ recoveryScore   │   • Circadian modulation
                           └─────────────────┘   • Lag buffer (glucose)
                                                  • Cross-state coupling
                                                       │
                                                       ▼
                                               ZUSTAND STORE
                                               ─────────────
                                               Global state → UI
```

---

## Project Structure

```
PreSenseAI/
├── App.tsx                           # Root entry point
├── src/
│   ├── theme/
│   │   └── index.ts                  # Design system (colors, typography, spacing)
│   ├── services/
│   │   ├── ModelService.ts           # TFLite/ONNX on-device inference
│   │   ├── FeatureEngineeringService.ts  # Raw sensor → 16 features
│   │   └── BodyStateSimulator.ts     # Recurrent state simulation engine
│   ├── hooks/
│   │   ├── useSensorData.ts          # HealthKit/sensors/AppState reader
│   │   └── useInference.ts           # Orchestrates full pipeline
│   ├── store/
│   │   └── useAppStore.ts            # Zustand global state
│   ├── screens/
│   │   ├── DashboardScreen.tsx       # Main UI with pulse rings
│   │   ├── InsightsScreen.tsx        # Feature breakdown & insights
│   │   ├── HistoryScreen.tsx         # Prediction timeline
│   │   └── SettingsScreen.tsx        # Config & model info
│   ├── components/
│   │   ├── PulseRing.tsx             # Animated biometric pulse rings
│   │   ├── RiskGauge.tsx             # Arc gauge for risk scores
│   │   ├── SparklineChart.tsx        # SVG history charts
│   │   └── FeatureBar.tsx            # Animated feature progress bars
│   └── navigation/
│       └── AppNavigator.tsx          # Bottom tab navigator
├── android/
│   └── app/src/main/
│       ├── AndroidManifest.xml       # Permissions + Health Connect
│       └── assets/
│           └── presense_model.tflite # ← PLACE MODEL HERE
├── ios/
│   └── PreSenseAI/
│       ├── Info.plist                # HealthKit + background permissions
│       └── presense_model.tflite    # ← PLACE MODEL HERE (+ add to Xcode)
├── MODEL_PLACEMENT.md               # Detailed model setup guide
└── README.md                        # This file
```

---

## Screens

| Screen | Description |
|--------|-------------|
| **Dashboard** | Central pulse display, 3 risk gauges, quick log, state timeline |
| **Insights** | 16-feature breakdown, engineered signal bars, AI recommendations |
| **History** | Chronological prediction log with trend sparklines |
| **Settings** | Model status, inference interval, data sources, pipeline info |

---

## Getting Started

### 1. Install dependencies
```bash
npm install
cd ios && pod install && cd ..
```

### 2. Place the pre-trained model
See `MODEL_PLACEMENT.md` for detailed instructions.

**Android:**
```bash
cp presense_model.tflite android/app/src/main/assets/
```

**iOS:**
```bash
cp presense_model.tflite ios/PreSenseAI/
# Then add to Xcode project
```

### 3. Install native ML runtime

**Option A: TFLite (recommended)**
```bash
npm install react-native-tflite
cd ios && pod install && cd ..
```

**Option B: ONNX Runtime Mobile**
```bash
npm install onnxruntime-react-native
cd ios && pod install && cd ..
```

### 4. Run

```bash
# iOS
npx react-native run-ios

# Android
npx react-native run-android
```

---

## Key Design Decisions

### On-Device Only
- Zero network requests for inference
- Model loaded from app bundle assets
- All computation runs on device CPU/GPU/NPU
- Works fully offline

### Simulation Engine
The `BodyStateSimulator` maintains a continuously evolving physiological state
between inference calls. This prevents the display from being static and models
realistic dynamics like:
- Glucose absorption lag (15-minute delay buffer)
- Cortisol slow decay (~60-min half-life)
- Circadian rhythm modulation
- Cross-state coupling (stress → BP, glucose → energy)

### Feature Engineering
Raw sensor data is transformed into 16 normalized [0,1] signals that the model
was trained on. The feature engineering layer bridges the gap between what
sensors can measure and what the model expects as input.

### Graceful Degradation
The app functions at multiple levels depending on available hardware:
1. **Full:** Real HealthKit/Health Connect + TFLite model
2. **Partial:** Real sensors + JS fallback weights
3. **Demo:** Simulated sensor data + JS fallback weights

---

## Data Privacy

- ✅ No data sent to any server
- ✅ All inference is on-device
- ✅ HealthKit data never leaves the device
- ✅ No analytics or tracking SDKs
- ✅ Sensor data only held in memory (not persisted, except user-logged meals/water)

---

## Inference Pipeline

```
Every N minutes (default: 5):
  1. useSensorData       → RawSensorData (live sensor readings)
  2. featureService.engineer()  → FeatureVector [16 floats, normalized]
  3. modelService.predict()     → RiskPrediction (ON-DEVICE, no API)
  4. bodyStateSimulator.applyPrediction() → smooth state update
  5. useAppStore.setPrediction()          → Zustand state → UI re-render

Every 1 minute (between inferences):
  6. bodyStateSimulator.tick()  → interpolate state forward in time
```

---

## Model Input Normalization

Features are Z-score normalized using training set statistics
defined in `ModelService.ts:FEATURE_STATS`. Ensure your model
was trained on the same normalization scheme, or update the stats
to match your training pipeline.

---

## Contributing

To update the model:
1. Export your new model to `.tflite` format
2. Verify I/O shapes match the spec in `MODEL_PLACEMENT.md`
3. Replace the file in both `android/app/src/main/assets/` and `ios/PreSenseAI/`
4. Rebuild the app — no code changes required

---

*PreSense AI v1.0.0 — On-Device Behavioral Health Prediction*
"# presense" 
