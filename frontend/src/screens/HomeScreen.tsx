// frontend/src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, ActivityIndicator, Card } from 'react-native-paper';
import * as bookService from '../services/bookService';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const loadBooks = async () => {
    try {
      const data = await bookService.getBooks();
      setBooks(data);
    } catch (error) {
      console.error('Erro ao carregar livros:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={async () => {
        try {
          const viewerData = await bookService.getBookPDFViewer(item._id);
          navigation.navigate('FlipBookScreen', { viewerUrl: viewerData.viewerUrl });
        } catch (error) {
          console.error('Erro ao carregar visualizador:', error);
        }
      }}
    >
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>{item.title}</Text>
          <Text>{item.genre}</Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={books}
        keyExtractor={(item) => item._id.toString()}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
