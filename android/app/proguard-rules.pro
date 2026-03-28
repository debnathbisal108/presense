# android/app/proguard-rules.pro
# PreSense AI — ProGuard / R8 rules

# ── React Native ──────────────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# ── TensorFlow Lite ───────────────────────────────────────────────────────────
# CRITICAL: Do not strip TFLite classes — they are used for on-device inference
-keep class org.tensorflow.lite.** { *; }
-keep class org.tensorflow.lite.gpu.** { *; }
-keep class org.tensorflow.lite.support.** { *; }
-keep class org.tensorflow.lite.task.** { *; }
-keepclassmembers class org.tensorflow.lite.** { *; }

# ── ONNX Runtime (if used as alternative backend) ────────────────────────────
-keep class ai.onnxruntime.** { *; }
-keepclassmembers class ai.onnxruntime.** { *; }

# ── Health Connect ────────────────────────────────────────────────────────────
-keep class androidx.health.connect.** { *; }

# ── React Native Sensors / Accelerometer ─────────────────────────────────────
-keep class com.sensors.** { *; }

# ── Kotlin coroutines / serialization ────────────────────────────────────────
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }

# ── General Android rules ─────────────────────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception

# ── Native methods ────────────────────────────────────────────────────────────
-keepclasseswithmembernames class * {
    native <methods>;
}

# ── Enums ─────────────────────────────────────────────────────────────────────
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ── Remove logging in release ─────────────────────────────────────────────────
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
}
