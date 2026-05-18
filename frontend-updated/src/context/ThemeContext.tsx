import React, { createContext, useContext } from 'react';

type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  isDarkMode: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Dark mode removed — always light
  return (
    <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {}, isDarkMode: false }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
