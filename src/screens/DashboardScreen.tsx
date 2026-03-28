// src/screens/DashboardScreen.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PreSense AI — Main Dashboard
//
// Visual design: "Biopunk Minimalism"
// Deep navy substrate with electric teal biometric pulses.
// The central hero element is a triple pulse ring system
// where ring animation speed reflects risk tier.
// Peripheral gauges orbit the central display.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSensorData }    from '../hooks/useSensorData';
import { useInference }     from '../hooks/useInference';
import { useAppStore }      from '../store/useAppStore';
import { PulseRing }        from '../components/PulseRing';
import { RiskGauge }        from '../components/RiskGauge';
import { SparklineChart }   from '../components/SparklineChart';
import ModelService          from '../services/ModelService';
import { Colors, Typography, Spacing, Radii, Shadows } from '../theme';
import type { RiskTier }    from '../services/ModelService';

export const DashboardScreen: React.FC = () => {
  const { sensorData, isReady: sensorsReady, logMeal, logWater } = useSensorData();
  const {
    latestPrediction,
    bodyState,
    stateHistory,
    isInferring,
    modelReady,
    inferenceIntervalMin,
  } = useAppStore();

  const { runInference } = useInference({
    sensorData,
    intervalMin: inferenceIntervalMin,
    enabled:     sensorsReady,
  });

  // ── Animations ───────────────────────────────────────────────────────────
  const headerFade    = useRef(new Animated.Value(0)).current;
  const gaugesSlide   = useRef(new Animated.Value(30)).current;
  const gaugesFade    = useRef(new Animated.Value(0)).current;
  const scanLineAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      Animated.timing(headerFade, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(gaugesSlide, {
          toValue: 0, duration: 500, useNativeDriver: true,
        }),
        Animated.timing(gaugesFade, {
          toValue: 1, duration: 500, useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous scan line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1, duration: 3000, useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0, duration: 0, useNativeDriver: true,
        }),
      ])
    ).start();
  }, [headerFade, gaugesSlide, gaugesFade, scanLineAnim]);

  // ── Derived risk state ───────────────────────────────────────────────────
  const sugar  = latestPrediction?.sugarSpikeRisk ?? 0.4;
  const stress = latestPrediction?.stressLevel    ?? 0.35;
  const bp     = latestPrediction?.bpTrendRisk    ?? 0.32;

  const maxRisk   = Math.max(sugar, stress, bp);
  const overallTier: RiskTier = ModelService.getRiskTier(maxRisk);
  const overallColor = overallTier === 'high'   ? Colors.risk.high.primary
                     : overallTier === 'medium' ? Colors.risk.medium.primary
                     : Colors.risk.low.primary;

  const confidence = latestPrediction?.confidence ?? 0;

  // ── Scan line transform ──────────────────────────────────────────────────
  const scanTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1], outputRange: [-200, 600],
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <View>
            <Text style={styles.appName}>PRESENSE AI</Text>
            <Text style={styles.tagline}>Body · Before · It · Reacts</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[
              styles.modelBadge,
              { borderColor: modelReady ? Colors.teal.bright : Colors.text.muted }
            ]}>
              <View style={[
                styles.modelDot,
                { backgroundColor: modelReady ? Colors.teal.bright : Colors.text.muted }
              ]} />
              <Text style={[
                styles.modelBadgeText,
                { color: modelReady ? Colors.teal.bright : Colors.text.muted }
              ]}>
                {modelReady ? 'ON-DEVICE' : 'LOADING'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Hero: Central Pulse Display ─────────────────────────────────── */}
        <Animated.View style={[
          styles.heroSection,
          { opacity: gaugesFade, transform: [{ translateY: gaugesSlide }] },
        ]}>
          {/* Scan line effect */}
          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateY: scanTranslate }] },
            ]}
            pointerEvents="none"
          />

          {/* Triple pulse rings */}
          <View style={styles.pulseContainer}>
            <PulseRing tier={overallTier} size={220} active={!isInferring} />
            <PulseRing tier={overallTier} size={170} active={!isInferring} />

            {/* Center vitals display */}
            <View style={styles.centerDisplay}>
              <Text style={[styles.riskLabel, { color: overallColor }]}>
                {ModelService.getRiskLabel(overallTier)}
              </Text>
              <Text style={[styles.riskScore, { color: overallColor }]}>
                {Math.round(maxRisk * 100)}
              </Text>
              <Text style={styles.riskUnit}>RISK INDEX</Text>
              {confidence > 0 && (
                <Text style={styles.confidenceText}>
                  {Math.round(confidence * 100)}% CONF
                </Text>
              )}
            </View>
          </View>

          {/* Inference button */}
          <TouchableOpacity
            style={[
              styles.inferBtn,
              isInferring && styles.inferBtnActive,
            ]}
            onPress={runInference}
            disabled={isInferring || !modelReady}
            activeOpacity={0.7}
          >
            <Text style={styles.inferBtnText}>
              {isInferring ? '⟳  SCANNING...' : '◉  SCAN NOW'}
            </Text>
          </TouchableOpacity>

          {latestPrediction && (
            <Text style={styles.lastUpdated}>
              LAST SCAN: {new Date(latestPrediction.timestamp).toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit'
              })}
            </Text>
          )}
        </Animated.View>

        {/* ── Three Risk Gauges ───────────────────────────────────────────── */}
        <Animated.View style={[
          styles.gaugeRow,
          { opacity: gaugesFade, transform: [{ translateY: gaugesSlide }] },
        ]}>
          <RiskGauge
            label="GLUCOSE"
            score={sugar}
            icon="🍬"
            color={Colors.glucose}
          />
          <RiskGauge
            label="STRESS"
            score={stress}
            icon="⚡"
            color={Colors.stress}
          />
          <RiskGauge
            label="BP TREND"
            score={bp}
            icon="💓"
            color={Colors.bp}
          />
        </Animated.View>

        {/* ── Body State Timeline ─────────────────────────────────────────── */}
        {stateHistory.glucose.length > 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>BODY STATE · LAST HOUR</Text>
            <View style={styles.chartStack}>
              <SparklineChart
                data={stateHistory.glucose}
                color={Colors.glucose}
                label="Glucose"
                width={320}
                baselineValue={0.45}
              />
              <SparklineChart
                data={stateHistory.stress}
                color={Colors.stress}
                label="Stress"
                width={320}
                baselineValue={0.20}
              />
              <SparklineChart
                data={stateHistory.bp}
                color={Colors.bp}
                label="BP Trend"
                width={320}
                baselineValue={0.35}
              />
              <SparklineChart
                data={stateHistory.energy}
                color={Colors.energy}
                label="Energy"
                width={320}
                baselineValue={0.55}
              />
            </View>
          </View>
        )}

        {/* ── Live Body State ─────────────────────────────────────────────── */}
        {bodyState && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>LIVE SIMULATION STATE</Text>
            <View style={styles.stateGrid}>
              {[
                { key: 'Glucose',  val: bodyState.glucose, color: Colors.glucose,  icon: '🍬' },
                { key: 'Stress',   val: bodyState.stress,  color: Colors.stress,   icon: '⚡' },
                { key: 'BP',       val: bodyState.bp,      color: Colors.bp,       icon: '💓' },
                { key: 'Energy',   val: bodyState.energy,  color: Colors.energy,   icon: '⚡' },
              ].map(item => (
                <View key={item.key} style={[styles.stateCell, { borderColor: `${item.color}25` }]}>
                  <Text style={styles.stateCellIcon}>{item.icon}</Text>
                  <Text style={[styles.stateCellVal, { color: item.color }]}>
                    {Math.round(item.val * 100)}
                  </Text>
                  <Text style={styles.stateCellKey}>{item.key}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Quick Log ─────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>QUICK LOG</Text>
          <View style={styles.logRow}>
            {[
              { label: 'Meal: Light',  onPress: () => logMeal(35, 10) },
              { label: 'Meal: Medium', onPress: () => logMeal(65, 25) },
              { label: 'Meal: Heavy',  onPress: () => logMeal(100, 45) },
            ].map(btn => (
              <TouchableOpacity
                key={btn.label}
                style={styles.logBtn}
                onPress={() => { btn.onPress(); runInference(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.logBtnText}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.logRow}>
            {[0.25, 0.5, 1.0].map(liters => (
              <TouchableOpacity
                key={liters}
                style={styles.logBtn}
                onPress={() => logWater(liters)}
                activeOpacity={0.7}
              >
                <Text style={styles.logBtnText}>💧 +{liters}L</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Disclaimer ───────────────────────────────────────────────────── */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ⚠️  AI-based behavioral estimates only.{'\n'}
            Not a medical device. Not a substitute for clinical evaluation.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['4xl'],
    gap: Spacing.base,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Spacing.sm,
  },
  appName: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.black,
    color: Colors.teal.bright,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.muted,
    letterSpacing: 2.5,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  modelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  modelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modelBadgeText: {
    fontSize: 9,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii['2xl'],
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.teal.bright,
    opacity: 0.15,
  },
  pulseContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDisplay: {
    position: 'absolute',
    alignItems: 'center',
  },
  riskLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    letterSpacing: 3,
    marginBottom: 4,
  },
  riskScore: {
    fontSize: Typography.sizes['4xl'],
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.black,
    lineHeight: Typography.sizes['4xl'] * 1.0,
  },
  riskUnit: {
    fontSize: 9,
    color: Colors.text.muted,
    letterSpacing: 2,
    fontFamily: Typography.families.mono,
    marginTop: 2,
  },
  confidenceText: {
    fontSize: 9,
    color: Colors.teal.mid,
    fontFamily: Typography.families.mono,
    marginTop: 4,
    letterSpacing: 1,
  },
  inferBtn: {
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Colors.teal.bright,
    backgroundColor: Colors.teal.glow,
  },
  inferBtnActive: {
    borderColor: Colors.teal.dim,
    backgroundColor: Colors.transparent,
  },
  inferBtnText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    color: Colors.teal.bright,
    letterSpacing: 1.5,
  },
  lastUpdated: {
    marginTop: Spacing.sm,
    fontSize: 9,
    color: Colors.text.muted,
    fontFamily: Typography.families.mono,
    letterSpacing: 1,
  },

  // Gauges
  gaugeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.bg.card,
    borderRadius: Radii.xl,
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    ...Shadows.card,
  },

  // Cards
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radii.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    gap: Spacing.md,
    ...Shadows.card,
  },
  cardTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    color: Colors.teal.mid,
    letterSpacing: 2,
  },

  // Charts
  chartStack: {
    gap: Spacing.md,
  },

  // State grid
  stateGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stateCell: {
    flex: 1,
    backgroundColor: Colors.bg.elevated,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    gap: 2,
  },
  stateCellIcon: {
    fontSize: 16,
  },
  stateCellVal: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.black,
    lineHeight: Typography.sizes.lg,
  },
  stateCellKey: {
    fontSize: 8,
    color: Colors.text.muted,
    fontFamily: Typography.families.mono,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Quick log
  logRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  logBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    alignItems: 'center',
  },
  logBtnText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },

  // Disclaimer
  disclaimer: {
    padding: Spacing.base,
    borderRadius: Radii.md,
    backgroundColor: Colors.risk.medium.bg,
    borderWidth: 1,
    borderColor: `${Colors.risk.medium.primary}30`,
  },
  disclaimerText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: Typography.sizes.sm * 1.6,
  },
});
