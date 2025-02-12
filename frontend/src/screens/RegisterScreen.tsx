// frontend/src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, Snackbar } from 'react-native-paper';
import api from '../services/api';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState('parent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError('');

      if (!name.trim() || !email.trim() || !password.trim()) {
        setError('Por favor, preencha todos os campos');
        setVisible(true);
        return;
      }

      console.log('Enviando dados de registro:', { name, email, type });
      
      await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        type,
      });

      console.log('Registro realizado com sucesso');
      navigation.navigate('Login');
    } catch (error: any) {
      console.error('Erro no registro:', error);
      setError(error.response?.data?.message || 'Erro ao criar conta');
      setVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Criar Conta</Text>

      <SegmentedButtons
        value={type}
        onValueChange={setType}
        buttons={[
          { value: 'parent', label: 'Responsável' },
          { value: 'child', label: 'Criança' },
        ]}
        style={styles.segmentedButton}
      />
      
      <TextInput
        label="Nome"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        disabled={loading}
      />
      
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        disabled={loading}
      />
      
      <TextInput
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        mode="outlined"
        style={styles.input}
        disabled={loading}
      />
      
      <Button 
        mode="contained" 
        onPress={handleRegister} 
        style={styles.button}
        loading={loading}
        disabled={loading}
      >
        Criar Conta
      </Button>
      
      <Button
        mode="text"
        onPress={() => navigation.goBack()}
        style={styles.button}
        disabled={loading}
      >
        Voltar para Login
      </Button>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
  },
  segmentedButton: {
    marginBottom: 20,
  },
});