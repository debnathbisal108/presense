// src/components/PulseRing.tsx
// Animated biometric pulse ring — the visual centerpiece of the dashboard.
// Rings pulse at different rates based on risk level.

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '../theme';
import type { RiskTier } from '../services/ModelService';

interface PulseRingProps {
  tier:    RiskTier;
  size?:   number;
  active?: boolean;
}

const TIER_COLORS: Record<RiskTier, string> = {
  low:    Colors.risk.low.primary,
  medium: Colors.risk.medium.primary,
  high:   Colors.risk.high.primary,
};

const TIER_DURATION: Record<RiskTier, number> = {
  low:    2200,
  medium: 1500,
  high:    900,
};

export const PulseRing: React.FC<PulseRingProps> = ({
  tier,
  size = 160,
  active = true,
}) => {
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0.7)).current;
  const opacity2 = useRef(new Animated.Value(0.5)).current;

  const color    = TIER_COLORS[tier];
  const duration = TIER_DURATION[tier];

  useEffect(() => {
    if (!active) return;

    const pulse1 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale1, {
            toValue: 1.35,
            duration,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity1, {
            toValue: 0,
            duration,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale1, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity1, { toValue: 0.7, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );

    const pulse2 = Animated.loop(
      Animated.sequence([
        Animated.delay(duration * 0.5),
        Animated.parallel([
          Animated.timing(scale2, {
            toValue: 1.55,
            duration: duration * 1.2,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity2, {
            toValue: 0,
            duration: duration * 1.2,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale2, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity2, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );

    pulse1.start();
    pulse2.start();

    return () => {
      pulse1.stop();
      pulse2.stop();
      scale1.setValue(1);
      scale2.setValue(1);
      opacity1.setValue(0.7);
      opacity2.setValue(0.5);
    };
  }, [tier, active, duration, scale1, scale2, opacity1, opacity2]);

  const ringStyle = {
    width:  size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: color,
    position: 'absolute' as const,
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer pulse rings */}
      <Animated.View
        style={[
          ringStyle,
          { opacity: opacity2, transform: [{ scale: scale2 }] },
        ]}
      />
      <Animated.View
        style={[
          ringStyle,
          { opacity: opacity1, transform: [{ scale: scale1 }], borderWidth: 2 },
        ]}
      />
      {/* Static inner glow ring */}
      <View
        style={[
          ringStyle,
          {
            borderWidth: 2,
            borderColor: color,
            opacity: 0.9,
            backgroundColor: `${color}10`,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
