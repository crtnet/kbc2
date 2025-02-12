// frontend/src/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateBookScreen from '../screens/CreateBookScreen';
import ViewBookScreen from '../screens/ViewBookScreen';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const { signed, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      {signed ? (
        // Rotas autenticadas
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Kids Book Creator',
              headerStyle: {
                backgroundColor: '#1976d2',
              },
              headerTintColor: '#fff',
              headerLeft: null,
            }}
          />
          <Stack.Screen
            name="CreateBook"
            component={CreateBookScreen}
            options={{
              title: 'Criar Novo Livro',
              headerStyle: {
                backgroundColor: '#1976d2',
              },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen
            name="ViewBook"
            component={ViewBookScreen}
            options={{
              title: 'Visualizar Livro',
              headerStyle: {
                backgroundColor: '#1976d2',
              },
              headerTintColor: '#fff',
            }}
          />
        </>
      ) : (
        // Rotas públicas
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{
              title: 'Criar Conta',
              headerStyle: {
                backgroundColor: '#fff',
              },
              headerTintColor: '#000',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}