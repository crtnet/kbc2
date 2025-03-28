// src/screens/CreateBookScreen.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, Card, Snackbar, Portal } from 'react-native-paper';
import AvatarSelector from '../screens/AvatarSelector';
import { useAuth } from '../contexts/AuthContext';
import * as bookService from '../services/bookService';
import * as avatarService from '../services/avatarService';
import { AvatarThumbnail } from '../components/avatar/preview';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CreateBookData } from '../services/bookService';

type RootStackParamList = {
  CreateBook: undefined;
  ViewBook: { bookId: string };
  // ... outras rotas
};

type CreateBookScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreateBook'>;
};

// Variável global para armazenar dados temporários
declare global {
  var mainCharacterAvatarData: string | null;
  var secondaryCharacterAvatarData: string | null;
}

// Definir os tipos literais
type Genre = 'adventure' | 'fantasy' | 'mystery';
type Theme = 'friendship' | 'courage' | 'kindness';
type Tone = 'fun' | 'adventurous' | 'calm';
type AgeRange = '1-2' | '3-4' | '5-6' | '7-8' | '9-10' | '11-12';

// Type guards
const isValidGenre = (value: string): value is Genre => 
  ['adventure', 'fantasy', 'mystery'].includes(value);
const isValidTheme = (value: string): value is Theme => 
  ['friendship', 'courage', 'kindness'].includes(value);
const isValidTone = (value: string): value is Tone => 
  ['fun', 'adventurous', 'calm'].includes(value);
const isValidAgeRange = (value: string): value is AgeRange => 
  ['1-2', '3-4', '5-6', '7-8', '9-10', '11-12'].includes(value);

interface BookData {
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  mainCharacterAvatar?: string;
  secondaryCharacter?: string;
  secondaryCharacterAvatar?: string;
  setting: string;
  tone: string;
  ageRange: string;
  prompt?: string;
  authorName?: string;
  language?: string;
  characterDescription?: string;
  secondaryCharacterDescription?: string;
  environmentDescription?: string;
}

