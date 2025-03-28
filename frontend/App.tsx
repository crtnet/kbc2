// App.tsx
import React, { useEffect, useState } from 'react';
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
import { hasInternetConnection } from './src/utils/networkUtils';
import { config } from './src/config';
import { Alert, View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { api } from './src/services/api';
import { initializeNetworkConnections, reconnectToBackend } from './src/utils/network/apiInitializer';

export default function App() {
  console.log('=== App.tsx is mounting ===');
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Inicializa serviços quando o app é carregado
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Verifica conexão com a internet
        const hasInternet = await hasInternetConnection();
        if (!hasInternet) {
          logger.error('Sem conexão com a internet');
          setInitError('Sem conexão com a internet. Verifique sua conexão e tente novamente.');
          setIsInitializing(false);
          return;
        }

        // Inicializa as conexões de rede (API e Socket.IO)
        logger.info('Inicializando conexões de rede');
        const networkInitialized = await initializeNetworkConnections();
        
        if (!networkInitialized) {
          logger.error('Falha ao inicializar conexões de rede');
          setInitError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
          setIsInitializing(false);
          return;
        }
        
        // Inicializa o serviço de otimização de imagens
        logger.info('Inicializando serviço de otimização de imagens');
        await imageOptimizationService.initialize();
        
        setIsInitializing(false);
      } catch (error) {
        logger.error('Erro ao inicializar serviços', { 
          error: error instanceof Error ? error.message : 'Erro desconhecido' 
        });
        setInitError('Ocorreu um erro ao inicializar o aplicativo. Tente novamente mais tarde.');
        setIsInitializing(false);
      }
    };
    
    initializeServices();

    // Limpa recursos quando o app é fechado
    return () => {
      logger.info('Desconectando WebSocket');
      socketService.disconnect();
    };
  }, [retryCount]);

  // Função para tentar novamente a conexão
  const handleRetry = () => {
    setIsInitializing(true);
    setInitError(null);
    setRetryCount(prev => prev + 1);
  };

  // Exibe tela de carregamento durante a inicialização
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Inicializando aplicativo...</Text>
      </View>
    );
  }

  // Exibe tela de erro se houver falha na inicialização
  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Erro de Conexão</Text>
        <Text style={styles.errorText}>{initError}</Text>
        <Text style={styles.errorHint}>
          Verifique sua conexão com a internet e tente novamente.
          Se o problema persistir, entre em contato com o suporte.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d9534f',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});