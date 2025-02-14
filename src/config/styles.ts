import { StyleSheet } from 'react-native';

export const createStyleSheet = (styles: any) => {
  const updatedStyles = { ...styles };

  // Convert deprecated style props to their new equivalents
  Object.keys(updatedStyles).forEach(key => {
    const style = updatedStyles[key];
    
    if (style.shadow) {
      style.boxShadow = style.shadow;
      delete style.shadow;
    }

    if (style.tintColor) {
      style.tint = style.tintColor;
      delete style.tintColor;
    }

    if (style.resizeMode) {
      style.objectFit = style.resizeMode === 'contain' ? 'contain' : 'cover';
      delete style.resizeMode;
    }
  });

  return StyleSheet.create(updatedStyles);
};

export const commonStyles = createStyleSheet({
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  pressable: {
    cursor: 'pointer',
  },
});