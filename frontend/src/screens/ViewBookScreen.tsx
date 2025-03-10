// src/screens/ViewBookScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, RefreshControl, Dimensions } from 'react-native';
import { Text, Button, Card, ActivityIndicator, Chip, Divider, IconButton, Portal, Dialog } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as bookService from '../services/bookService';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';

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
  status: 'processing' | 'generating' | 'completed' | 'error';
  createdAt: string;
  metadata: {
    wordCount: number;
    pageCount: number;
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

    // Polling para atualizar o status do livro enquanto estiver processando
    let interval: NodeJS.Timeout;
    
    if (book && (book.status === 'processing' || book.status === 'generating')) {
      interval = setInterval(() => {
        fetchBook();
      }, 5000); // Atualiza a cada 5 segundos
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchBook, book?.status]);

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
      await bookService.deleteBook(bookId);
      setShowDeleteDialog(false);
      navigation.goBack();
    } catch (err: any) {
      console.error('Erro ao excluir livro:', err);
      setError(err.response?.data?.error || 'Erro ao excluir o livro.');
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
      case 'generating':
        color = 'orange';
        icon = 'image-outline';
        label = 'Gerando imagens';
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
    if (!book || book.status === 'completed' || book.status === 'error') return null;

    const totalPages = book.metadata.pageCount;
    const pagesWithImages = book.pages.filter(page => page.imageUrl).length;
    const progress = totalPages > 0 ? (pagesWithImages / totalPages) * 100 : 0;

    return (
      <Card style={styles.progressCard}>
        <Card.Content>
          <Text style={styles.progressTitle}>Progresso da geração</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {pagesWithImages} de {totalPages} páginas processadas ({Math.round(progress)}%)
          </Text>
          <Text style={styles.progressInfo}>
            {book.status === 'processing' 
              ? 'Gerando história e imagens...' 
              : 'Finalizando a criação do PDF...'}
          </Text>
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
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Voltar
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
            icon="file-pdf-box" 
            onPress={handleViewPDF}
            style={styles.actionButton}
            disabled={!book.pdfUrl}
          >
            Ver PDF
          </Button>
        </View>
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

      {book.status === 'completed' && (
        <Card style={styles.previewCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Prévia do Livro</Text>
            <Divider style={styles.divider} />
            
            {renderPageNavigation()}
            
            <View style={[styles.pageContainer, isTablet && styles.tabletPageContainer]}>
              {currentPageData.imageUrl && (
                <Image
                  source={{ uri: currentPageData.imageUrl }}
                  style={styles.pageImage}
                  resizeMode="contain"
                />
              )}
              
              <View style={styles.pageTextContainer}>
                <Text style={styles.pageNumber}>Página {currentPageData.pageNumber}</Text>
                <Text style={styles.pageText}>{currentPageData.text}</Text>
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
  }
});

export default ViewBookScreen;