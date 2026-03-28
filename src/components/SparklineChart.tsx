// src/components/SparklineChart.tsx
// Minimal SVG sparkline for body state history visualization.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Colors, Typography, Spacing } from '../theme';

interface SparklineChartProps {
  data:    number[];     // values 0–1
  color:   string;
  label?:  string;
  height?: number;
  width?:  number;
  showBaseline?: boolean;
  baselineValue?: number;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  color,
  label,
  height = 70,
  width  = 280,
  showBaseline = true,
  baselineValue = 0.45,
}) => {
  if (!data?.length || data.length < 2) {
    return <View style={{ width, height }} />;
  }

  const pad    = { top: 8, bottom: 8, left: 4, right: 4 };
  const chartH = height - pad.top - pad.bottom;
  const chartW = width  - pad.left - pad.right;

  // Build SVG path from data points
  const points = data.map((val, i) => ({
    x: pad.left + (i / (data.length - 1)) * chartW,
    y: pad.top  + (1 - Math.max(0, Math.min(1, val))) * chartH,
  }));

  // Smooth path using cubic bezier
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX  = (prev.x + curr.x) / 2;
    pathD += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  // Area fill path
  const lastPt  = points[points.length - 1];
  const firstPt = points[0];
  const areaD   = `${pathD} L ${lastPt.x} ${height - pad.bottom} L ${firstPt.x} ${height - pad.bottom} Z`;

  // Baseline y position
  const baselineY = pad.top + (1 - baselineValue) * chartH;

  // Latest value position
  const latestPt = points[points.length - 1];
  const latestVal = data[data.length - 1];

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: Colors.text.muted }]}>{label}</Text>
      )}
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`sparkGrad_${color}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor={color} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Baseline */}
        {showBaseline && (
          <Line
            x1={pad.left}
            y1={baselineY}
            x2={width - pad.right}
            y2={baselineY}
            stroke={Colors.border.subtle}
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        )}

        {/* Area fill */}
        <Path
          d={areaD}
          fill={`url(#sparkGrad_${color})`}
        />

        {/* Line */}
        <Path
          d={pathD}
          stroke={color}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Latest value dot */}
        <Rect
          x={latestPt.x - 4}
          y={latestPt.y - 4}
          width={8}
          height={8}
          rx={4}
          fill={color}
          opacity={0.9}
        />
      </Svg>

      {/* Min/Max labels */}
      <View style={styles.rangeRow}>
        <Text style={styles.rangeText}>
          {Math.round(Math.min(...data) * 100)}
        </Text>
        <Text style={[styles.currentText, { color }]}>
          NOW: {Math.round(latestVal * 100)}
        </Text>
        <Text style={styles.rangeText}>
          {Math.round(Math.max(...data) * 100)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 2,
  },
  label: {
    fontSize: Typography.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  rangeText: {
    fontSize: 9,
    color: Colors.text.muted,
    fontFamily: Typography.families.mono,
  },
  currentText: {
    fontSize: 9,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
  },
});
