import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FABProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  color?: string;
}

export const FAB: React.FC<FABProps> = ({ icon, onPress, style, color = 'white' }) => {
  return (
    <TouchableOpacity style={[styles.fab, style]} onPress={onPress}>
      <Ionicons name={icon} size={24} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    // Usa boxShadow para web e as propriedades nativas para outras plataformas
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
      },
    }),
  },
});

export default FAB;