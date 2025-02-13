import React from 'react';
import { IntlProvider } from 'react-intl';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ptMessages from './src/i18n/pt.json';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';

const messages = {
  pt: ptMessages
};

const App = () => {
  const locale = 'pt';

  return (
    <SafeAreaProvider>
      <IntlProvider messages={messages[locale]} locale={locale} defaultLocale="en">
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </IntlProvider>
    </SafeAreaProvider>
  );
};

export default App;