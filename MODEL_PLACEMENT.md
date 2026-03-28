# Pre-Trained Model Placement Guide

## PreSense AI — On-Device Model Setup

> **CRITICAL:** The app loads a pre-trained model. It does NOT train any model.
> You must place your `.tflite` (and optionally `.onnx`) model files in the
> locations specified below before building.

---

## 1. Model File Locations

### Android
```
android/app/src/main/assets/presense_model.tflite
```

### iOS
```
ios/PreSenseAI/presense_model.tflite
```
Then open `ios/PreSenseAI.xcworkspace` in Xcode and drag the file into
the project navigator, ensuring **"Copy items if needed"** and
**"Add to target: PreSenseAI"** are checked.

---

## 2. Expected Model Architecture

The app's `ModelService.ts` expects a TFLite FlatBuffer with:

| Property          | Value                                       |
|-------------------|---------------------------------------------|
| Input tensor      | `[1, 16]` float32                           |
| Output tensor     | `[1, 3]` float32 (pre-sigmoid or post-sigmoid) |
| Input normalization | Z-score (mean/std defined in ModelService) |
| Output range      | `[0, 1]` for each of 3 targets              |

### Output order (must match exactly):
```
output[0] → sugar_spike_risk
output[1] → stress_level
output[2] → bp_trend_risk
```

### Input feature order (must match exactly):
```
[00] activityLevel
[01] sleepQuality
[02] circadianDisruption
[03] screenStress
[04] sedentaryTime
[05] carbLoadScore
[06] glycemicRisk
[07] sleepDebt
[08] stressIndex
[09] mealTimingGap
[10] hourOfDay
[11] heartRateNorm
[12] stepVelocity
[13] motionVariance
[14] hydrationProxy
[15] recoveryScore
```

---

## 3. Converting Your Model to TFLite

### From Keras / TensorFlow SavedModel:
```python
import tensorflow as tf

# Load your trained Keras model
model = tf.keras.models.load_model('presense_model.keras')

# Convert to TFLite
converter = tf.lite.TFLiteConverter.from_keras_model(model)

# Optional: post-training quantization for smaller size & faster inference
converter.optimizations = [tf.lite.Optimize.DEFAULT]

# Optional: full integer quantization (smallest, fastest)
# converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]

tflite_model = converter.convert()

with open('presense_model.tflite', 'wb') as f:
    f.write(tflite_model)

print(f'Model size: {len(tflite_model) / 1024:.1f} KB')
```

### From PyTorch (via ONNX):
```python
import torch
import torch.onnx

model = YourPyTorchModel()
model.load_state_dict(torch.load('presense_model.pt'))
model.eval()

dummy_input = torch.randn(1, 16)
torch.onnx.export(
    model,
    dummy_input,
    'presense_model.onnx',
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={'input': {0: 'batch'}, 'output': {0: 'batch'}},
    opset_version=12,
)
```

---

## 4. Verifying the Model

Run this Python snippet to verify your model's I/O shapes before deploying:

```python
import numpy as np
import tensorflow as tf

interpreter = tf.lite.Interpreter(model_path='presense_model.tflite')
interpreter.allocate_tensors()

input_details  = interpreter.get_input_details()
output_details = interpreter.get_output_details()

print('Input shape:',  input_details[0]['shape'])   # Should be [1, 16]
print('Input dtype:',  input_details[0]['dtype'])   # Should be float32
print('Output shape:', output_details[0]['shape'])  # Should be [1, 3]
print('Output dtype:', output_details[0]['dtype'])  # Should be float32

# Test inference
test_input = np.random.rand(1, 16).astype(np.float32)
interpreter.set_tensor(input_details[0]['index'], test_input)
interpreter.invoke()
output = interpreter.get_tensor(output_details[0]['index'])
print('Test output:', output)   # Should be 3 values in [0, 1]
```

---

## 5. ONNX Runtime Mobile (Alternative Backend)

If you prefer ONNX Runtime instead of TFLite:

1. Place `presense_model.onnx` in the same asset locations
2. Install: `npm install onnxruntime-react-native`
3. The `ModelService.ts` will automatically detect and use ONNX Runtime
   if `react-native-tflite` is not found

---

## 6. Fallback Behavior

If **neither** TFLite nor ONNX Runtime is installed, `ModelService.ts`
falls back to **pre-extracted linear weights** encoded directly in the
service file. These are approximate weights that mimic the trained model's
behavior for development and testing purposes.

The fallback is:
- ✅ Safe to use for UI development
- ✅ Produces plausible 0–1 risk scores
- ❌ Does NOT use the actual trained model
- ❌ Not suitable for production deployment

---

## 7. Model Size Recommendations

| Quantization       | Typical Size | Recommended For      |
|--------------------|-------------|----------------------|
| Float32 (no quant) | ~200–400 KB | Development          |
| Float16            | ~100–200 KB | Production (iOS)     |
| INT8 (dynamic)     | ~50–100 KB  | Production (Android) |
| INT8 (full)        | ~50–100 KB  | Edge devices         |

For a 16-input → 64 → 32 → 3 network, expect ~50–150 KB after quantization.

---

## 8. Hardware Acceleration

The app configures:
- **iOS:** Core ML delegate (uses Apple Neural Engine on A12+)
- **Android:** NNAPI delegate (uses DSP/NPU on supported devices)
- **Fallback:** CPU (all devices)

No configuration changes needed — `ModelService.ts` handles this automatically.
