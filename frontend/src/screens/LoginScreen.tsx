import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Caso você tenha um tipo definido para a navegação, substitua "any" pelo tipo correto.
  const navigation = useNavigation<any>(); 
  const { signIn } = useAuth();

  // Valida os campos do formulário de login
  const validateForm = (): boolean => {
    let isValid = true;
    
    // Validação do e-mail
    if (!email) {
      setEmailError('O e-mail é obrigatório');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('E-mail inválido');
      isValid = false;
    } else {
      setEmailError('');
    }

    // Validação da senha
    if (!password) {
      setPasswordError('A senha é obrigatória');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres');
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  // Função para efetuar o login
  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      await signIn(email, password);
      // A navegação será controlada automaticamente pelo AppNavigator,
      // que redirecionará para a HomeScreen quando o estado de autenticação mudar.
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Ocorreu um erro ao fazer login. Tente novamente mais tarde.';
      
      // Verifica se a mensagem de erro indica que o usuário não existe
      if (errorMessage.includes('não encontrado')) {
        Alert.alert(
          'Usuário não encontrado',
          'Este email não está registrado. Deseja criar uma conta?',
          [
            {
              text: 'Cancelar',
              style: 'cancel'
            },
            {
              text: 'Criar conta',
              onPress: () => navigation.navigate('Register', { email })
            }
          ]
        );
      } else {
        Alert.alert('Erro no login', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Função para preencher os dados de teste
  const fillTestCredentials = () => {
    setEmail('crtnet@hotmail.com');
    setPassword('senha123');
    setEmailError('');
    setPasswordError('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Kids Book Creator</Text>
        <Text style={styles.subtitle}>Faça login para continuar</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, emailError ? styles.inputError : null]}
            placeholder="E-mail"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        </View>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, passwordError ? styles.inputError : null]}
            placeholder="Senha"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setPasswordError('');
            }}
            secureTextEntry
            editable={!isLoading}
          />
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        </View>
        
        <TouchableOpacity 
          style={[styles.button, isLoading ? styles.buttonDisabled : null]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.registerButton}
          onPress={() => navigation.navigate('Register')}
          disabled={isLoading}
        >
          <Text style={styles.registerText}>Não tem uma conta? Cadastre-se</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.testCredentialsButton}
          onPress={fillTestCredentials}
          disabled={isLoading}
        >
          <Text style={styles.testCredentialsText}>Usar credenciais de teste</Text>
        </TouchableOpacity>

        <View style={styles.testCredentialsInfo}>
          <Text style={styles.testCredentialsInfoText}>
            Email: crtnet@hotmail.com{'\n'}
            Senha: senha123
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  inner: {
    padding: 24,
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#007bff',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: 'white',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerButton: {
    marginTop: 16,
    padding: 8,
  },
  registerText: {
    color: '#007bff',
    fontSize: 14,
    textAlign: 'center',
  },
  testCredentialsButton: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  testCredentialsText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  testCredentialsInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e6f7ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#91d5ff',
  },
  testCredentialsInfoText: {
    color: '#333',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default LoginScreen;