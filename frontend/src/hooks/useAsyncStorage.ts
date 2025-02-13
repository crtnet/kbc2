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
          const parsedItem = JSON.parse(item);
          setStoredValue(parsedItem);
          logger.info(`Loaded value for key ${key}`, { value: parsedItem });
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
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      await AsyncStorage.setItem(key, JSON.stringify(valueToStore));
      logger.info(`Stored value for key ${key}`, { value: valueToStore });
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