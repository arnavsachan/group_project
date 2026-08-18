import { useState, useEffect } from 'react';

/**
 * useLocalStorage – a hook to sync a state value with localStorage.
 * @param {string} key - localStorage key.
 * @param {*} initialValue - value used when the key is empty.
 * @returns {[any, function, function]} - [value, setValue, remove]
 */
export default function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn('useLocalStorage: error reading key', key, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (storedValue === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      }
    } catch (error) {
      console.warn('useLocalStorage: error writing key', key, error);
    }
  }, [key, storedValue]);

  const setValue = (value) => {
    setStoredValue(value);
  };

  const remove = () => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn('useLocalStorage: error removing key', key, error);
    }
    setStoredValue(undefined);
  };

  return [storedValue, setValue, remove];
}
