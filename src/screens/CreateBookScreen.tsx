import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../navigation/types';
import { createStyleSheet } from '../config/styles';
import { logger } from '../utils/logger';
import bookService from '../services/book.service';

interface BookData {
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  setting: string;
  description: string;
}

export const CreateBookScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [bookData, setBookData] = useState<BookData>({
    title: '',
    genre: '',
    theme: '',
    mainCharacter: '',
    setting: '',
    description: ''
  });

  const handleInputChange = (field: keyof BookData, value: string) => {
    setBookData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    return bookData.title && 
           bookData.genre && 
           bookData.theme && 
           bookData.mainCharacter && 
           bookData.setting;
  };

  const handleNext = async () => {
    if (!validateForm()) {
      // Show error message
      return;
    }
    try {
      await handleCreateBook();
    } catch (error) {
      logger.error('Error creating book:', error);
    }
  };

  const handleCreateBook = async () => {
    try {
      logger.info('Creating book:', bookData);
      const response = await bookService.createBook(bookData);
      logger.info('Book created successfully:', response);

      // Ensure we have a valid book ID
      if (!response || (!response.id && !response._id)) {
        throw new Error('Invalid response from server - no book ID found');
      }

      // Use o ID normalizado da resposta
      const bookId = response.id || response._id;
      logger.info('Navigating to book details with ID:', bookId);
      
      // Navigate to BookDetails screen with the book ID
      navigation.navigate('BookDetails', { bookId });
    } catch (error) {
      logger.error('Error creating book:', error);
      // Optionally show an error message to the user
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Book</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Title"
        value={bookData.title}
        onChangeText={(value) => handleInputChange('title', value)}
      />

      <TextInput
        style={styles.input}
        placeholder="Genre"
        value={bookData.genre}
        onChangeText={(value) => handleInputChange('genre', value)}
      />

      <TextInput
        style={styles.input}
        placeholder="Theme"
        value={bookData.theme}
        onChangeText={(value) => handleInputChange('theme', value)}
      />

      <TextInput
        style={styles.input}
        placeholder="Main Character"
        value={bookData.mainCharacter}
        onChangeText={(value) => handleInputChange('mainCharacter', value)}
      />

      <TextInput
        style={styles.input}
        placeholder="Setting"
        value={bookData.setting}
        onChangeText={(value) => handleInputChange('setting', value)}
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Description"
        value={bookData.description}
        onChangeText={(value) => handleInputChange('description', value)}
        multiline
        numberOfLines={4}
      />

      <View style={styles.buttonContainer}>
        <Text 
          style={[styles.button, !validateForm() && styles.buttonDisabled]}
          onPress={handleNext}
        >
          Next
        </Text>
      </View>
    </View>
  );
};

const styles = createStyleSheet({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default CreateBookScreen;