// src/navigation/AppNavigator.tsx
// Bottom tab navigation with custom tab bar matching biopunk theme.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { NavigationContainer }         from '@react-navigation/native';
import { createBottomTabNavigator }    from '@react-navigation/bottom-tabs';
import { SafeAreaProvider }            from 'react-native-safe-area-context';
import { DashboardScreen }  from '../screens/DashboardScreen';
import { InsightsScreen }   from '../screens/InsightsScreen';
import { HistoryScreen }    from '../screens/HistoryScreen';
import { SettingsScreen }   from '../screens/SettingsScreen';
import { useAppStore }      from '../store/useAppStore';
import ModelService          from '../services/ModelService';
import { Colors, Typography, Spacing } from '../theme';

const Tab = createBottomTabNavigator();

// Custom tab bar
function CustomTabBar({ state, descriptors, navigation }: any) {
  const { latestPrediction } = useAppStore();
  const maxRisk = latestPrediction
    ? Math.max(
        latestPrediction.sugarSpikeRisk,
        latestPrediction.stressLevel,
        latestPrediction.bpTrendRisk
      )
    : 0;
  const tier  = ModelService.getRiskTier(maxRisk);
  const pulsColor = tier === 'high'   ? Colors.risk.high.primary
                  : tier === 'medium' ? Colors.risk.medium.primary
                  : Colors.teal.bright;

  const TAB_CONFIG = [
    { icon: '◉', label: 'SCAN'    },
    { icon: '◈', label: 'SIGNALS' },
    { icon: '◷', label: 'HISTORY' },
    { icon: '⊙', label: 'SYSTEM'  },
  ];

  return (
    <View style={[styles.tabBar, { borderTopColor: `${pulsColor}25` }]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const cfg       = TAB_CONFIG[index];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress', target: route.key, canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            {isFocused && (
              <View style={[styles.tabIndicator, { backgroundColor: pulsColor }]} />
            )}
            <Text style={[
              styles.tabIcon,
              { color: isFocused ? pulsColor : Colors.text.muted },
            ]}>
              {cfg.icon}
            </Text>
            <Text style={[
              styles.tabLabel,
              { color: isFocused ? pulsColor : Colors.text.muted },
            ]}>
              {cfg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export const AppNavigator: React.FC = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          tabBar={props => <CustomTabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="Insights"  component={InsightsScreen}  />
          <Tab.Screen name="History"   component={HistoryScreen}   />
          <Tab.Screen name="Settings"  component={SettingsScreen}  />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.secondary,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 10,
    paddingHorizontal: Spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: -10,
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  tabIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  tabLabel: {
    fontSize: 7,
    fontFamily: Typography.families.mono,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
  },
});
