import { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('darkMode') === 'true';
      setDarkMode(saved);
    } catch (e) {
      // игнорируем ошибки localStorage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('darkMode', darkMode);
    } catch (e) {}
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
