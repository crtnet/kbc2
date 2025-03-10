// src/screens/FlipBookScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  Image, 
  Animated, 
  PanResponder,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { Text, IconButton, Portal, Modal, Button } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as bookService from '../services/bookService';

interface BookPage {
  pageNumber: number;
  text: string;
  imageUrl: string;
}

interface RouteParams {
  bookId: string;
  title: string;
  pages: BookPage[];
}

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

function FlipBookScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { bookId, title, pages: initialPages } = route.params as RouteParams;

  const [pages, setPages] = useState<BookPage[]>(initialPages || []);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  
  const position = useRef(new Animated.Value(0)).current;
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Carrega as páginas do livro se não foram fornecidas
  useEffect(() => {
    if (!initialPages || initialPages.length === 0) {
      const fetchBook = async () => {
        try {
          setLoading(true);
          const response = await bookService.getBook(bookId);
          if (response && response.data && response.data.pages) {
            setPages(response.data.pages);
          }
        } catch (error) {
          console.error('Erro ao carregar páginas do livro:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchBook();
    }
  }, [bookId, initialPages]);

  // Configura o PanResponder para detectar gestos de deslize
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        position.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD && currentIndex < pages.length - 1) {
          // Deslize para a esquerda (próxima página)
          goToNextPage();
        } else if (gestureState.dx > SWIPE_THRESHOLD && currentIndex > 0) {
          // Deslize para a direita (página anterior)
          goToPrevPage();
        } else {
          // Retorna à posição original
          Animated.spring(position, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
        
        // Mostra os controles quando o usuário interage
        showControlsTemporarily();
      },
    })
  ).current;

  // Mostra os controles temporariamente e os esconde após um tempo
  const showControlsTemporarily = () => {
    setShowControls(true);
    
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  // Limpa o timeout quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, []);

  // Navega para a próxima página com animação
  const goToNextPage = () => {
    if (currentIndex < pages.length - 1) {
      Animated.timing(position, {
        toValue: -width,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        position.setValue(0);
        setCurrentIndex(currentIndex + 1);
      });
    }
  };

  // Navega para a página anterior com animação
  const goToPrevPage = () => {
    if (currentIndex > 0) {
      Animated.timing(position, {
        toValue: width,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        position.setValue(0);
        setCurrentIndex(currentIndex - 1);
      });
    }
  };

  // Renderiza a capa do livro
  const renderCover = () => {
    return (
      <View style={styles.coverContainer}>
        <Text style={styles.coverTitle}>{title}</Text>
        {pages[0]?.imageUrl && (
          <Image
            source={{ uri: pages[0].imageUrl }}
            style={styles.coverImage}
            resizeMode="contain"
          />
        )}
        <Text style={styles.coverInstructions}>
          Deslize para começar a leitura
        </Text>
      </View>
    );
  };

  // Renderiza uma página do livro
  const renderPage = (page: BookPage) => {
    return (
      <View style={styles.pageContainer}>
        <Text style={styles.pageNumber}>Página {page.pageNumber}</Text>
        
        {page.imageUrl && (
          <Image
            source={{ uri: page.imageUrl }}
            style={styles.pageImage}
            resizeMode="contain"
          />
        )}
        
        <Text style={styles.pageText}>{page.text}</Text>
      </View>
    );
  };

  // Renderiza a contracapa do livro
  const renderBackCover = () => {
    return (
      <View style={styles.backCoverContainer}>
        <Text style={styles.backCoverTitle}>Fim</Text>
        <Text style={styles.backCoverText}>
          Obrigado por ler "{title}"
        </Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Voltar
        </Button>
      </View>
    );
  };

  // Renderiza o conteúdo atual com base no índice
  const renderContent = () => {
    if (currentIndex === 0) {
      return renderCover();
    } else if (currentIndex === pages.length) {
      return renderBackCover();
    } else {
      return renderPage(pages[currentIndex - 1]);
    }
  };

  // Renderiza o modal de ajuda
  const renderHelpModal = () => {
    return (
      <Portal>
        <Modal
          visible={showHelpModal}
          onDismiss={() => setShowHelpModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Como usar o Flipbook</Text>
          
          <View style={styles.helpItem}>
            <IconButton icon="gesture-swipe-horizontal" size={24} />
            <Text style={styles.helpText}>
              Deslize para a esquerda ou direita para virar as páginas
            </Text>
          </View>
          
          <View style={styles.helpItem}>
            <IconButton icon="gesture-tap" size={24} />
            <Text style={styles.helpText}>
              Toque na tela para mostrar ou esconder os controles
            </Text>
          </View>
          
          <View style={styles.helpItem}>
            <IconButton icon="arrow-left-right" size={24} />
            <Text style={styles.helpText}>
              Use os botões de navegação para ir para a página anterior ou próxima
            </Text>
          </View>
          
          <Button 
            mode="contained" 
            onPress={() => setShowHelpModal(false)}
            style={styles.closeButton}
          >
            Entendi
          </Button>
        </Modal>
      </Portal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />
      
      <TouchableOpacity
        activeOpacity={1}
        style={styles.contentContainer}
        onPress={showControlsTemporarily}
        {...panResponder.panHandlers}
      >
        <Animated.View
          style={[
            styles.animatedContainer,
            { transform: [{ translateX: position }] }
          ]}
        >
          {renderContent()}
        </Animated.View>
      </TouchableOpacity>
      
      {showControls && (
        <View style={styles.controlsContainer}>
          <View style={styles.topControls}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => navigation.goBack()}
            />
            <Text style={styles.pageIndicator}>
              {currentIndex === 0 
                ? 'Capa' 
                : currentIndex === pages.length 
                  ? 'Fim' 
                  : `${currentIndex}/${pages.length - 1}`}
            </Text>
            <IconButton
              icon="help-circle-outline"
              size={24}
              onPress={() => setShowHelpModal(true)}
            />
          </View>
          
          <View style={styles.bottomControls}>
            <IconButton
              icon="chevron-left"
              size={36}
              onPress={goToPrevPage}
              disabled={currentIndex === 0}
              style={[styles.navButton, currentIndex === 0 && styles.disabledButton]}
            />
            <IconButton
              icon="chevron-right"
              size={36}
              onPress={goToNextPage}
              disabled={currentIndex === pages.length}
              style={[styles.navButton, currentIndex === pages.length && styles.disabledButton]}
            />
          </View>
        </View>
      )}
      
      {renderHelpModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  animatedContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center'
  },
  coverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 20,
    elevation: 5
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
  },
  coverImage: {
    width: width * 0.8,
    height: height * 0.5,
    marginVertical: 20
  },
  coverInstructions: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 20
  },
  pageContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 20,
    elevation: 5
  },
  pageNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
    textAlign: 'center'
  },
  pageImage: {
    width: '100%',
    height: height * 0.4,
    marginBottom: 20
  },
  pageText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'justify'
  },
  backCoverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 20,
    elevation: 5
  },
  backCoverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20
  },
  backCoverText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40
  },
  backButton: {
    marginTop: 20
  },
  controlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    pointerEvents: 'box-none'
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10
  },
  pageIndicator: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10
  },
  navButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    margin: 10
  },
  disabledButton: {
    opacity: 0.5
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  helpText: {
    fontSize: 16,
    flex: 1
  },
  closeButton: {
    marginTop: 20
  }
});

export default FlipBookScreen;