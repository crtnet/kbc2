import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, Card } from 'react-native-paper';

const genres = [
  { value: 'adventure', label: 'Aventura' },
  { value: 'fantasy', label: 'Fantasia' },
  { value: 'mystery', label: 'Mistério' },
  { value: 'educational', label: 'Educativo' }
];

const themes = [
  { value: 'friendship', label: 'Amizade' },
  { value: 'courage', label: 'Coragem' },
  { value: 'kindness', label: 'Bondade' },
  { value: 'responsibility', label: 'Responsabilidade' }
];

export default function CreateBookScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [bookData, setBookData] = useState({
    title: '',
    genre: '',
    theme: '',
    mainCharacter: '',
    setting: '',
    tone: 'fun', // fun, adventurous, calm, educational
  });

  const handleNext = () => {
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
      console.log('Criando livro:', bookData);
      // TODO: Implementar chamada à API
      navigation.navigate('Home');
    } catch (error) {
      console.error('Erro ao criar livro:', error);
    }
  };

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

      <Text style={styles.label}>Gênero</Text>
      <SegmentedButtons
        value={bookData.genre}
        onValueChange={(value) => setBookData({ ...bookData, genre: value })}
        buttons={genres}
        style={styles.segmentedButton}
      />
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Personagem e Ambiente</Text>
      
      <TextInput
        label="Nome do Personagem Principal"
        value={bookData.mainCharacter}
        onChangeText={(text) => setBookData({ ...bookData, mainCharacter: text })}
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

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Tema e Tom da História</Text>

      <Text style={styles.label}>Tema Principal</Text>
      <SegmentedButtons
        value={bookData.theme}
        onValueChange={(value) => setBookData({ ...bookData, theme: value })}
        buttons={themes}
        style={styles.segmentedButton}
      />

      <Text style={styles.label}>Tom da Narrativa</Text>
      <SegmentedButtons
        value={bookData.tone}
        onValueChange={(value) => setBookData({ ...bookData, tone: value })}
        buttons={[
          { value: 'fun', label: 'Divertido' },
          { value: 'adventurous', label: 'Aventureiro' },
          { value: 'calm', label: 'Calmo' },
          { value: 'educational', label: 'Educativo' }
        ]}
        style={styles.segmentedButton}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          {/* Progress Indicator */}
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

          {/* Step Content */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={handleBack}
              style={styles.button}
            >
              {step === 1 ? 'Cancelar' : 'Voltar'}
            </Button>
            <Button
              mode="contained"
              onPress={handleNext}
              style={styles.button}
            >
              {step === 3 ? 'Criar Livro' : 'Próximo'}
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 10,
    elevation: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  progressItem: {
    flex: 1,
    height: 4,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  segmentedButton: {
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
});