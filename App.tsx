// App.tsx
// PreSense AI — Root Application Entry Point
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { StatusBar, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Colors } from './src/theme';

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg.primary }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.bg.primary}
        translucent={Platform.OS === 'android'}
      />
      <AppNavigator />
    </GestureHandlerRootView>
  );
};

export default App;
