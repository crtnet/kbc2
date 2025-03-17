// src/screens/ViewBookScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, RefreshControl, Dimensions } from 'react-native';
import { Text, Button, Card, ActivityIndicator, Chip, Divider, IconButton, Portal, Dialog } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as bookService from '../services/bookService';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { socketService, BookProgressUpdate } from '../services/socketService';
import { logger } from '../utils/logger';

interface BookPage {
  pageNumber: number;
  text: string;
  imageUrl: string;
}

interface Book {
  _id: string;
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  secondaryCharacter?: string;
  setting: string;
  tone: string;
  ageRange: string;
  authorName: string;
  pages: BookPage[];
  pdfUrl?: string;
  status: 'processing' | 'generating_images' | 'images_completed' | 'generating_pdf' | 'completed' | 'error' | 'images_error';
  createdAt: string;
  metadata: {
    wordCount: number;
    pageCount: number;
    currentPage?: number;
    totalPages?: number;
    imagesCompleted?: boolean;
    pdfGenerationStarted?: boolean;
    pdfCompleted?: boolean;
    error?: string;
    pdfError?: string;
    lastUpdated?: string;
  };
}

function ViewBookScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { bookId } = route.params as { bookId: string };

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth > 768;
  
  // Override the default back button behavior
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.navigate('Home')}
          style={{ marginLeft: 8 }}
        />
      ),
    });
  }, [navigation]);

  const fetchBook = useCallback(async () => {
    try {
      setError(null);
      const response = await bookService.getBook(bookId);
      
      if (response && response.data) {
        setBook(response.data);
      } else {
        setError('Não foi possível carregar os dados do livro.');
      }
    } catch (err: any) {
      console.error('Erro ao buscar livro:', err);
      setError(err.response?.data?.error || 'Erro ao carregar o livro.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchBook();

    // Inicializa o WebSocket
    socketService.initialize().then((connected) => {
      logger.info('WebSocket inicializado na tela ViewBookScreen', { connected });
      
      // Se conectado com sucesso, autentica o usuário
      if (connected && user?.id) {
        socketService.authenticate(user.id);
      }
    });

    // Registra o listener para atualizações de progresso
    const removeListener = socketService.addListener('book_progress_update', 
      (data: BookProgressUpdate) => {
        // Só processa atualizações para este livro
        if (data.bookId === bookId) {
          logger.info('Recebida atualização de progresso via WebSocket', { 
            bookId, 
            status: data.status,
            progress: data.progress,
            currentPage: data.currentPage,
            totalPages: data.totalPages
          });
          
          // Atualiza o livro com as informações recebidas
          setBook(prevBook => {
            if (!prevBook) return null;
            
            // Cria uma cópia atualizada do livro
            const updatedBook = { ...prevBook };
            
            // Atualiza o status
            updatedBook.status = data.status;
            
            // Atualiza os metadados
            updatedBook.metadata = {
              ...updatedBook.metadata,
              currentPage: data.currentPage || updatedBook.metadata.currentPage,
              totalPages: data.totalPages || updatedBook.metadata.totalPages,
              lastUpdated: new Date().toISOString()
            };
            
            // Se o PDF foi concluído, atualiza a URL
            if (data.status === 'completed' && data.pdfUrl) {
              updatedBook.pdfUrl = data.pdfUrl;
            }
            
            return updatedBook;
          });
        }
      }
    );

    // Polling como fallback para o WebSocket
    let interval: NodeJS.Timeout;
    interval = setInterval(() => {
      // Só faz polling se o livro não estiver completo ou em erro
      if (!book || (
        book.status !== 'completed' && 
        book.status !== 'error' && 
        book.status !== 'images_error'
      )) {
        fetchBook();
      }
    }, 5000); // Polling a cada 5 segundos como fallback
    
    return () => {
      if (interval) clearInterval(interval);
      removeListener(); // Remove o listener do WebSocket
    };
  }, [fetchBook, bookId, user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBook();
  }, [fetchBook]);

  const handleViewPDF = () => {
    if (book && book.pdfUrl) {
      navigation.navigate('ViewBookPDF', { 
        bookId: book._id,
        title: book.title
      });
    }
  };

  const handleDeleteBook = async () => {
    try {
      setDeleting(true);
      setError(null);
      
      console.log('Iniciando exclusão do livro:', bookId);
      await bookService.deleteBook(bookId);
      
      console.log('Livro excluído com sucesso:', bookId);
      setShowDeleteDialog(false);
      
      // Exibe mensagem de sucesso antes de navegar
      setError('Livro excluído com sucesso!');
      setTimeout(() => {
        navigation.navigate('Home'); // Navega para a tela Home em vez de voltar
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao excluir livro:', err);
      
      // Exibe mensagem de erro mais amigável
      let errorMessage = 'Erro ao excluir o livro.';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(`Erro ao excluir livro: ${errorMessage}`);
      setShowDeleteDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleFlipBook = () => {
    if (book) {
      navigation.navigate('FlipBook', { 
        bookId: book._id,
        title: book.title,
        pages: book.pages
      });
    }
  };

  const renderStatusChip = () => {
    if (!book) return null;

    let color = '';
    let icon = '';
    let label = '';

    switch (book.status) {
      case 'processing':
        color = 'blue';
        icon = 'clock-outline';
        label = 'Processando';
        break;
      case 'generating_images':
        color = 'orange';
        icon = 'image-outline';
        label = 'Gerando imagens';
        break;
      case 'images_completed':
        color = 'purple';
        icon = 'image-check-outline';
        label = 'Imagens concluídas';
        break;
      case 'generating_pdf':
        color = 'teal';
        icon = 'file-pdf-outline';
        label = 'Gerando PDF';
        break;
      case 'completed':
        color = 'green';
        icon = 'check-circle-outline';
        label = 'Concluído';
        break;
      case 'error':
        color = 'red';
        icon = 'alert-circle-outline';
        label = 'Erro';
        break;
      case 'images_error':
        color = 'red';
        icon = 'image-broken-variant';
        label = 'Erro nas imagens';
        break;
      default:
        color = 'gray';
        icon = 'help-circle-outline';
        label = 'Desconhecido';
    }

    return (
      <Chip 
        icon={icon} 
        mode="outlined" 
        style={[styles.statusChip, { borderColor: color }]}
        textStyle={{ color }}
      >
        {label}
      </Chip>
    );
  };

  const renderProgressIndicator = () => {
    if (!book || book.status === 'completed') return null;

    // Determina o progresso com base no status
    let progress = 0;
    let statusMessage = '';
    let totalPages = book.metadata.totalPages || book.metadata.pageCount || 0;
    let currentPage = book.metadata.currentPage || 0;

    switch (book.status) {
      case 'processing':
        progress = 10; // Valor fixo para indicar que está processando
        statusMessage = 'Gerando história e preparando personagens...';
        break;
      case 'generating_images':
        // Calcula o progresso com base nas imagens geradas
        progress = totalPages > 0 ? Math.round((currentPage / totalPages) * 80) : 10;
        statusMessage = `Gerando imagens (${currentPage}/${totalPages})...`;
        break;
      case 'images_completed':
        progress = 80;
        statusMessage = 'Imagens concluídas. Preparando para gerar PDF...';
        break;
      case 'generating_pdf':
        progress = 90;
        statusMessage = 'Gerando PDF final...';
        break;
      case 'error':
      case 'images_error':
        progress = 100;
        statusMessage = book.metadata.error || book.metadata.pdfError || 'Ocorreu um erro durante o processamento.';
        break;
      default:
        progress = 0;
        statusMessage = 'Aguardando processamento...';
    }

    return (
      <Card style={styles.progressCard}>
        <Card.Content>
          <Text style={styles.progressTitle}>Progresso da geração</Text>
          <View style={styles.progressBarContainer}>
            <View style={[
              styles.progressBar, 
              { width: `${progress}%` },
              (book.status === 'error' || book.status === 'images_error') && { backgroundColor: 'red' }
            ]} />
          </View>
          
          {book.status === 'generating_images' && (
            <Text style={styles.progressText}>
              {currentPage} de {totalPages} imagens geradas ({Math.round(progress)}%)
            </Text>
          )}
          
          <Text style={[
            styles.progressInfo,
            (book.status === 'error' || book.status === 'images_error') && styles.errorText
          ]}>
            {statusMessage}
          </Text>
          
          {book.metadata.lastUpdated && (
            <Text style={styles.timestampText}>
              Última atualização: {new Date(book.metadata.lastUpdated).toLocaleString('pt-BR')}
            </Text>
          )}
          
          {(book.status === 'generating_images' || book.status === 'generating_pdf') && (
            <Text style={styles.infoText}>
              Este processo pode levar alguns minutos. As imagens estão sendo otimizadas para melhor desempenho.
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderPageNavigation = () => {
    if (!book || !book.pages || book.pages.length === 0) return null;

    return (
      <View style={styles.pageNavigation}>
        <Button
          mode="outlined"
          onPress={() => setCurrentPage(prev => Math.max(0, prev - 1))}
          disabled={currentPage === 0}
          icon="chevron-left"
        >
          Anterior
        </Button>
        <Text style={styles.pageIndicator}>
          Página {currentPage + 1} de {book.pages.length}
        </Text>
        <Button
          mode="outlined"
          onPress={() => setCurrentPage(prev => Math.min(book.pages.length - 1, prev + 1))}
          disabled={currentPage === book.pages.length - 1}
          icon="chevron-right"
          contentStyle={{ flexDirection: 'row-reverse' }}
        >
          Próxima
        </Button>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando livro...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={fetchBook}>
          Tentar Novamente
        </Button>
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Livro não encontrado.</Text>
        <Button mode="contained" onPress={() => navigation.navigate('Home')}>
          Voltar para Home
        </Button>
      </View>
    );
  }

  const currentPageData = book.pages[currentPage];

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{book.title}</Text>
              <Text style={styles.author}>por {book.authorName}</Text>
            </View>
            <View style={styles.actionsContainer}>
              {renderStatusChip()}
              <IconButton
                icon="delete"
                size={24}
                onPress={() => setShowDeleteDialog(true)}
              />
            </View>
          </View>

          <View style={styles.metadataContainer}>
            <Chip icon="book-outline" style={styles.metadataChip}>
              {book.genre}
            </Chip>
            <Chip icon="theme-light-dark" style={styles.metadataChip}>
              {book.theme}
            </Chip>
            <Chip icon="account-outline" style={styles.metadataChip}>
              {book.ageRange} anos
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {renderProgressIndicator()}

      {book.status === 'completed' && (
        <View style={styles.actionButtonsContainer}>
          <Button 
            mode="contained" 
            icon="book-open-variant" 
            onPress={handleFlipBook}
            style={styles.actionButton}
          >
            Folhear Livro
          </Button>
          <Button 
            mode="contained" 
            icon="file-pdf" 
            onPress={handleViewPDF}
            style={styles.actionButton}
            disabled={!book.pdfUrl}
          >
            Ver PDF
          </Button>
        </View>
      )}

      {(book.status === 'error' || book.status === 'images_error') && (
        <Card style={[styles.progressCard, styles.errorCard]}>
          <Card.Content>
            <Text style={styles.errorTitle}>Erro na geração do livro</Text>
            <Text style={styles.errorDescription}>
              {book.metadata.error || book.metadata.pdfError || 'Ocorreu um erro durante o processamento do livro.'}
            </Text>
            <Button 
              mode="contained" 
              icon="refresh" 
              onPress={fetchBook}
              style={styles.retryButton}
            >
              Verificar novamente
            </Button>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.detailsCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Detalhes da História</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Personagem Principal:</Text>
            <Text style={styles.detailValue}>{book.mainCharacter}</Text>
          </View>
          
          {book.secondaryCharacter && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Personagem Secundário:</Text>
              <Text style={styles.detailValue}>{book.secondaryCharacter}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Cenário:</Text>
            <Text style={styles.detailValue}>{book.setting}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tom:</Text>
            <Text style={styles.detailValue}>{book.tone}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Palavras:</Text>
            <Text style={styles.detailValue}>{book.metadata.wordCount}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Páginas:</Text>
            <Text style={styles.detailValue}>{book.metadata.pageCount}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Criado em:</Text>
            <Text style={styles.detailValue}>
              {new Date(book.createdAt).toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {(book.status === 'completed' || book.pages.some(page => page.text)) && (
        <Card style={styles.previewCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Prévia do Livro</Text>
            <Divider style={styles.divider} />
            
            {renderPageNavigation()}
            
            <View style={[styles.pageContainer, isTablet && styles.tabletPageContainer]}>
              {currentPageData?.imageUrl ? (
                <React.Fragment>
                  {/* Componente de carregamento de imagem com tratamento de erro */}
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ 
                        uri: currentPageData.imageUrl.startsWith('http') 
                          ? (currentPageData.imageUrl.includes('oaidalleapiprodscus.blob.core.windows.net') 
                             ? `/assets/images/fallback-page.jpg?t=${Date.now()}` // Use fallback for DALL-E URLs
                             : currentPageData.imageUrl)
                          : `${API_URL}${currentPageData.imageUrl}?t=${Date.now()}` // Add timestamp to prevent caching
                      }}
                      style={styles.pageImage}
                      resizeMode="contain"
                      onError={(e) => {
                        console.error('Erro ao carregar imagem:', e.nativeEvent.error);
                        // Log detailed error for debugging
                        console.log('Image URL that failed:', currentPageData.imageUrl);
                      }}
                    />
                    {/* Overlay de carregamento */}
                    <ActivityIndicator 
                      size="large" 
                      color="#2196F3" 
                      style={styles.imageLoadingIndicator} 
                    />
                  </View>
                </React.Fragment>
              ) : (
                <View style={styles.noImageContainer}>
                  <Text style={styles.noImageText}>Imagem não disponível</Text>
                </View>
              )}
              
              <View style={styles.pageTextContainer}>
                <Text style={styles.pageNumber}>Página {currentPageData?.pageNumber || currentPage + 1}</Text>
                {currentPageData?.text ? (
                  <Text style={styles.pageText}>{currentPageData.text}</Text>
                ) : (
                  <Text style={styles.noContentText}>Texto não disponível para esta página</Text>
                )}
              </View>
            </View>
            
            {renderPageNavigation()}
          </Card.Content>
        </Card>
      )}

      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Excluir Livro</Dialog.Title>
          <Dialog.Content>
            <Text>Tem certeza que deseja excluir "{book.title}"? Esta ação não pode ser desfeita.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancelar</Button>
            <Button 
              mode="contained" 
              onPress={handleDeleteBook} 
              loading={deleting}
              disabled={deleting}
              style={{ backgroundColor: 'red' }}
            >
              Excluir
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    marginBottom: 20,
    fontSize: 16,
    color: 'red',
    textAlign: 'center'
  },
  headerCard: {
    margin: 10,
    elevation: 2
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  titleContainer: {
    flex: 1
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  author: {
    fontSize: 16,
    color: '#666',
    marginTop: 4
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusChip: {
    marginRight: 8
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10
  },
  metadataChip: {
    margin: 4
  },
  progressCard: {
    margin: 10,
    elevation: 2,
    backgroundColor: '#f0f8ff'
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 5
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2196F3'
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  progressInfo: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666'
  },
  infoText: {
    fontSize: 13,
    color: '#1976d2',
    marginTop: 10,
    fontStyle: 'italic'
  },
  timestampText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5
  },
  errorCard: {
    backgroundColor: '#ffebee'
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10
  },
  errorDescription: {
    fontSize: 14,
    color: '#d32f2f',
    marginBottom: 15
  },
  retryButton: {
    backgroundColor: '#d32f2f',
    marginTop: 10
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    margin: 10
  },
  actionButton: {
    flex: 1,
    margin: 5
  },
  detailsCard: {
    margin: 10,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },
  divider: {
    marginBottom: 15
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10
  },
  detailLabel: {
    flex: 1,
    fontWeight: 'bold',
    color: '#666'
  },
  detailValue: {
    flex: 2
  },
  previewCard: {
    margin: 10,
    elevation: 2,
    marginBottom: 20
  },
  pageNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10
  },
  pageIndicator: {
    fontSize: 14,
    color: '#666'
  },
  pageContainer: {
    marginVertical: 15
  },
  tabletPageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  pageImage: {
    width: '100%',
    height: 300,
    marginBottom: 15,
    borderRadius: 8
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  imageLoadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20
  },
  noImageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 15
  },
  noImageText: {
    fontSize: 16,
    color: '#666'
  },
  pageTextContainer: {
    flex: 1,
    padding: 10
  },
  pageNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5
  },
  pageText: {
    fontSize: 16,
    lineHeight: 24
  },
  noContentText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#999'
  }
});

export default ViewBookScreen;