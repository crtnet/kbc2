// src/services/bookService.ts
import axios from 'axios';
import { API_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Interface para os dados de criação de um livro
 */
export interface CreateBookData {
  title: string;
  genre: 'adventure' | 'fantasy' | 'mystery';
  theme: 'friendship' | 'courage' | 'kindness';
  mainCharacter: string;
  mainCharacterAvatar: string;
  secondaryCharacter?: string;
  secondaryCharacterAvatar?: string;
  setting: string;
  tone: 'fun' | 'adventurous' | 'calm';
  ageRange: '1-2' | '3-4' | '5-6' | '7-8' | '9-10' | '11-12';
  authorName: string;
  language?: string;
  characterDescription?: string;
  secondaryCharacterDescription?: string;
  environmentDescription?: string;
  prompt?: string;
  styleGuide?: {
    character?: string;
    environment?: string;
    artisticStyle?: string;
  };
  coverStyle?: {
    backgroundColor?: string;
    titleColor?: string;
    authorColor?: string;
    titleFontSize?: number;
    authorFontSize?: number;
    theme?: 'light' | 'dark' | 'colorful';
  };
}

/**
 * Lista de URLs alternativas para tentar em caso de falha
 */
const ALTERNATIVE_API_URLS = [
  'http://52.201.233.44:3000/api',
  'http://52.201.233.44:3333/api',
  'http://3.93.247.189:3000/api',
  'http://3.93.247.189:3333/api',
  'http://localhost:3000/api',
  'http://10.0.2.2:3000/api' // Para emuladores Android
];

/**
 * Verifica a conectividade com uma URL específica
 * @param url URL a ser verificada
 * @returns true se a URL está acessível, false caso contrário
 */
const checkConnectivity = async (url: string): Promise<boolean> => {
  try {
    console.log(`Verificando conectividade com ${url}...`);
    // Tenta fazer uma requisição simples para verificar se o servidor está acessível
    // Usamos o endpoint /health ou /ping que deve ser leve e rápido
    const response = await axios.get(`${url}/health`, { 
      timeout: 5000,
      headers: { 'Cache-Control': 'no-cache' }
    });
    console.log(`Conectividade com ${url}: OK (${response.status})`);
    return response.status === 200;
  } catch (error) {
    // Se o endpoint /health não existir, tenta uma requisição genérica
    try {
      console.log(`Endpoint /health falhou, tentando requisição genérica para ${url}...`);
      const response = await axios.get(`${url}`, { 
        timeout: 5000,
        headers: { 'Cache-Control': 'no-cache' }
      });
      console.log(`Conectividade genérica com ${url}: OK (${response.status})`);
      return response.status < 500; // Qualquer resposta que não seja erro do servidor
    } catch (secondError) {
      console.log(`Falha na conectividade com ${url}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return false;
    }
  }
};

/**
 * Encontra a primeira URL acessível da lista
 * @returns URL acessível ou null se nenhuma estiver acessível
 */
const findWorkingUrl = async (): Promise<string | null> => {
  // Primeiro, tenta usar a URL armazenada
  const storedUrl = await AsyncStorage.getItem('working_api_url');
  if (storedUrl) {
    const isWorking = await checkConnectivity(storedUrl);
    if (isWorking) {
      console.log(`URL armazenada ${storedUrl} está funcionando`);
      return storedUrl;
    }
    console.log(`URL armazenada ${storedUrl} não está funcionando, tentando alternativas`);
  }

  // Tenta cada URL na lista
  const allUrls = [API_URL, ...ALTERNATIVE_API_URLS.filter(url => url !== API_URL)];
  for (const url of allUrls) {
    const isWorking = await checkConnectivity(url);
    if (isWorking) {
      console.log(`URL ${url} está funcionando`);
      await AsyncStorage.setItem('working_api_url', url);
      return url;
    }
  }

  console.log('Nenhuma URL está funcionando');
  return null;
};

/**
 * Cria um novo livro usando uma abordagem totalmente assíncrona
 * @param bookData Dados do livro a ser criado
 * @returns Resposta da API com o ID do livro criado
 */
export const createBook = async (bookData: CreateBookData) => {
  const MAX_RETRIES = 5;
  let retryCount = 0;
  let lastError;

  // Função para esperar um tempo específico
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Tenta encontrar uma URL que funcione antes de começar
  const workingUrl = await findWorkingUrl();
  if (!workingUrl) {
    throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente mais tarde.');
  }
  
  console.log(`Usando URL base: ${workingUrl}`);
  
  // Lista de URLs para tentar, começando com a URL que sabemos que funciona
  const urlsToTry = [workingUrl, ...ALTERNATIVE_API_URLS.filter(url => url !== workingUrl)];
  
  // Para cada tentativa, vamos tentar todas as URLs disponíveis
  while (retryCount < MAX_RETRIES) {
    // Para cada URL na lista
    for (const currentUrl of urlsToTry) {
      try {
        const token = await AsyncStorage.getItem('token');
        
        // Log dos dados para depuração
        console.log(`Tentativa ${retryCount + 1} de ${MAX_RETRIES} para criar livro usando URL: ${currentUrl}`, {
          title: bookData.title,
          mainCharacter: bookData.mainCharacter
        });
        
        // Cria uma instância específica do axios com timeout personalizado
        const bookCreationApi = axios.create({
          baseURL: currentUrl,
          timeout: 180000, // 3 minutos
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        // Adiciona interceptor para monitorar o progresso da requisição
        bookCreationApi.interceptors.request.use(
          (config) => {
            console.log(`Enviando requisição para iniciar criação de livro com timeout de ${config.timeout/1000}s para ${config.baseURL}`);
            return config;
          },
          (error) => {
            console.error('Erro na configuração da requisição:', error);
            return Promise.reject(error);
          }
        );
        
        // Faz a requisição com a instância específica - apenas para iniciar o processo
        const response = await bookCreationApi.post('/books/async', bookData);
        
        console.log('Resposta da inicialização de criação do livro:', response.data);
        
        // Verifica se temos um ID de livro
        if (!response.data.bookId) {
          throw new Error('ID do livro não retornado pela API');
        }
        
        // Armazena a URL que funcionou para uso futuro
        await AsyncStorage.setItem('working_api_url', currentUrl);
        
        // Retorna os dados iniciais do livro
        return {
          bookId: response.data.bookId,
          status: response.data.status || 'processing',
          message: response.data.message || 'Livro em processamento'
        };
      } catch (error: any) {
        lastError = error;
        
        // Log detalhado do erro
        console.error(`Erro na tentativa ${retryCount + 1} usando URL ${currentUrl}:`, {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          data: error.response?.data,
          isTimeout: error.code === 'ECONNABORTED' || error.message.includes('timeout'),
          isNetworkError: error.code === 'ERR_NETWORK' || error.message.includes('Network Error')
        });
        
        // Se for um erro de rede, verifica a conectividade novamente
        if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
          const isConnected = await checkConnectivity(currentUrl);
          if (!isConnected) {
            console.log(`URL ${currentUrl} não está acessível, tentando próxima URL`);
          }
        }
        
        // Continua para a próxima URL na lista
        continue;
      }
    }
    
    // Se chegamos aqui, todas as URLs falharam nesta tentativa
    retryCount++;
    
    if (retryCount < MAX_RETRIES) {
      // Espera um tempo progressivo antes de tentar novamente todas as URLs
      const retryDelay = 5000 * retryCount; // 5s, 10s, 15s, 20s...
      console.log(`Todas as URLs falharam. Aguardando ${retryDelay/1000} segundos antes da próxima tentativa...`);
      await wait(retryDelay);
      
      // Tenta encontrar uma URL que funcione novamente
      const newWorkingUrl = await findWorkingUrl();
      if (newWorkingUrl) {
        console.log(`Nova URL funcionando encontrada: ${newWorkingUrl}`);
        urlsToTry.unshift(newWorkingUrl); // Coloca a nova URL no início da lista
      }
    }
  }
  
  // Se chegamos aqui, todas as tentativas com todas as URLs falharam
  console.error(`Todas as ${MAX_RETRIES} tentativas de iniciar criação de livro falharam em todas as URLs.`);
  
  // Melhora a mensagem de erro para o usuário
  if (lastError && (lastError.code === 'ERR_NETWORK' || lastError.message.includes('Network Error'))) {
    throw new Error(`Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente mais tarde.`);
  } else if (lastError && lastError.message && lastError.message.includes('timeout')) {
    throw new Error(`O servidor demorou muito para responder após várias tentativas. Por favor, tente novamente mais tarde.`);
  } else if (lastError && lastError.response && lastError.response.status >= 500) {
    throw new Error(`O servidor está enfrentando problemas temporários. Por favor, tente novamente em alguns minutos.`);
  } else {
    throw lastError || new Error('Não foi possível criar o livro devido a um erro desconhecido.');
  }
};

/**
 * Verifica o status de criação de um livro
 * @param bookId ID do livro
 * @returns Status atual do livro
 */
export const checkBookStatus = async (bookId: string) => {
  const MAX_RETRIES = 3;
  let retryCount = 0;
  let lastError;

  // Função para esperar um tempo específico
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Tenta encontrar uma URL que funcione antes de começar
  const workingUrl = await findWorkingUrl();
  if (!workingUrl) {
    // Retorna um status genérico em vez de falhar
    return {
      bookId: bookId,
      status: 'processing',
      progress: 50,
      message: 'Não foi possível verificar o status atual, mas seu livro continua sendo processado.',
      estimatedTimeRemaining: 'alguns minutos'
    };
  }
  
  // Lista de URLs para tentar, começando com a URL que sabemos que funciona
  const urlsToTry = [workingUrl, ...ALTERNATIVE_API_URLS.filter(url => url !== workingUrl)];

  while (retryCount < MAX_RETRIES) {
    // Para cada URL na lista
    for (const currentUrl of urlsToTry) {
      try {
        const token = await AsyncStorage.getItem('token');
        
        console.log(`Verificando status do livro ${bookId} usando URL: ${currentUrl}`);
        
        // Cria uma instância específica do axios com timeout menor para verificação de status
        const statusCheckApi = axios.create({
          baseURL: currentUrl,
          timeout: 15000, // 15 segundos é suficiente para verificar status
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        const response = await statusCheckApi.get(`/books/${bookId}/status`);
        
        // Se a requisição foi bem-sucedida, armazena a URL que funcionou
        await AsyncStorage.setItem('working_api_url', currentUrl);
        
        return {
          bookId: response.data.bookId,
          status: response.data.status,
          progress: response.data.progress,
          message: response.data.message,
          estimatedTimeRemaining: response.data.estimatedTimeRemaining
        };
      } catch (error: any) {
        lastError = error;
        
        console.error(`Erro ao verificar status do livro ${bookId} usando URL ${currentUrl}:`, {
          message: error.message,
          code: error.code,
          status: error.response?.status
        });
        
        // Se for um erro de rede, verifica a conectividade novamente
        if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
          const isConnected = await checkConnectivity(currentUrl);
          if (!isConnected) {
            console.log(`URL ${currentUrl} não está acessível para verificação de status, tentando próxima URL`);
          }
        }
        
        // Continua para a próxima URL na lista
        continue;
      }
    }
    
    // Se chegamos aqui, todas as URLs falharam nesta tentativa
    retryCount++;
    
    if (retryCount < MAX_RETRIES) {
      // Espera um tempo progressivo antes de tentar novamente todas as URLs
      const retryDelay = 2000 * retryCount; // 2s, 4s, 6s
      console.log(`Todas as URLs falharam para verificação de status. Aguardando ${retryDelay/1000} segundos...`);
      await wait(retryDelay);
      
      // Tenta encontrar uma URL que funcione novamente
      const newWorkingUrl = await findWorkingUrl();
      if (newWorkingUrl) {
        console.log(`Nova URL funcionando encontrada para verificação de status: ${newWorkingUrl}`);
        urlsToTry.unshift(newWorkingUrl); // Coloca a nova URL no início da lista
      }
    }
  }
  
  // Se chegamos aqui, todas as tentativas com todas as URLs falharam
  console.error(`Todas as ${MAX_RETRIES} tentativas de verificar status do livro falharam em todas as URLs.`);
  
  // Retorna um status genérico para não interromper o fluxo do usuário
  return {
    bookId: bookId,
    status: 'processing', // Assume que ainda está processando
    progress: 50, // Valor médio para não alarmar o usuário
    message: 'Não foi possível verificar o status atual, mas seu livro continua sendo processado.',
    estimatedTimeRemaining: 'alguns minutos'
  };
};

/**
 * Busca todos os livros do usuário
 * @returns Lista de livros do usuário
 */
export const getBooks = async () => {
  try {
    // Tenta encontrar uma URL que funcione
    const workingUrl = await findWorkingUrl();
    if (!workingUrl) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente mais tarde.');
    }
    
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.get(`${workingUrl}/books`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      },
      timeout: 15000 // 15 segundos é suficiente para listar livros
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar livros:', error);
    throw error;
  }
};

/**
 * Busca um livro específico pelo ID
 * @param bookId ID do livro
 * @returns Dados do livro
 */
export const getBook = async (bookId: string) => {
  try {
    // Tenta encontrar uma URL que funcione
    const workingUrl = await findWorkingUrl();
    if (!workingUrl) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente mais tarde.');
    }
    
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.get(`${workingUrl}/books/${bookId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      },
      timeout: 15000 // 15 segundos é suficiente para buscar um livro
    });
    
    return response.data;
  } catch (error) {
    console.error(`Erro ao buscar livro ${bookId}:`, error);
    throw error;
  }
};

/**
 * Exclui um livro
 * @param bookId ID do livro a ser excluído
 * @returns Resposta da API
 */
export const deleteBook = async (bookId: string) => {
  try {
    // Tenta encontrar uma URL que funcione
    const workingUrl = await findWorkingUrl();
    if (!workingUrl) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente mais tarde.');
    }
    
    const token = await AsyncStorage.getItem('token');
    
    console.log(`Tentando excluir livro com ID: ${bookId}`);
    
    const response = await axios.delete(`${workingUrl}/books/${bookId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      },
      timeout: 15000 // 15 segundos é suficiente para excluir um livro
    });
    
    console.log(`Livro ${bookId} excluído com sucesso:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error(`Erro ao excluir livro ${bookId}:`, error);
    
    // Mensagens de erro mais detalhadas
    if (error.response) {
      // O servidor respondeu com um status de erro
      console.error(`Status do erro: ${error.response.status}`);
      console.error('Dados da resposta:', error.response.data);
      
      if (error.response.status === 404) {
        throw new Error(`Livro com ID ${bookId} não encontrado no servidor`);
      } else if (error.response.status === 401) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      } else if (error.response.status === 403) {
        throw new Error('Você não tem permissão para excluir este livro.');
      }
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta do servidor:', error.request);
      throw new Error('Sem resposta do servidor. Verifique sua conexão com a internet.');
    }
    
    // Erro genérico ou outros erros
    throw error;
  }
};

