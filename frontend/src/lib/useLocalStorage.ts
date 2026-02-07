import { useState, useCallback } from 'react';

/**
 * A hook that syncs state with window.localStorage.
 * Handles JSON serialization and try-catch safety automatically.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Use a lazy initializer to read from localStorage only once
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore = value instanceof Function ? value(state) : value;
        setState(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, state],
  );

  return [state, setValue] as const;
}
