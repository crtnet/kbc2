import { Platform } from 'react-native';

export const getAnimationConfig = (useNativeDriver = true) => ({
  useNativeDriver: Platform.OS !== 'web' && useNativeDriver,
});

export const DEFAULT_ANIMATION_CONFIG = {
  duration: 300,
  ...getAnimationConfig(),
};

export const PRESS_ANIMATION_CONFIG = {
  duration: 150,
  ...getAnimationConfig(),
};

export const FADE_ANIMATION_CONFIG = {
  duration: 200,
  ...getAnimationConfig(),
};