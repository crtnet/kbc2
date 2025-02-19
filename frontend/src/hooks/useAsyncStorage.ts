import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

export const useAsyncStorage = <T>(key: string, initialValue?: T) => {
  const [storedValue, setStoredValue] = useState<T | undefined>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStoredValue = async () => {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          let parsedItem: T;
          try {
            parsedItem = JSON.parse(item);
            logger.info(`Loaded JSON value for key ${key}`, { value: parsedItem });
          } catch (parseError) {
            // Se não conseguir fazer parse, assumimos que é string pura
            logger.warn(`Could not parse as JSON. Falling back to raw string for key ${key}`, parseError);
            parsedItem = item as unknown as T;
            logger.info(`Loaded RAW value for key ${key}`, { value: parsedItem });
          }
          setStoredValue(parsedItem);
        }
      } catch (error) {
        logger.error(`Error loading value for key ${key}`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredValue();
  }, [key]);

  const setValue = async (value: T) => {
    try {
      // Você pode armazenar sempre como JSON:
      // Se 'value' já for string, será salvo como "\"string\"".
      await AsyncStorage.setItem(key, JSON.stringify(value));
      setStoredValue(value);
      logger.info(`Stored value for key ${key}`, { value });
    } catch (error) {
      logger.error(`Error storing value for key ${key}`, error);
    }
  };

  const removeValue = async () => {
    try {
      await AsyncStorage.removeItem(key);
      setStoredValue(undefined);
      logger.info(`Removed value for key ${key}`);
    } catch (error) {
      logger.error(`Error removing value for key ${key}`, error);
    }
  };

  return {
    storedValue,
    setValue,
    removeValue,
    isLoading,
  };
};