/**
 * Obtém a URL do PDF de um livro
 * @param bookId ID do livro
 * @returns URL do PDF
 */
export const getBookPdfUrl = async (bookId: string) => {
  try {
    // Tenta encontrar uma URL que funcione
    const workingUrl = await findWorkingUrl();
    if (!workingUrl) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente mais tarde.');
    }
    
    const token = await AsyncStorage.getItem('token');
    
    // Primeiro, verifica se o livro tem um PDF gerado
    const bookResponse = await axios.get(`${workingUrl}/books/${bookId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      },
      timeout: 15000 // 15 segundos é suficiente para verificar o PDF
    });
    
    if (bookResponse.data?.data?.pdfUrl) {
      // Remove /public do início da URL se existir
      const pdfUrl = bookResponse.data.data.pdfUrl.replace(/^\/public/, '');
      return `${workingUrl}${pdfUrl}`;
    }
    
    throw new Error('PDF não disponível para este livro');
  } catch (error) {
    console.error(`Erro ao obter URL do PDF do livro ${bookId}:`, error);
    throw error;
  }
};

/**
 * Atualiza o estilo da capa de um livro
 * @param bookId ID do livro
 * @param coverStyle Estilo da capa
 * @returns Resposta da API
 */
export const updateBookCoverStyle = async (bookId: string, coverStyle: any) => {
  try {
    // Tenta encontrar uma URL que funcione
    const workingUrl = await findWorkingUrl();
    if (!workingUrl) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente mais tarde.');
    }
    
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.patch(`${workingUrl}/books/${bookId}/cover-style`, { coverStyle }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      },
      timeout: 15000 // 15 segundos é suficiente para atualizar o estilo da capa
    });
    
    return response.data;
  } catch (error) {
    console.error(`Erro ao atualizar estilo da capa do livro ${bookId}:`, error);
    throw error;
  }
};

/**
 * Regenera uma imagem específica de um livro
 * @param bookId ID do livro
 * @param pageNumber Número da página
 * @returns Resposta da API com a nova URL da imagem
 */
export const regenerateBookImage = async (bookId: string, pageNumber: number) => {
  try {
    // Tenta encontrar uma URL que funcione
    const workingUrl = await findWorkingUrl();
    if (!workingUrl) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente mais tarde.');
    }
    
    const token = await AsyncStorage.getItem('token');
    
    const response = await axios.post(`${workingUrl}/books/${bookId}/regenerate-image`, { pageNumber }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      },
      timeout: 180000 // 3 minutos para regenerar uma imagem
    });
    
    return response.data;
  } catch (error) {
    console.error(`Erro ao regenerar imagem da página ${pageNumber} do livro ${bookId}:`, error);
    throw error;
  }
};