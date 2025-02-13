import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { IntlProvider } from 'react-intl';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { setupIntl } from './src/config/i18n';

export default function App() {
  const intlConfig = setupIntl();

  return (
    <SafeAreaProvider>
      <IntlProvider {...intlConfig}>
        <AuthProvider>
          <PaperProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </PaperProvider>
        </AuthProvider>
      </IntlProvider>
    </SafeAreaProvider>
  );
}