// src/screens/InsightsScreen.tsx
// Feature breakdown and AI-generated behavioral insights.

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore }     from '../store/useAppStore';
import { FeatureBar }      from '../components/FeatureBar';
import featureService      from '../services/FeatureEngineeringService';
import { Colors, Typography, Spacing, Radii } from '../theme';

export const InsightsScreen: React.FC = () => {
  const { latestFeatures, latestPrediction } = useAppStore();

  if (!latestFeatures || !latestPrediction) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No Data Yet</Text>
          <Text style={styles.emptyText}>
            Run a scan from the Dashboard to see your feature insights.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const descriptions = featureService.describeFeatures(latestFeatures);

  // Group features by category
  const activityFeatures: (keyof typeof latestFeatures)[] = [
    'activityLevel', 'stepVelocity', 'motionVariance', 'sedentaryTime',
  ];
  const sleepFeatures: (keyof typeof latestFeatures)[] = [
    'sleepQuality', 'sleepDebt', 'circadianDisruption',
  ];
  const stressFeatures: (keyof typeof latestFeatures)[] = [
    'stressIndex', 'screenStress', 'heartRateNorm',
  ];
  const nutritionFeatures: (keyof typeof latestFeatures)[] = [
    'carbLoadScore', 'glycemicRisk', 'mealTimingGap', 'hydrationProxy',
  ];
  const recoveryFeatures: (keyof typeof latestFeatures)[] = [
    'recoveryScore', 'hourOfDay',
  ];

  const FEATURE_LABELS: Record<keyof typeof latestFeatures, string> = {
    activityLevel:       'Activity Level',
    sleepQuality:        'Sleep Quality',
    circadianDisruption: 'Circadian Disruption',
    screenStress:        'Screen Stress',
    sedentaryTime:       'Sedentary Time',
    carbLoadScore:       'Carb Load',
    glycemicRisk:        'Glycemic Risk',
    sleepDebt:           'Sleep Debt',
    stressIndex:         'Stress Index',
    mealTimingGap:       'Meal Timing Gap',
    hourOfDay:           'Time of Day',
    heartRateNorm:       'Heart Rate',
    stepVelocity:        'Step Velocity',
    motionVariance:      'Motion Variance',
    hydrationProxy:      'Hydration',
    recoveryScore:       'Recovery Score',
  };

  // Invert means "more = better"
  const INVERT_FEATURES = new Set([
    'activityLevel', 'sleepQuality', 'hydrationProxy',
    'recoveryScore', 'stepVelocity', 'motionVariance',
  ]);

  const renderFeatureGroup = (
    title: string,
    icon: string,
    keys: (keyof typeof latestFeatures)[]
  ) => (
    <View style={styles.card} key={title}>
      <Text style={styles.cardTitle}>{icon}  {title}</Text>
      {keys.map(key => (
        <FeatureBar
          key={key}
          label={FEATURE_LABELS[key]}
          value={latestFeatures[key]}
          invert={INVERT_FEATURES.has(key)}
          description={descriptions[key]}
        />
      ))}
    </View>
  );

  // Generate simple text insights
  const insights: string[] = [];
  if (latestFeatures.sleepDebt > 0.5) {
    insights.push('🌙 Sleep debt is elevated. Prioritize 7–8 hours of rest tonight.');
  }
  if (latestFeatures.screenStress > 0.6) {
    insights.push('📱 High screen engagement detected. Consider a 20-min break away from screens.');
  }
  if (latestFeatures.glycemicRisk > 0.6) {
    insights.push('🍬 Glycemic risk elevated. Light movement after meals can help stabilize glucose.');
  }
  if (latestFeatures.hydrationProxy < 0.4) {
    insights.push('💧 Hydration appears low. Aim for at least 2.5L of water today.');
  }
  if (latestFeatures.sedentaryTime > 0.6) {
    insights.push('🚶 Extended inactivity detected. A 5-minute walk can reduce BP and stress.');
  }
  if (latestFeatures.recoveryScore > 0.7) {
    insights.push('✅ Excellent recovery state. Good time for higher intensity activity.');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>BEHAVIORAL INSIGHTS</Text>
        <Text style={styles.screenSub}>
          {new Date(latestPrediction.timestamp).toLocaleString([], {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}
        </Text>

        {/* Insights banner */}
        {insights.length > 0 && (
          <View style={styles.insightsBanner}>
            <Text style={styles.insightsTitle}>💡 PERSONALIZED INSIGHTS</Text>
            {insights.map((ins, i) => (
              <Text key={i} style={styles.insightItem}>{ins}</Text>
            ))}
          </View>
        )}

        {/* Confidence indicator */}
        <View style={styles.confRow}>
          <Text style={styles.confLabel}>MODEL CONFIDENCE</Text>
          <View style={styles.confBar}>
            <View style={[
              styles.confFill,
              { width: `${latestPrediction.confidence * 100}%` }
            ]} />
          </View>
          <Text style={styles.confVal}>
            {Math.round(latestPrediction.confidence * 100)}%
          </Text>
        </View>

        {/* Feature groups */}
        {renderFeatureGroup('Activity & Motion',  '🏃', activityFeatures)}
        {renderFeatureGroup('Sleep & Recovery',   '🌙', sleepFeatures)}
        {renderFeatureGroup('Stress Signals',     '⚡', stressFeatures)}
        {renderFeatureGroup('Nutrition & Glucose','🍽', nutritionFeatures)}
        {renderFeatureGroup('System State',       '🔄', recoveryFeatures)}

        {/* Feature vector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊  RAW FEATURE VECTOR</Text>
          <Text style={styles.monoNote}>
            (16-dim input tensor sent to on-device model)
          </Text>
          <View style={styles.vectorGrid}>
            {Object.entries(latestFeatures).map(([key, val], i) => (
              <View key={key} style={styles.vectorCell}>
                <Text style={styles.vectorIndex}>[{String(i).padStart(2, '0')}]</Text>
                <Text style={styles.vectorVal}>{(val as number).toFixed(3)}</Text>
                <Text style={styles.vectorKey} numberOfLines={1}>
                  {key.replace(/([A-Z])/g, '_$1').toLowerCase().slice(0, 12)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ⚠️  All features are derived from behavioral sensor data.
            No medical measurements are taken. These are AI-based estimates only.
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
  scroll: { flex: 1 },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
    gap: Spacing.base,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing['3xl'],
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    color: Colors.text.primary,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.families.mono,
  },
  emptyText: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.sizes.base * 1.6,
  },

  screenTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.black,
    color: Colors.teal.bright,
    letterSpacing: 3,
  },
  screenSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.muted,
    fontFamily: Typography.families.mono,
  },

  insightsBanner: {
    backgroundColor: Colors.teal.glow,
    borderRadius: Radii.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.mild,
    gap: Spacing.sm,
  },
  insightsTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    color: Colors.teal.bright,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  insightItem: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    lineHeight: Typography.sizes.sm * 1.6,
  },

  confRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  confLabel: {
    fontSize: 9,
    color: Colors.text.muted,
    fontFamily: Typography.families.mono,
    letterSpacing: 1,
    width: 110,
  },
  confBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  confFill: {
    height: '100%',
    backgroundColor: Colors.teal.bright,
    borderRadius: 2,
  },
  confVal: {
    fontSize: Typography.sizes.xs,
    color: Colors.teal.bright,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    width: 35,
    textAlign: 'right',
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
    marginBottom: Spacing.xs,
  },

  monoNote: {
    fontSize: 9,
    color: Colors.text.muted,
    fontFamily: Typography.families.mono,
    marginTop: -8,
  },
  vectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  vectorCell: {
    width: '23%',
    backgroundColor: Colors.bg.elevated,
    borderRadius: Radii.sm,
    padding: Spacing.xs,
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  vectorIndex: {
    fontSize: 8,
    color: Colors.teal.dim,
    fontFamily: Typography.families.mono,
  },
  vectorVal: {
    fontSize: Typography.sizes.sm,
    color: Colors.teal.bright,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
  },
  vectorKey: {
    fontSize: 7,
    color: Colors.text.muted,
    fontFamily: Typography.families.mono,
  },

  disclaimer: {
    padding: Spacing.base,
    borderRadius: Radii.md,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  disclaimerText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: Typography.sizes.xs * 1.7,
  },
});
