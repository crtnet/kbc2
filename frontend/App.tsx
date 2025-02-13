import React from 'react';
import { IntlProvider } from 'react-intl';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ptMessages from './src/translations/pt.json';

const Stack = createNativeStackNavigator();

const messages = {
  pt: ptMessages
};

export default function App() {
  const locale = 'pt';

  return (
    <IntlProvider
      messages={messages[locale]}
      locale={locale}
      defaultLocale="pt"
    >
      <NavigationContainer>
        <Stack.Navigator>
          {/* Add your screens here */}
        </Stack.Navigator>
      </NavigationContainer>
    </IntlProvider>
  );
}