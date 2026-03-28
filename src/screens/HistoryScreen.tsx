// src/screens/HistoryScreen.tsx
// Chronological prediction history with trend visualization.

import React from 'react';
import {
  View, Text, StyleSheet, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore }   from '../store/useAppStore';
import { SparklineChart } from '../components/SparklineChart';
import ModelService       from '../services/ModelService';
import { Colors, Typography, Spacing, Radii } from '../theme';
import type { RiskPrediction } from '../services/ModelService';
import type { RiskTier } from '../services/ModelService';

const TIER_ICONS: Record<RiskTier, string> = {
  low:    '🟢',
  medium: '🟡',
  high:   '🔴',
};

interface PredictionRecord extends RiskPrediction {
  id: string;
}

const PredictionRow: React.FC<{ item: PredictionRecord; index: number }> = ({ item, index }) => {
  const maxRisk = Math.max(item.sugarSpikeRisk, item.stressLevel, item.bpTrendRisk);
  const tier    = ModelService.getRiskTier(maxRisk);
  const color   = tier === 'high'   ? Colors.risk.high.primary
                : tier === 'medium' ? Colors.risk.medium.primary
                : Colors.risk.low.primary;

  return (
    <View style={[styles.row, { borderLeftColor: color }]}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowTime}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit'
          })}
        </Text>
        <Text style={styles.rowDate}>
          {new Date(item.timestamp).toLocaleDateString([], {
            month: 'short', day: 'numeric'
          })}
        </Text>
        <View style={[styles.rowTierBadge, { backgroundColor: `${color}18` }]}>
          <Text style={styles.rowTierIcon}>{TIER_ICONS[tier]}</Text>
          <Text style={[styles.rowTierLabel, { color }]}>
            {ModelService.getRiskLabel(tier)}
          </Text>
        </View>
      </View>

      <View style={styles.rowMetrics}>
        {[
          { label: 'GLU', val: item.sugarSpikeRisk, color: Colors.glucose },
          { label: 'STR', val: item.stressLevel,    color: Colors.stress  },
          { label: 'BP',  val: item.bpTrendRisk,    color: Colors.bp      },
        ].map(m => (
          <View key={m.label} style={styles.rowMetric}>
            <Text style={styles.rowMetricLabel}>{m.label}</Text>
            <View style={styles.rowMetricBar}>
              <View style={[
                styles.rowMetricFill,
                { width: `${m.val * 100}%`, backgroundColor: m.color }
              ]} />
            </View>
            <Text style={[styles.rowMetricVal, { color: m.color }]}>
              {Math.round(m.val * 100)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.rowConf}>
        <Text style={styles.rowConfVal}>
          {Math.round((item.confidence ?? 0) * 100)}%
        </Text>
        <Text style={styles.rowConfLabel}>CONF</Text>
      </View>
    </View>
  );
};

export const HistoryScreen: React.FC = () => {
  const { predictionHistory, stateHistory } = useAppStore();

  if (!predictionHistory.length) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📈</Text>
          <Text style={styles.emptyTitle}>No History Yet</Text>
          <Text style={styles.emptyText}>
            Your prediction timeline will appear here after the first scan.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const sugarHistory  = predictionHistory.slice(0, 48).map(p => p.sugarSpikeRisk).reverse();
  const stressHistory = predictionHistory.slice(0, 48).map(p => p.stressLevel).reverse();
  const bpHistory     = predictionHistory.slice(0, 48).map(p => p.bpTrendRisk).reverse();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={predictionHistory}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Text style={styles.screenTitle}>PREDICTION HISTORY</Text>
            <Text style={styles.screenSub}>
              {predictionHistory.length} scan{predictionHistory.length !== 1 ? 's' : ''} recorded
            </Text>

            {/* Trend charts */}
            {sugarHistory.length > 2 && (
              <View style={styles.trendCard}>
                <Text style={styles.cardTitle}>RISK TRENDS (LAST 48 SCANS)</Text>
                <SparklineChart
                  data={sugarHistory}
                  color={Colors.glucose}
                  label="Sugar Spike Risk"
                  width={320}
                  height={60}
                  baselineValue={0.4}
                />
                <SparklineChart
                  data={stressHistory}
                  color={Colors.stress}
                  label="Stress Level"
                  width={320}
                  height={60}
                  baselineValue={0.35}
                />
                <SparklineChart
                  data={bpHistory}
                  color={Colors.bp}
                  label="BP Trend Risk"
                  width={320}
                  height={60}
                  baselineValue={0.32}
                />
              </View>
            )}

            <Text style={styles.listTitle}>SCAN LOG</Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <PredictionRow item={item as PredictionRecord} index={index} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={() => (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ⚠️  History shown for reference only. Not medical records.
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
    gap: Spacing.sm,
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

  header: { gap: Spacing.base, marginBottom: Spacing.sm },
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

  trendCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radii.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    gap: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    color: Colors.teal.mid,
    letterSpacing: 2,
  },

  listTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.mono,
    color: Colors.text.muted,
    letterSpacing: 2,
    marginTop: Spacing.xs,
  },

  row: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    borderLeftWidth: 3,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  rowLeft: {
    width: 72,
    gap: 3,
  },
  rowTime: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },
  rowDate: {
    fontSize: 9,
    color: Colors.text.muted,
    fontFamily: Typography.families.mono,
  },
  rowTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  rowTierIcon: { fontSize: 8 },
  rowTierLabel: {
    fontSize: 7,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.5,
  },

  rowMetrics: {
    flex: 1,
    gap: 5,
  },
  rowMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rowMetricLabel: {
    fontSize: 8,
    color: Colors.text.muted,
    fontFamily: Typography.families.mono,
    width: 24,
  },
  rowMetricBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  rowMetricFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 2,
  },
  rowMetricVal: {
    fontSize: 9,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    width: 22,
    textAlign: 'right',
  },

  rowConf: {
    alignItems: 'center',
    width: 36,
  },
  rowConfVal: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    color: Colors.teal.mid,
  },
  rowConfLabel: {
    fontSize: 7,
    color: Colors.text.muted,
    fontFamily: Typography.families.mono,
    letterSpacing: 0.5,
  },

  separator: {
    height: Spacing.xs,
  },

  footer: {
    padding: Spacing.base,
    marginTop: Spacing.base,
  },
  footerText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.muted,
    textAlign: 'center',
  },
});
