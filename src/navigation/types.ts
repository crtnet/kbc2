import { NavigationProp, RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Home: undefined;
  CreateBook: undefined;
  BookDetails: { bookId: string };
  Login: undefined;
  Register: undefined;
};

export type RootStackNavigationProp = NavigationProp<RootStackParamList>;

export type BookDetailsRouteProp = RouteProp<RootStackParamList, 'BookDetails'>;

export interface NavigationProps {
  navigation: RootStackNavigationProp;
  route?: BookDetailsRouteProp;
}