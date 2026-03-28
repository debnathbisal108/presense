// src/components/RiskGauge.tsx
// Arc-style gauge for displaying a 0–1 risk score with color transitions.

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors, Typography, Spacing } from '../theme';
import ModelService from '../services/ModelService';
import type { RiskTier } from '../services/ModelService';

interface RiskGaugeProps {
  label:    string;
  score:    number;       // 0–1
  icon:     string;       // emoji
  color:    string;
  size?:    number;
  showPct?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  label,
  score,
  icon,
  color,
  size = 110,
  showPct = true,
}) => {
  const animScore = useRef(new Animated.Value(0)).current;
  const prevScore = useRef(0);

  const RADIUS       = (size - 14) / 2;
  const CIRCUMFERENCE= 2 * Math.PI * RADIUS;
  const STROKE_WIDTH = 7;

  const tier: RiskTier = ModelService.getRiskTier(score);
  const tierColor = tier === 'high'   ? Colors.risk.high.primary
                  : tier === 'medium' ? Colors.risk.medium.primary
                  : Colors.risk.low.primary;

  useEffect(() => {
    Animated.spring(animScore, {
      toValue: score,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
    prevScore.current = score;
  }, [score, animScore]);

  const strokeDashoffset = animScore.interpolate({
    inputRange:  [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id={`grad_${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={color} stopOpacity="1" />
              <Stop offset="100%" stopColor={tierColor} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          {/* Background track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={RADIUS}
            stroke={Colors.border.subtle}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Animated progress arc */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={RADIUS}
            stroke={`url(#grad_${label})`}
            strokeWidth={STROKE_WIDTH + 1}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            // Rotate to start from top
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>

        {/* Center content */}
        <View style={styles.center}>
          <Text style={styles.icon}>{icon}</Text>
          {showPct && (
            <Text style={[styles.score, { color: tierColor }]}>
              {Math.round(score * 100)}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.label}>{label}</Text>
      <View style={[styles.tier, { backgroundColor: `${tierColor}18` }]}>
        <Text style={[styles.tierText, { color: tierColor }]}>
          {ModelService.getRiskLabel(tier)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
    marginBottom: 2,
  },
  score: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
  },
  label: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tier: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 99,
  },
  tierText: {
    fontSize: 9,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1.2,
  },
});
