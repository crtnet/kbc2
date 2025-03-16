// src/services/socketService.ts

import { io, Socket } from 'socket.io-client';
import { config } from '../config';
import { logger } from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface para as atualizações de progresso do livro
export interface BookProgressUpdate {
  bookId: string;
  status: 'processing' | 'generating_images' | 'images_completed' | 'generating_pdf' | 'completed' | 'error' | 'images_error';
  progress: number;
  currentPage?: number;
  totalPages?: number;
  message: string;
  pdfUrl?: string;
  error?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<Function>> = new Map();
  private connectionEnabled = true;
  private initialized = false;

  /**
   * Inicializa a conexão com o Socket.IO
   */
  async initialize(): Promise<boolean> {
    if (this.socket && this.socket.connected) {
      logger.info('Socket já está inicializado e conectado');
      return true;
    }

    if (this.initialized) {
      logger.info('Socket já está em processo de inicialização');
      return false;
    }

    this.initialized = true;

    try {
      logger.info('Inicializando conexão Socket.IO');
      
      // Verifica se a conexão está habilitada
      if (!this.connectionEnabled) {
        logger.info('Conexão Socket.IO está desabilitada');
        this.initialized = false;
        return false;
      }
      
      // Obtém o token de autenticação
      const token = await AsyncStorage.getItem('token');
      
      this.socket = io(config.apiUrl, {
        transports: ['websocket', 'polling'], // Tenta websocket primeiro, depois polling
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 10000,
        autoConnect: true,
        forceNew: true,
        auth: {
          token: token || undefined
        }
      });

      this.setupEventListeners();
      
      // Espera pela conexão ou erro
      return new Promise((resolve) => {
        const connectTimeout = setTimeout(() => {
          logger.warn('Timeout ao conectar Socket.IO');
          this.initialized = false;
          resolve(false);
        }, 5000);
        
        this.socket?.once('connect', () => {
          clearTimeout(connectTimeout);
          this.initialized = true;
          resolve(true);
        });
        
        this.socket?.once('connect_error', () => {
          clearTimeout(connectTimeout);
          this.initialized = false;
          resolve(false);
        });
      });
    } catch (error) {
      logger.error('Erro ao inicializar Socket.IO', { error });
      this.disableConnection();
      this.initialized = false;
      return false;
    }
  }

  /**
   * Desabilita tentativas de conexão para evitar erros repetidos
   */
  private disableConnection(): void {
    this.connectionEnabled = false;
    logger.warn('Conexão Socket.IO desabilitada devido a erros persistentes');
    
    // Reabilita após 5 minutos
    setTimeout(() => {
      this.connectionEnabled = true;
      logger.info('Conexão Socket.IO reabilitada');
    }, 5 * 60 * 1000);
  }

