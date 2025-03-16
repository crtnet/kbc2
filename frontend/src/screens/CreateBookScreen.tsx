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

interface BookData {
  title: string;
  genre: 'adventure' | 'fantasy' | 'mystery';
  theme: 'friendship' | 'courage' | 'kindness';
  mainCharacter: string;
  mainCharacterAvatar?: string;
  secondaryCharacter?: string;
  secondaryCharacterAvatar?: string;
  setting: string;
  tone: 'fun' | 'adventurous' | 'calm';
  ageRange: '1-2' | '3-4' | '5-6' | '7-8' | '9-10' | '11-12';
  prompt?: string;
  authorName?: string;
  language?: string;
  // Campos para descrição de personagem e ambiente
  characterDescription?: string;
  secondaryCharacterDescription?: string;
  environmentDescription?: string;
}

function CreateBookScreen({ navigation }) {
  const { user } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [visible, setVisible] = useState<boolean>(false);

  const [mainAvatarModalVisible, setMainAvatarModalVisible] = useState<boolean>(false);
  const [secondaryAvatarModalVisible, setSecondaryAvatarModalVisible] = useState<boolean>(false);

  const [bookData, setBookData] = useState<BookData>({
    title: '',
    authorName: '',
    genre: 'adventure',
    theme: 'friendship',
    mainCharacter: '',
    mainCharacterAvatar: '',
    secondaryCharacter: '',
    secondaryCharacterAvatar: '',
    setting: '',
    tone: 'fun',
    ageRange: '5-6',
    // Valores iniciais para descrições
    characterDescription: '',
    secondaryCharacterDescription: '',
    environmentDescription: ''
  });

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

      setLoading(true);

      // Construímos o prompt usando as descrições
      const finalPrompt = `
        Crie uma história infantil com o título "${bookData.title}".
        O gênero é ${bookData.genre}, o tema é ${bookData.theme}, 
        o tom é ${bookData.tone}, e se passa em ${bookData.setting}.
        ${
          bookData.secondaryCharacter 
            ? `A história deve focar em DOIS personagens principais:\n
               1. ${bookData.mainCharacter} (protagonista)\n
               2. ${bookData.secondaryCharacter} (deuteragonista)\n
               Ambos os personagens DEVEM ter papéis importantes na história, interagindo entre si e influenciando os eventos principais.`
            : `O personagem principal é ${bookData.mainCharacter}.`
        }
        A história é para crianças de ${bookData.ageRange} anos.
        A história deve ser escrita por ${bookData.authorName}.
        
        INSTRUÇÕES PARA GERAÇÃO DE IMAGENS:
        PERSONAGEM PRINCIPAL (${bookData.mainCharacter}):
        ${bookData.characterDescription || 'Personagem principal do livro'}
        
        ${bookData.secondaryCharacter ? `
        PERSONAGEM SECUNDÁRIO (${bookData.secondaryCharacter}):
        ${bookData.secondaryCharacterDescription || 'Personagem secundário do livro'}` : ''}
        
        AMBIENTE (${bookData.setting}):
        ${bookData.environmentDescription || `Ambiente do livro: ${bookData.setting}`}
        
        DIRETRIZES GERAIS PARA ILUSTRAÇÕES:
        - Mantenha um estilo de arte consistente em todo o livro
        - Use cores vibrantes e composições claras adequadas para livros infantis
        - Certifique-se de que os personagens principais tenham presença significativa em cada cena
        - Adapte o nível de detalhe e complexidade para a faixa etária de ${bookData.ageRange} anos
        - Crie cenas dinâmicas que complementem e enriqueçam a narrativa
        - As expressões faciais e linguagem corporal devem refletir claramente as emoções dos personagens
        
        IMPORTANTE:
        - A consistência visual dos personagens é CRUCIAL - use as descrições detalhadas como guia definitivo
        - As ilustrações devem manter o mesmo nível de qualidade e detalhamento em todo o livro
        - Cada cena deve ser memorável e cativante para o público infantil
      `;

      // Garantir que as descrições não estejam vazias
      const characterDesc = bookData.characterDescription || 
        `${bookData.mainCharacter} é um personagem de livro infantil com aparência amigável e expressiva`;
      
      const environmentDesc = bookData.environmentDescription || 
        `${bookData.setting} é um ambiente colorido e acolhedor para crianças`;

      // Preparar os dados do livro para envio
      const bookDataToSend = {
        title: bookData.title,
        genre: bookData.genre,
        theme: bookData.theme,
        mainCharacter: bookData.mainCharacter,
        mainCharacterAvatar: bookData.mainCharacterAvatar,
        secondaryCharacter: bookData.secondaryCharacter || '',
        secondaryCharacterAvatar: bookData.secondaryCharacterAvatar || '',
        setting: bookData.setting,
        tone: bookData.tone,
        ageRange: bookData.ageRange,
        prompt: finalPrompt.trim(),
        authorName: bookData.authorName,
        language: 'pt-BR',
        characterDescription: bookData.characterDescription || '',
        secondaryCharacterDescription: bookData.secondaryCharacterDescription || '',
        environmentDescription: bookData.environmentDescription || ''
      };

      console.log('Criando livro com dados:', bookDataToSend);

      const token = await AsyncStorage.getItem('token');
      console.log('Token atual:', token);

      const response = await bookService.createBook(bookDataToSend);
      console.log('Resposta da criação do livro:', response);

      if (!response.bookId) {
        throw new Error('ID do livro não retornado pelo servidor');
      }

      navigation.navigate('ViewBook', { bookId: response.bookId });
    } catch (err: any) {
      console.error('Erro ao criar livro:', err);
      const errorMsg = err.response?.data?.details || err.message || 'Erro ao criar livro';
      setError(errorMsg);
      setVisible(true);
    } finally {
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
        onDismiss={() => setVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setVisible(false),
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
  }
});

export default CreateBookScreen;