function CreateBookScreen({ navigation }: CreateBookScreenProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [visible, setVisible] = useState<boolean>(false);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);

  const [mainAvatarModalVisible, setMainAvatarModalVisible] = useState<boolean>(false);
  const [secondaryAvatarModalVisible, setSecondaryAvatarModalVisible] = useState<boolean>(false);

  const [bookData, setBookData] = useState<BookData>({
    title: '',
    authorName: '',
    genre: 'adventure' as Genre,
    theme: 'friendship' as Theme,
    mainCharacter: '',
    mainCharacterAvatar: '',
    secondaryCharacter: '',
    secondaryCharacterAvatar: '',
    setting: '',
    tone: 'fun' as Tone,
    ageRange: '5-6' as AgeRange,
    characterDescription: '',
    secondaryCharacterDescription: '',
    environmentDescription: ''
  });

  // Limpar o intervalo quando o componente for desmontado
  React.useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  const handleNext = () => {
    if (step === 1 && (!bookData.title || !bookData.authorName)) {
      setError('Por favor, insira o título do livro e o nome do autor');
      setVisible(true);
      return;
    }

    if (step === 2 && (!bookData.mainCharacter || !bookData.setting || !bookData.characterDescription || !bookData.environmentDescription)) {
      setError('Por favor, preencha todos os campos, incluindo as descrições detalhadas');
      setVisible(true);
      return;
    }

    if (step < 3) {
      setStep(step + 1);
    } else {
      handleCreateBook();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  // Função para selecionar um avatar diretamente (bypass do modal)
  const selectDefaultAvatar = async (isMainCharacter: boolean) => {
    try {
      // Determina a categoria com base no tipo de personagem
      const category = isMainCharacter ? 'children' : 'adults';
      
      // Obter avatares padrão
      const avatars = await avatarService.getAvatars(category, 'cartoon');
      
      if (avatars && avatars.length > 0) {
        // Seleciona o primeiro avatar da lista
        const selectedAvatar = avatars[0];
        
        // Gera uma descrição padrão para o avatar
        const defaultDescription = isMainCharacter 
          ? `${bookData.mainCharacter || 'Personagem principal'} é uma criança com aparência amigável, expressão alegre e postura confiante. Veste roupas coloridas e confortáveis adequadas para aventuras.`
          : `${bookData.secondaryCharacter || 'Personagem secundário'} é um adulto com expressão gentil e postura acolhedora. Veste roupas em tons neutros e tem uma aparência confiável.`;
        
        if (isMainCharacter) {
          setBookData({ 
            ...bookData, 
            mainCharacterAvatar: selectedAvatar,
            characterDescription: defaultDescription
          });
        } else {
          setBookData({ 
            ...bookData, 
            secondaryCharacterAvatar: selectedAvatar,
            secondaryCharacterDescription: defaultDescription
          });
        }
        
        console.log(`Avatar ${isMainCharacter ? 'principal' : 'secundário'} selecionado:`, selectedAvatar);
        console.log(`Descrição padrão gerada para ${isMainCharacter ? 'personagem principal' : 'personagem secundário'}`);
      } else {
        console.error('Nenhum avatar disponível');
        setError('Nenhum avatar disponível. Tente novamente.');
        setVisible(true);
      }
    } catch (err) {
      console.error('Erro ao selecionar avatar padrão:', err);
      setError('Erro ao selecionar avatar. Tente novamente.');
      setVisible(true);
    }
  };

  const handleCreateBook = async () => {
    try {
      if (!user) {
        setError('Usuário não autenticado');
        setVisible(true);
        return;
      }

      // Validação final antes de enviar
      if (!bookData.title || !bookData.authorName) {
        setError('Título do livro e nome do autor são obrigatórios');
        setVisible(true);
        return;
      }

      if (!bookData.mainCharacter || !bookData.mainCharacterAvatar) {
        setError('Nome e avatar do personagem principal são obrigatórios');
        setVisible(true);
        return;
      }

      if (!bookData.setting) {
        setError('Cenário da história é obrigatório');
        setVisible(true);
        return;
      }

      if (!bookData.characterDescription || !bookData.environmentDescription) {
        setError('Descrições do personagem e do ambiente são obrigatórias');
        setVisible(true);
        return;
      }

      // Se tem personagem secundário, deve ter avatar e descrição
      if (bookData.secondaryCharacter) {
        if (!bookData.secondaryCharacterAvatar) {
          setError('Se você adicionar um personagem secundário, deve selecionar um avatar para ele');
          setVisible(true);
          return;
        }
        
        if (!bookData.secondaryCharacterDescription) {
          setError('Por favor, adicione uma descrição para o personagem secundário');
          setVisible(true);
          return;
        }
      }

      // Validar e converter os valores para os tipos corretos
      if (!isValidGenre(bookData.genre)) {
        throw new Error('Gênero inválido');
      }
      if (!isValidTheme(bookData.theme)) {
        throw new Error('Tema inválido');
      }
      if (!isValidTone(bookData.tone)) {
        throw new Error('Tom inválido');
      }
      if (!isValidAgeRange(bookData.ageRange)) {
        throw new Error('Faixa etária inválida');
      }

      setLoading(true);
      setError('');
      setProgressMessage('Iniciando criação do seu livro... Por favor, aguarde.');
      setVisible(true);

      // Criar o prompt final
      const finalPrompt = `Create a ${bookData.tone} children's story about ${bookData.mainCharacter} who ${bookData.characterDescription || ''}. The story takes place in ${bookData.setting} where ${bookData.environmentDescription || ''}. ${bookData.secondaryCharacter ? `Another character in the story is ${bookData.secondaryCharacter} who ${bookData.secondaryCharacterDescription || ''}.` : ''} The story should teach about ${bookData.theme} and be appropriate for children aged ${bookData.ageRange} years.`;

      // Preparar os dados do livro para envio
      const bookDataToSend: CreateBookData = {
        title: bookData.title,
        genre: bookData.genre as Genre,
        theme: bookData.theme as Theme,
        mainCharacter: bookData.mainCharacter,
        mainCharacterAvatar: bookData.mainCharacterAvatar || '',
        secondaryCharacter: bookData.secondaryCharacter || '',
        secondaryCharacterAvatar: bookData.secondaryCharacterAvatar || '',
        setting: bookData.setting,
        tone: bookData.tone as Tone,
        ageRange: bookData.ageRange as AgeRange,
        prompt: finalPrompt.trim(),
        authorName: bookData.authorName || '',
        language: 'pt-BR',
        characterDescription: bookData.characterDescription || '',
        secondaryCharacterDescription: bookData.secondaryCharacterDescription || '',
        environmentDescription: bookData.environmentDescription || ''
      };

      console.log('Iniciando criação de livro com dados:', bookDataToSend);

      // Atualizar mensagem para o usuário
      setProgressMessage('Iniciando criação do livro... Por favor, aguarde. Isso pode levar alguns minutos.');
      
      try {
        // Usar o serviço com abordagem assíncrona
        const response = await bookService.createBook(bookDataToSend);
        console.log('Resposta da inicialização de criação do livro:', response);

        if (!response.bookId) {
          throw new Error('ID do livro não retornado pelo servidor');
        }
        
        // Atualizar mensagem para o usuário
        setProgressMessage('Livro iniciado com sucesso! Acompanhando o progresso...');
        
        // Iniciar verificação periódica do status
        let checkCount = 0;
        let consecutiveErrorCount = 0;
        const MAX_CONSECUTIVE_ERRORS = 5;
        
        const interval = setInterval(async () => {
          try {
            checkCount++;
            
            // Verificar o status atual do livro
            const statusResponse = await bookService.checkBookStatus(response.bookId);
            console.log(`Verificação de status #${checkCount}:`, statusResponse);
            
            // Resetar contador de erros consecutivos
            consecutiveErrorCount = 0;
            
            // Atualizar a mensagem com base no status
            if (statusResponse.status === 'completed') {
              // Livro concluído
              clearInterval(interval);
              setProgressMessage('Livro criado com sucesso! Redirecionando...');
              
              // Pequeno delay para mostrar a mensagem de sucesso
              setTimeout(() => {
                setLoading(false);
                navigation.navigate('ViewBook', { bookId: response.bookId });
              }, 1500);
            } else if (statusResponse.status === 'failed') {
              // Livro falhou
              clearInterval(interval);
              setError('Houve um problema na criação do livro. Por favor, tente novamente.');
              setLoading(false);
            } else {
              // Livro ainda em processamento
              setProgressMessage(`${statusResponse.message} (${statusResponse.progress}% concluído) Tempo estimado restante: ${statusResponse.estimatedTimeRemaining}`);
              
              // Se já verificamos muitas vezes (mais de 30 = ~5 minutos), oferecemos opção de continuar em segundo plano
              if (checkCount > 30) {
                clearInterval(interval);
                setProgressMessage('O livro está demorando mais do que o esperado. Você pode continuar aguardando ou verificar mais tarde na sua biblioteca.');
                setLoading(false);
              }
            }
          } catch (statusError) {
            console.error('Erro ao verificar status:', statusError);
            
            // Incrementar contador de erros consecutivos
            consecutiveErrorCount++;
            
            // Se tivermos muitos erros consecutivos, paramos de verificar
            if (consecutiveErrorCount >= MAX_CONSECUTIVE_ERRORS) {
              clearInterval(interval);
              setProgressMessage('Não foi possível verificar o status do livro, mas ele continua sendo processado. Você pode verificar mais tarde na sua biblioteca.');
              setLoading(false);
            }
          }
        }, 10000); // Verifica a cada 10 segundos
        
        // Armazenar o intervalo no estado
        setStatusCheckInterval(interval);
        
      } catch (requestError: any) {
        console.error('Erro ao iniciar criação do livro:', requestError);
        
        // Mensagem de erro mais amigável baseada no tipo de erro
        let errorMessage = 'Erro ao criar livro. Tente novamente.';
        
        if (requestError.message && requestError.message.includes('timeout')) {
          errorMessage = 'O servidor demorou muito para responder. Isso pode acontecer devido à alta demanda. Por favor, tente novamente em alguns minutos.';
        } else if (requestError.message && requestError.message.includes('Network Error')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (requestError.response?.data?.details) {
          errorMessage = requestError.response.data.details;
        } else if (requestError.message) {
          errorMessage = requestError.message;
        }
        
        setError(errorMessage);
        setLoading(false);
        throw requestError;
      }
      
    } catch (err: any) {
      console.error('Erro ao criar livro:', err);
      let errorMsg = 'Erro ao criar livro. Tente novamente.';
      
      if (err.message && err.message.includes('timeout')) {
        errorMsg = 'O servidor demorou muito para responder. Isso pode acontecer devido à alta demanda. Por favor, tente novamente em alguns minutos.';
      } else if (err.message && err.message.includes('Network Error')) {
        errorMsg = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (err.response?.data?.details) {
        errorMsg = err.response.data.details;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      setVisible(true);
      setLoading(false);
    }
  };

  // Passo 1: Título e Gênero
  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Informações Básicas</Text>
      <TextInput
        label="Título do Livro"
        value={bookData.title}
        onChangeText={(text) => setBookData({ ...bookData, title: text })}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Nome do Autor"
        value={bookData.authorName}
        onChangeText={(text) => setBookData({ ...bookData, authorName: text })}
        mode="outlined"
        style={styles.input}
      />
      <Text style={styles.label}>Gênero</Text>
      <SegmentedButtons
        value={bookData.genre}
        onValueChange={(value) => setBookData({ ...bookData, genre: value })}
        buttons={[
          { value: 'adventure', label: 'Aventura' },
          { value: 'fantasy', label: 'Fantasia' },
          { value: 'mystery', label: 'Mistério' }
        ]}
        style={styles.segmentedButton}
      />
    </View>
  );

  // Passo 2: Personagens e Ambiente
  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Personagens e Ambiente</Text>
      
      <View style={styles.characterContainer}>
        <View style={styles.characterInputContainer}>
          <TextInput
            label="Nome do Personagem Principal"
            value={bookData.mainCharacter}
            onChangeText={(text) => setBookData({ ...bookData, mainCharacter: text })}
            mode="outlined"
            style={styles.characterInput}
          />
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => {
              // Preparar os dados do avatar para restauração
              if (bookData.mainCharacterAvatar && bookData.mainCharacterAvatar.startsWith('CUSTOM||')) {
                // Usar window como uma forma de passar dados para o componente
                window.mainCharacterAvatarData = bookData.mainCharacterAvatar;
                console.log('Dados do avatar principal preparados para restauração:', 
                  bookData.mainCharacterAvatar.substring(0, 50) + '...');
              } else {
                window.mainCharacterAvatarData = null;
                console.log('Nenhum avatar personalizado para restaurar (principal)');
              }
              
              // Abre o modal de seleção de avatar com suporte para personalização
              setMainAvatarModalVisible(true);
            }}
          >
            {bookData.mainCharacterAvatar ? (
              <AvatarThumbnail 
                avatarIdentifier={bookData.mainCharacterAvatar}
                size={60}
                style={styles.avatarPreview}
                onDescriptionGenerated={(description) => {
                  if (description && !bookData.characterDescription) {
                    setBookData(prev => ({
                      ...prev,
                      characterDescription: description
                    }));
                    console.log('Descrição do avatar principal gerada automaticamente');
                  }
                }}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text>Adicionar Avatar</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.infoText}>
          Selecione um avatar e descreva detalhadamente o personagem. O sistema analisará o avatar e usará a descrição para criar ilustrações consistentes.
        </Text>

        {/* **NOVO**: Campo para descrição do personagem */}
        <TextInput
          label="Descrição Detalhada do Personagem Principal"
          value={bookData.characterDescription}
          onChangeText={(text) => setBookData({ ...bookData, characterDescription: text })}
          mode="outlined"
          style={styles.input}
          placeholder="Descreva detalhadamente a aparência, roupas, cores, expressão facial e características do personagem..."
          multiline
          numberOfLines={4}
        />
        <Text style={styles.helperText}>
          Uma descrição detalhada ajuda na consistência visual. Inclua cor dos cabelos, olhos, roupas, 
          acessórios, expressão facial e características marcantes do personagem.
        </Text>

        <View style={styles.characterInputContainer}>
          <TextInput
            label="Nome do Personagem Secundário (opcional)"
            value={bookData.secondaryCharacter}
            onChangeText={(text) => setBookData({ ...bookData, secondaryCharacter: text })}
            mode="outlined"
            style={styles.characterInput}
          />
          {bookData.secondaryCharacter && (
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => {
                // Preparar os dados do avatar para restauração
                if (bookData.secondaryCharacterAvatar && bookData.secondaryCharacterAvatar.startsWith('CUSTOM||')) {
                  // Usar window como uma forma de passar dados para o componente
                  window.secondaryCharacterAvatarData = bookData.secondaryCharacterAvatar;
                  console.log('Dados do avatar secundário preparados para restauração:', 
                    bookData.secondaryCharacterAvatar.substring(0, 50) + '...');
                } else {
                  window.secondaryCharacterAvatarData = null;
                  console.log('Nenhum avatar personalizado para restaurar (secundário)');
                }
                
                // Abre o modal de seleção de avatar com suporte para personalização
                setSecondaryAvatarModalVisible(true);
              }}
            >
              {bookData.secondaryCharacterAvatar ? (
                <AvatarThumbnail 
                  avatarIdentifier={bookData.secondaryCharacterAvatar}
                  size={60}
                  style={styles.avatarPreview}
                  onDescriptionGenerated={(description) => {
                    if (description && !bookData.secondaryCharacterDescription) {
                      setBookData(prev => ({
                        ...prev,
                        secondaryCharacterDescription: description
                      }));
                      console.log('Descrição do avatar secundário gerada automaticamente');
                    }
                  }}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text>Adicionar Avatar</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Campo para descrição do personagem secundário (condicional) */}
      {bookData.secondaryCharacter && (
        <>
          <TextInput
            label="Descrição Detalhada do Personagem Secundário"
            value={bookData.secondaryCharacterDescription}
            onChangeText={(text) => setBookData({ ...bookData, secondaryCharacterDescription: text })}
            mode="outlined"
            style={styles.input}
            placeholder="Descreva detalhadamente a aparência, roupas, cores, expressão facial e características do personagem secundário..."
            multiline
            numberOfLines={4}
          />
          <Text style={styles.helperText}>
            Uma descrição detalhada ajuda na consistência visual. Inclua cor dos cabelos, olhos, roupas, 
            acessórios, expressão facial e características marcantes do personagem.
          </Text>
        </>
      )}

      <TextInput
        label="Cenário da História"
        value={bookData.setting}
        onChangeText={(text) => setBookData({ ...bookData, setting: text })}
        mode="outlined"
        style={styles.input}
        placeholder="Ex: floresta encantada, cidade mágica..."
      />

      <Text style={styles.infoText}>
        Descreva detalhadamente o ambiente. Esta descrição será usada para gerar imagens consistentes e imersivas para o livro.
      </Text>

      <TextInput
        label="Descrição Detalhada do Ambiente"
        value={bookData.environmentDescription}
        onChangeText={(text) => setBookData({ ...bookData, environmentDescription: text })}
        mode="outlined"
        style={styles.input}
        placeholder="Descreva detalhadamente o ambiente, cores, iluminação, elementos característicos, atmosfera..."
        multiline
        numberOfLines={4}
      />
      <Text style={styles.helperText}>
        Detalhes do ambiente enriquecem as ilustrações. Inclua cores predominantes, objetos importantes,
        iluminação, clima e elementos que caracterizam o cenário.
      </Text>

      <AvatarSelector
        visible={mainAvatarModalVisible}
        onDismiss={() => setMainAvatarModalVisible(false)}
        onSelectAvatar={(avatar) => {
          console.log('Avatar principal selecionado:', typeof avatar === 'string' ? avatar.substring(0, 50) + '...' : avatar);
          
          // Verificar se é um avatar personalizado (novo formato)
          if (typeof avatar === 'string' && avatar.startsWith('CUSTOM||')) {
            try {
              console.log('Avatar personalizado detectado, processando...');
              
              // Extrair partes do identificador usando os delimitadores
              const parts = avatar.split('||CUSTOM_AVATAR_DATA||');
              if (parts.length !== 2) {
                throw new Error('Formato de avatar personalizado inválido');
              }
              
              const faceUrl = parts[0].replace('CUSTOM||', '');
              
              console.log('URL da face extraída:', faceUrl);
              
              // Validar URL da face
              if (faceUrl && faceUrl.startsWith('http')) {
                // Armazenar o avatar completo (incluindo os dados serializados) no estado
                setBookData((prevData) => ({
                  ...prevData,
                  mainCharacterAvatar: avatar
                }));
                
                // Atualizar também a variável global para persistência
                window.mainCharacterAvatarData = avatar;
                
                console.log('Avatar personalizado armazenado com sucesso');
              } else {
                throw new Error('URL da face inválida no avatar personalizado');
              }
            } catch (error) {
              console.error('Erro ao processar avatar personalizado:', error);
              const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
              setBookData((prevData) => ({
                ...prevData,
                mainCharacterAvatar: defaultAvatar
              }));
              
              // Limpar dados inválidos
              window.mainCharacterAvatarData = null;
            }
          }
          // Verificar se é uma URL simples (avatar padrão)
          else if (typeof avatar === 'string' && avatar.startsWith('http')) {
            // URL válida, atualizar o estado
            setBookData((prevData) => ({
              ...prevData,
              mainCharacterAvatar: avatar
            }));
            
            // Limpar dados de avatar personalizado
            window.mainCharacterAvatarData = null;
          } else {
            // Formato inválido, usar um avatar padrão
            console.log('Avatar inválido recebido, usando padrão');
            const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
            setBookData((prevData) => ({
              ...prevData,
              mainCharacterAvatar: defaultAvatar
            }));
            
            // Limpar dados de avatar personalizado
            window.mainCharacterAvatarData = null;
          }
          
          setMainAvatarModalVisible(false);
        }}
        title="Selecione o Avatar do Personagem Principal"
        characterType="child"
        enableCustomization={true}
      />

      <AvatarSelector
        visible={secondaryAvatarModalVisible}
        onDismiss={() => setSecondaryAvatarModalVisible(false)}
        onSelectAvatar={(avatar) => {
          console.log('Avatar secundário selecionado:', typeof avatar === 'string' ? avatar.substring(0, 50) + '...' : avatar);
          
          // Verificar se é um avatar personalizado (novo formato)
          if (typeof avatar === 'string' && avatar.startsWith('CUSTOM||')) {
            try {
              console.log('Avatar personalizado detectado, processando...');
              
              // Extrair partes do identificador usando os delimitadores
              const parts = avatar.split('||CUSTOM_AVATAR_DATA||');
              if (parts.length !== 2) {
                throw new Error('Formato de avatar personalizado inválido');
              }
              
              const faceUrl = parts[0].replace('CUSTOM||', '');
              
              console.log('URL da face extraída:', faceUrl);
              
              // Validar URL da face
              if (faceUrl && faceUrl.startsWith('http')) {
                // Armazenar o avatar completo (incluindo os dados serializados) no estado
                setBookData((prevData) => ({
                  ...prevData,
                  secondaryCharacterAvatar: avatar
                }));
                
                // Atualizar também a variável global para persistência
                window.secondaryCharacterAvatarData = avatar;
                
                console.log('Avatar personalizado armazenado com sucesso');
              } else {
                throw new Error('URL da face inválida no avatar personalizado');
              }
            } catch (error) {
              console.error('Erro ao processar avatar personalizado:', error);
              const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/4140/4140061.png';
              setBookData((prevData) => ({
                ...prevData,
                secondaryCharacterAvatar: defaultAvatar
              }));
              
              // Limpar dados inválidos
              window.secondaryCharacterAvatarData = null;
            }
          }
          // Verificar se é uma URL simples (avatar padrão)
          else if (typeof avatar === 'string' && avatar.startsWith('http')) {
            // URL válida, atualizar o estado
            setBookData((prevData) => ({
              ...prevData,
              secondaryCharacterAvatar: avatar
            }));
            
            // Limpar dados de avatar personalizado
            window.secondaryCharacterAvatarData = null;
          } else {
            // Formato inválido, usar um avatar padrão
            console.log('Avatar inválido recebido, usando padrão');
            const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/4140/4140061.png';
            setBookData((prevData) => ({
              ...prevData,
              secondaryCharacterAvatar: defaultAvatar
            }));
            
            // Limpar dados de avatar personalizado
            window.secondaryCharacterAvatarData = null;
          }
          
          setSecondaryAvatarModalVisible(false);
        }}
        title="Selecione o Avatar do Personagem Secundário"
        characterType="adult"
        enableCustomization={true}
      />

      {/* Removemos os botões de fallback pois agora temos o sistema de personalização */}
    </View>
  );

  // Passo 3: Tema, Tom e Faixa Etária
  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Tema, Tom e Faixa Etária</Text>
      <Text style={styles.label}>Tema Principal</Text>
      <SegmentedButtons
        value={bookData.theme}
        onValueChange={(value) => setBookData({ ...bookData, theme: value })}
        buttons={[
          { value: 'friendship', label: 'Amizade' },
          { value: 'courage', label: 'Coragem' },
          { value: 'kindness', label: 'Bondade' }
        ]}
        style={styles.segmentedButton}
      />
      <Text style={styles.label}>Tom da Narrativa</Text>
      <SegmentedButtons
        value={bookData.tone}
        onValueChange={(value) => setBookData({ ...bookData, tone: value })}
        buttons={[
          { value: 'fun', label: 'Divertido' },
          { value: 'adventurous', label: 'Aventureiro' },
          { value: 'calm', label: 'Calmo' }
        ]}
        style={styles.segmentedButton}
      />
      <Text style={styles.label}>Faixa Etária</Text>
      <SegmentedButtons
        value={bookData.ageRange}
        onValueChange={(value) => setBookData({ ...bookData, ageRange: value })}
        buttons={[
          { value: '1-2', label: '1-2 anos' },
          { value: '3-4', label: '3-4 anos' },
          { value: '5-6', label: '5-6 anos' },
          { value: '7-8', label: '7-8 anos' },
          { value: '9-10', label: '9-10 anos' },
          { value: '11-12', label: '11-12 anos' }
        ]}
        style={styles.segmentedButton}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          {/* Indicador de Progresso */}
          <View style={styles.progressContainer}>
            {[1, 2, 3].map((item) => (
              <View
                key={item}
                style={[
                  styles.progressItem,
                  { backgroundColor: item <= step ? '#1976d2' : '#e0e0e0' }
                ]}
              />
            ))}
          </View>

          {/* Conteúdo do Passo */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {/* Adicionar mensagem de progresso */}
          {progressMessage && (
            <Text style={styles.progressMessage}>
              {progressMessage}
            </Text>
          )}

          {/* Botões de Navegação */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={handleBack}
              style={styles.button}
              disabled={loading}
            >
              {step === 1 ? 'Cancelar' : 'Voltar'}
            </Button>
            <Button
              mode="contained"
              onPress={handleNext}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              {step === 3 ? 'Criar Livro' : 'Próximo'}
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Snackbar
        visible={visible}
        onDismiss={() => {
          // Só permite fechar o Snackbar se não estiver carregando
          if (!loading) {
            setVisible(false);
          }
        }}
        duration={loading ? 100000 : 3000} // Durante o carregamento, mantém visível por muito tempo
        style={[
          styles.snackbar,
          loading && error.includes('sucesso') ? styles.successSnackbar : null,
          loading && !error.includes('sucesso') ? styles.loadingSnackbar : null,
          !loading && error.includes('Erro') ? styles.errorSnackbar : null
        ]}
        action={{
          label: loading ? 'Aguarde...' : 'OK',
          onPress: () => {
            if (!loading) {
              setVisible(false);
            }
          },
        }}
      >
        {error}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  card: {
    margin: 10,
    elevation: 2
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: 'transparent'
  },
  progressItem: {
    flex: 1,
    height: 4,
    marginHorizontal: 2,
    borderRadius: 2
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20
  },
  input: {
    marginBottom: 15
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666'
  },
  infoText: {
    fontSize: 14,
    marginBottom: 10,
    color: '#1976d2',
    fontStyle: 'italic'
  },
  helperText: {
    fontSize: 12,
    marginTop: -10,
    marginBottom: 15,
    color: '#666',
    fontStyle: 'italic',
    paddingHorizontal: 5,
  },
  segmentedButton: {
    marginBottom: 15
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    backgroundColor: 'transparent'
  },
  button: {
    flex: 1,
    marginHorizontal: 5
  },
  characterContainer: {
    marginBottom: 15,
    backgroundColor: 'transparent'
  },
  characterInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'transparent'
  },
  characterInput: {
    flex: 1,
    marginRight: 10
  },
  avatarButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    // Add shadow properties with background color
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3
  },
  avatarPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#ffffff' // Adding white background
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0' // Adding background color
  },
  fallbackButton: {
    marginTop: 10,
    marginBottom: 15,
    backgroundColor: '#4caf50'
  },
  // Novos estilos para o Snackbar
  snackbar: {
    marginBottom: 20,
  },
  loadingSnackbar: {
    backgroundColor: '#2196F3', // Azul para carregamento
  },
  successSnackbar: {
    backgroundColor: '#4CAF50', // Verde para sucesso
  },
  errorSnackbar: {
    backgroundColor: '#F44336', // Vermelho para erro
  },
  progressMessage: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 5,
    color: '#1976d2',
    textAlign: 'center'
  }
});

export default CreateBookScreen;