  /**
   * Configura os listeners de eventos do Socket.IO
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      logger.info('Socket.IO conectado');
      this.reconnectAttempts = 0;
      
      // Autentica automaticamente após a conexão
      this.authenticateFromStorage();
    });

    this.socket.on('disconnect', (reason) => {
      logger.warn('Socket.IO desconectado', { reason });
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      logger.error('Erro de conexão Socket.IO', { 
        error: error.message,
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts
      });

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.warn('Número máximo de tentativas de reconexão atingido');
        this.socket?.disconnect();
        this.disableConnection();
      }
    });

    // Adiciona listeners personalizados que foram registrados antes da conexão
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket?.on(event, callback);
      });
    });
    
    // Adiciona listener específico para atualizações de progresso do livro
    this.socket.on('book_progress_update', (data: BookProgressUpdate) => {
      logger.info('Recebida atualização de progresso do livro', { 
        bookId: data.bookId,
        status: data.status,
        progress: data.progress,
        currentPage: data.currentPage,
        totalPages: data.totalPages
      });
    });
  }

  /**
   * Tenta autenticar usando o ID do usuário armazenado
   */
  private async authenticateFromStorage(): Promise<void> {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        this.authenticate(userId);
      }
    } catch (error) {
      logger.error('Erro ao autenticar a partir do storage', { error });
    }
  }

  /**
   * Autentica o usuário no Socket.IO
   * @param userId ID do usuário
   */
  authenticate(userId: string): void {
    if (!this.connectionEnabled) {
      logger.info('Autenticação ignorada - conexão Socket.IO está desabilitada');
      return;
    }
    
    if (!this.socket || !this.socket.connected) {
      logger.warn('Tentativa de autenticação sem conexão Socket.IO');
      this.initialize().then(connected => {
        if (connected && userId && this.socket) {
          logger.info('Autenticando usuário no Socket.IO após inicialização', { userId });
          this.socket.emit('authenticate', userId);
        }
      });
      return;
    }

    if (userId && this.socket) {
      logger.info('Autenticando usuário no Socket.IO', { userId });
      this.socket.emit('authenticate', userId);
      
      // Armazena o ID do usuário para reconexões
      AsyncStorage.setItem('userId', userId).catch(error => {
        logger.error('Erro ao armazenar ID do usuário', { error });
      });
    }
  }

  /**
   * Adiciona um listener para um evento
   * @param event Nome do evento
   * @param callback Função de callback
   * @returns Função para remover o listener
   */
  addListener(event: string, callback: Function): () => void {
    // Registra o callback no mapa de listeners
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    // Se o socket já estiver conectado, adiciona o listener diretamente
    if (this.socket) {
      this.socket.on(event, callback as any);
    }
    
    // Retorna uma função para remover o listener
    return () => this.removeListener(event, callback);
  }
  
  /**
   * Remove um listener específico
   * @param event Nome do evento
   * @param callback Função de callback
   */
  removeListener(event: string, callback: Function): void {
    // Remove o callback do mapa de listeners
    if (this.listeners.has(event)) {
      this.listeners.get(event)?.delete(callback);
    }

    // Se o socket estiver conectado, remove o listener
    if (this.socket) {
      this.socket.off(event, callback as any);
    }
  }

  /**
   * Adiciona um listener para um evento (método legado)
   * @param event Nome do evento
   * @param callback Função de callback
   */
  on(event: string, callback: Function): void {
    this.addListener(event, callback);
  }

  /**
   * Remove um listener para um evento (método legado)
   * @param event Nome do evento
   * @param callback Função de callback
   */
  off(event: string, callback: Function): void {
    this.removeListener(event, callback);
  }

  /**
   * Emite um evento para o servidor
   * @param event Nome do evento
   * @param data Dados a serem enviados
   */
  emit(event: string, data: any): void {
    if (!this.connectionEnabled) {
      logger.info(`Emissão ignorada - conexão Socket.IO está desabilitada`);
      return;
    }
    
    if (!this.socket || !this.socket.connected) {
      logger.warn(`Tentativa de emitir evento '${event}' sem conexão Socket.IO`);
      this.initialize().then(connected => {
        if (connected && this.socket) {
          logger.info(`Emitindo evento '${event}' após inicialização`, { data });
          this.socket.emit(event, data);
        }
      });
      return;
    }

    logger.info(`Emitindo evento '${event}'`, { data });
    this.socket.emit(event, data);
  }

  /**
   * Desconecta o socket
   */
  disconnect(): void {
    if (this.socket) {
      logger.info('Desconectando Socket.IO');
      this.socket.disconnect();
      this.socket = null;
      this.initialized = false;
    }
  }
  
  /**
   * Verifica se o socket está conectado
   */
  isConnected(): boolean {
    return !!this.socket?.connected;
  }
  
  /**
   * Força uma nova tentativa de conexão
   */
  reconnect(): void {
    if (!this.connectionEnabled) {
      logger.info('Reconexão ignorada - conexão Socket.IO está desabilitada');
      return;
    }
    
    this.disconnect();
    this.reconnectAttempts = 0;
    this.initialize();
  }
}

// Exporta uma instância única do serviço
export const socketService = new SocketService();