// App.tsx
import React, { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import i18n from './src/i18n';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { socketService } from './src/services/socketService';
import { logger } from './src/utils/logger';
import { imageOptimizationService } from './src/services/imageOptimizationService';

export default function App() {
  console.log('=== App.tsx is mounting ===');

  // Inicializa serviços quando o app é carregado
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Inicializa o serviço de otimização de imagens
        logger.info('Inicializando serviço de otimização de imagens');
        await imageOptimizationService.initialize();
        
        // Inicializa o WebSocket
        logger.info('Inicializando WebSocket no App');
        socketService.initialize();
      } catch (error) {
        logger.error('Erro ao inicializar serviços', { error });
      }
    };
    
    initializeServices();

    // Limpa recursos quando o app é fechado
    return () => {
      logger.info('Desconectando WebSocket');
      socketService.disconnect();
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PaperProvider>
            {/*
              AuthProvider embrulha todo o AppNavigator,
              garantindo que qualquer tela (incluindo FlipBookScreen)
              tenha acesso ao AuthContext.
            */}
            <AuthProvider>
              <AppNavigator />
              <StatusBar style="auto" />
            </AuthProvider>
          </PaperProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </I18nextProvider>
  );
}