// frontend/App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { IntlProvider } from 'react-intl';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { setupIntl } from './src/config/i18n';
import { View } from 'react-native';

export default function App() {
  const intlConfig = setupIntl();

  return (
    <View style={{ flex: 1 }}>
      <IntlProvider {...intlConfig}>
        <AuthProvider>
          <PaperProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </PaperProvider>
        </AuthProvider>
      </IntlProvider>
    </View>
  );
}