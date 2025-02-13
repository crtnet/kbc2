export interface Theme {
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
  };
}

export const lightTheme: Theme = {
  colors: {
    primary: '#4A90E2',
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#757575',
    border: '#E0E0E0',
    error: '#D32F2F',
    success: '#388E3C',
  },
};

export const darkTheme: Theme = {
  colors: {
    primary: '#64B5F6',
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    border: '#2C2C2C',
    error: '#EF5350',
    success: '#66BB6A',
  },
};