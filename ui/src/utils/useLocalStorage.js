import { useState, useEffect } from 'react'

export default function useLocalStorage(key, defaultValue, namespace='icfpc2021') {
  const fullKey = `${namespace}:${key}`

  const safeGetValue = (fullKey) => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(fullKey);
      // Parse stored json or if none return defaultValue
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      // If error also return defaultValue
      console.log(error);
      return defaultValue;
    }
  }

  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValueState] = useState(safeGetValue(fullKey));

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = value => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValueState(valueToStore);
      // Save to local storage
      window.localStorage.setItem(fullKey, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };

  useEffect(() => {
    const onStorageChange = (ev) => {
      if (ev.key === fullKey) {
        const value = JSON.parse(ev.newValue)
        setStoredValueState(value)
      }
    }
    window.addEventListener('storage', onStorageChange)
    return () => window.removeEventListener('storage', onStorageChange)
  }, [])

  return [storedValue, setValue];
}
