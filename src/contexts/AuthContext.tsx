import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  email: string;
  // Outras propriedades do usuário, se necessário
}

interface AuthContextData {
  user: User | null;
  signIn(credentials: any): Promise<void>;
  signOut(): void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Variável para armazenar a função signOut de forma global
let globalSignOutFunction: (() => void) | null = null;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Carregar o usuário do AsyncStorage, se necessário
    // Exemplo:
    // AsyncStorage.getItem('user').then(storedUser => {
    //   if (storedUser) setUser(JSON.parse(storedUser));
    // });
  }, []);

  const localSignOut = () => {
    setUser(null);
    AsyncStorage.removeItem('user');
  };

  // Atribui a função localSignOut à variável global
  globalSignOutFunction = localSignOut;

  const signIn = async (credentials: any) => {
    // Lógica de autenticação
    // Exemplo:
    // const response = await api.post('/login', credentials);
    // setUser(response.data.user);
    // await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut: localSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}

// Exporta a função signOut global para ser usada em outros módulos
export function signOut() {
  if (globalSignOutFunction) {
    globalSignOutFunction();
  } else {
    console.warn('signOut function is not defined yet.');
  }
}