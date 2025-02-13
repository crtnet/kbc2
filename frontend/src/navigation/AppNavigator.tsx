import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CreateBookScreen from '../screens/CreateBookScreen';
import ViewBookScreen from '../screens/ViewBookScreen';
import ViewBookPDFScreen from '../screens/ViewBookPDFScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  CreateBook: undefined;
  ViewBook: { bookId: string };
  ViewBookPDF: { bookId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { signed, loading } = useAuth();

  if (loading) {
    return null; // ou um componente de loading
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#fff' },
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        {!signed ? (
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{
                animationTypeForReplace: signed ? 'push' : 'pop',
              }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen}
            />
          </>
        ) : (
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{
                animationEnabled: true,
              }}
            />
            <Stack.Screen 
              name="CreateBook" 
              component={CreateBookScreen}
              options={{
                headerShown: true,
                headerTitle: 'Criar Novo Livro',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen 
              name="ViewBook" 
              component={ViewBookScreen}
              options={{
                headerShown: true,
                headerTitle: 'Visualizar Livro',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen 
              name="ViewBookPDF" 
              component={ViewBookPDFScreen}
              options={{
                headerShown: true,
                headerTitle: 'PDF do Livro',
                headerBackTitleVisible: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;