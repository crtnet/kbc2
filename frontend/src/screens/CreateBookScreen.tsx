// src/screens/CreateBookScreen.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, Card, Snackbar } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import * as bookService from '../services/bookService';

interface BookData {
  title: string;
  genre: 'adventure' | 'fantasy' | 'mystery';
  theme: 'friendship' | 'courage' | 'kindness';
  mainCharacter: string;
  secondaryCharacter?: string; // NOVO
  setting: string;
  tone: 'fun' | 'adventurous' | 'calm';
  ageRange: '1-2' | '3-4' | '5-6' | '7-8' | '9-10' | '11-12';
  prompt?: string;
  authorName?: string;
  language?: string;
}

function CreateBookScreen({ navigation }) {
  const { user } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [visible, setVisible] = useState<boolean>(false);

  const [bookData, setBookData] = useState<BookData>({
    title: '',
    authorName: '',
    genre: 'adventure',
    theme: 'friendship',
    mainCharacter: '',
    secondaryCharacter: '',
    setting: '',
    tone: 'fun',
    ageRange: '5-6'
  });

  const handleNext = () => {
    if (step === 1 && (!bookData.title || !bookData.authorName)) {
      setError('Por favor, insira o título do livro e o nome do autor');
      setVisible(true);
      return;
    }

    if (step === 2 && (!bookData.mainCharacter || !bookData.setting)) {
      setError('Por favor, preencha todos os campos');
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

  const handleCreateBook = async () => {
    try {
      if (!user) {
        setError('Usuário não autenticado');
        setVisible(true);
        return;
      }

      setLoading(true);

      // Construímos o prompt usando TÍTULO, PERSONAGEM SECUNDÁRIO, etc.
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
        
        IMPORTANTE: Se houver um personagem secundário, certifique-se de que ele apareça em vários momentos da história, tenha falas e ações próprias, e seja fundamental para o desenvolvimento da trama.
      `;

      // Preparar os dados do livro para envio
      const bookDataToSend = {
        title: bookData.title,
        genre: bookData.genre,
        theme: bookData.theme,
        mainCharacter: bookData.mainCharacter,
        secondaryCharacter: bookData.secondaryCharacter,
        setting: bookData.setting,
        tone: bookData.tone,
        ageRange: bookData.ageRange,
        prompt: finalPrompt.trim(),
        authorName: bookData.authorName,
        userId: user.id,
        language: 'pt-BR'
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
      <TextInput
        label="Nome do Personagem Principal"
        value={bookData.mainCharacter}
        onChangeText={(text) => setBookData({ ...bookData, mainCharacter: text })}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Nome do Personagem Secundário (opcional)"
        value={bookData.secondaryCharacter}
        onChangeText={(text) => setBookData({ ...bookData, secondaryCharacter: text })}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Cenário da História"
        value={bookData.setting}
        onChangeText={(text) => setBookData({ ...bookData, setting: text })}
        mode="outlined"
        style={styles.input}
        placeholder="Ex: floresta encantada, cidade mágica..."
      />
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
    marginBottom: 20
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
  segmentedButton: {
    marginBottom: 15
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20
  },
  button: {
    flex: 1,
    marginHorizontal: 5
  }
});

export default CreateBookScreen;