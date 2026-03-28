// src/screens/SettingsScreen.tsx
// App settings, permissions, and model information.

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore }  from '../store/useAppStore';
import { Colors, Typography, Spacing, Radii } from '../theme';

export const SettingsScreen: React.FC = () => {
  const {
    modelReady,
    inferenceIntervalMin,
    setInferenceInterval,
    latestPrediction,
  } = useAppStore();

  const intervals = [2, 5, 10, 15, 30];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>SETTINGS</Text>

        {/* Model status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧠  ON-DEVICE MODEL</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: modelReady ? Colors.risk.low.bg : Colors.risk.high.bg }
            ]}>
              <Text style={[
                styles.statusText,
                { color: modelReady ? Colors.risk.low.primary : Colors.risk.high.primary }
              ]}>
                {modelReady ? '✓ LOADED' : '✕ NOT LOADED'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Runtime</Text>
            <Text style={styles.infoVal}>
              {Platform.OS === 'ios' ? 'TFLite + Core ML' : 'TFLite + NNAPI'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Model file</Text>
            <Text style={styles.infoVal}>presense_model.tflite</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoVal}>On-device assets bundle</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>API calls</Text>
            <Text style={[styles.infoVal, { color: Colors.risk.low.primary }]}>NONE — fully offline</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Input features</Text>
            <Text style={styles.infoVal}>16 engineered signals</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Output targets</Text>
            <Text style={styles.infoVal}>sugar_spike, stress, bp_trend</Text>
          </View>

          {latestPrediction && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last inference</Text>
              <Text style={styles.infoVal}>
                {new Date(latestPrediction.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          )}
        </View>

        {/* Scan interval */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⏱  SCAN INTERVAL</Text>
          <Text style={styles.cardSub}>How often to run on-device inference</Text>
          <View style={styles.intervalRow}>
            {intervals.map(min => (
              <TouchableOpacity
                key={min}
                style={[
                  styles.intervalBtn,
                  inferenceIntervalMin === min && styles.intervalBtnActive,
                ]}
                onPress={() => setInferenceInterval(min)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.intervalBtnText,
                  inferenceIntervalMin === min && styles.intervalBtnTextActive,
                ]}>
                  {min}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Data sources */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📡  DATA SOURCES</Text>
          {[
            {
              label: Platform.OS === 'ios' ? 'Apple HealthKit' : 'Google Health Connect',
              desc:  'Steps, heart rate, sleep, active energy',
              icon:  '❤️',
            },
            {
              label: 'Accelerometer',
              desc:  'Motion detection, activity classification',
              icon:  '📱',
            },
            {
              label: 'App State Monitor',
              desc:  'Screen time estimation',
              icon:  '🖥',
            },
            {
              label: 'Manual Logging',
              desc:  'Meals, water intake',
              icon:  '✍️',
            },
          ].map(source => (
            <View key={source.label} style={styles.sourceRow}>
              <Text style={styles.sourceIcon}>{source.icon}</Text>
              <View style={styles.sourceInfo}>
                <Text style={styles.sourceLabel}>{source.label}</Text>
                <Text style={styles.sourceDesc}>{source.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Inference pipeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔄  INFERENCE PIPELINE</Text>
          {[
            { step: '01', label: 'Read Sensors',     desc: 'HealthKit / Accelerometer / AppState' },
            { step: '02', label: 'Engineer Features', desc: '16 normalized behavioral signals' },
            { step: '03', label: 'On-Device Inference',desc: 'TFLite model — no network required' },
            { step: '04', label: 'State Simulation',  desc: 'Dynamic body state update (1-min ticks)' },
            { step: '05', label: 'Store & Display',   desc: 'Zustand → UI update' },
          ].map(step => (
            <View key={step.step} style={styles.pipelineStep}>
              <View style={styles.pipelineNum}>
                <Text style={styles.pipelineNumText}>{step.step}</Text>
              </View>
              <View style={styles.pipelineInfo}>
                <Text style={styles.pipelineLabel}>{step.label}</Text>
                <Text style={styles.pipelineDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>⚠️  IMPORTANT DISCLAIMER</Text>
          <Text style={styles.disclaimerText}>
            PreSense AI provides AI-based behavioral estimates derived from
            passive sensor data. All predictions are for informational purposes
            only and are NOT medical measurements, diagnoses, or recommendations.{'\n\n'}
            This app is NOT a medical device. It does NOT provide clinical health
            assessments. Always consult a qualified healthcare professional for
            any health concerns.{'\n\n'}
            No data is transmitted off your device. All inference runs locally.
          </Text>
        </View>

        <Text style={styles.version}>PreSense AI v1.0.0 • On-Device Inference</Text>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  scroll: { flex: 1 },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
    gap: Spacing.base,
  },

  screenTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.black,
    color: Colors.teal.bright,
    letterSpacing: 3,
  },

  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radii.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    color: Colors.teal.mid,
    letterSpacing: 2,
    marginBottom: 2,
  },
  cardSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.muted,
    marginTop: -4,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  infoLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    fontFamily: Typography.families.mono,
  },
  infoVal: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.medium,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  statusText: {
    fontSize: 10,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
  },

  intervalRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
  },
  intervalBtn: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.bg.elevated,
  },
  intervalBtnActive: {
    borderColor: Colors.teal.bright,
    backgroundColor: Colors.teal.glow,
  },
  intervalBtnText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.mono,
    color: Colors.text.secondary,
    fontWeight: Typography.weights.medium,
  },
  intervalBtnTextActive: {
    color: Colors.teal.bright,
    fontWeight: Typography.weights.bold,
  },

  sourceRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  sourceIcon: {
    fontSize: 18,
    width: 28,
  },
  sourceInfo: {
    flex: 1,
    gap: 2,
  },
  sourceLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    fontWeight: Typography.weights.semibold,
  },
  sourceDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.muted,
  },

  pipelineStep: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  pipelineNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.teal.glow,
    borderWidth: 1,
    borderColor: Colors.teal.dim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipelineNumText: {
    fontSize: 8,
    color: Colors.teal.bright,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
  },
  pipelineInfo: {
    flex: 1,
    gap: 2,
    paddingTop: 4,
  },
  pipelineLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.families.mono,
  },
  pipelineDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.muted,
  },

  disclaimerCard: {
    backgroundColor: Colors.risk.medium.bg,
    borderRadius: Radii.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: `${Colors.risk.medium.primary}25`,
    gap: Spacing.sm,
  },
  disclaimerTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    color: Colors.risk.medium.primary,
    letterSpacing: 1.5,
  },
  disclaimerText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    lineHeight: Typography.sizes.xs * 1.8,
  },

  version: {
    textAlign: 'center',
    fontSize: 9,
    color: Colors.text.muted,
    fontFamily: Typography.families.mono,
    letterSpacing: 1,
    paddingBottom: Spacing.base,
  },
});
