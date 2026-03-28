// src/components/FeatureBar.tsx
// Displays a single engineered feature as a labeled progress bar.

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../theme';

interface FeatureBarProps {
  label:       string;
  value:       number;     // 0–1
  color?:      string;
  description?: string;
  invert?:     boolean;    // if true, high value is "good" (e.g. sleep quality)
}

export const FeatureBar: React.FC<FeatureBarProps> = ({
  label,
  value,
  color,
  description,
  invert = false,
}) => {
  const animWidth = useRef(new Animated.Value(0)).current;

  const clampedVal = Math.max(0, Math.min(1, value));
  const displayVal = invert ? 1 - clampedVal : clampedVal;

  // Bar color: green for low risk, amber for medium, red for high
  const barColor = color ?? (
    displayVal >= 0.65 ? Colors.risk.high.primary
    : displayVal >= 0.35 ? Colors.risk.medium.primary
    : Colors.risk.low.primary
  );

  useEffect(() => {
    Animated.spring(animWidth, {
      toValue: clampedVal,
      tension: 35,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [value, clampedVal, animWidth]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: barColor }]}>
          {Math.round(clampedVal * 100)}%
        </Text>
      </View>

      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: barColor,
              width: animWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
  },
  track: {
    height: 5,
    backgroundColor: Colors.bg.elevated,
    borderRadius: Radii.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radii.full,
    minWidth: 3,
  },
  description: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.muted,
    lineHeight: Typography.sizes.xs * 1.5,
  },
});
