/**
 * Shared Utilities - Local Storage
 * Type-safe localStorage operations
 */

import React from 'react';

export const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.error(`Failed to read ${key} from localStorage:`, err);
    return defaultValue;
  }
};

export const setLocalStorage = <T>(key: string, value: T): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
    return false;
  }
};

export const removeLocalStorage = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(`Failed to remove ${key} from localStorage:`, err);
    return false;
  }
};

export const clearLocalStorage = (): boolean => {
  try {
    localStorage.clear();
    return true;
  } catch (err) {
    console.error('Failed to clear localStorage:', err);
    return false;
  }
};

export const getStorageKeys = (): string[] => {
  try {
    return Object.keys(localStorage);
  } catch (err) {
    console.error('Failed to get localStorage keys:', err);
    return [];
  }
};

export const useLocalStorage = <T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] => {
  const [storedValue, setStoredValue] = React.useState<T>(() => 
    getLocalStorage(key, defaultValue)
  );
  
  const setValue = (value: T): void => {
    try {
      setStoredValue(value);
      setLocalStorage(key, value);
    } catch (err) {
      console.error(`Failed to save ${key}:`, err);
    }
  };
  
  return [storedValue, setValue];
};
