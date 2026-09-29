// Tema grafico dell'app: colori (chiaro e scuro), font Inter, angoli arrotondati.
// Per cambiare il colore principale basta modificare "primary" qui sotto.
import { useColorScheme } from 'react-native';
import { configureFonts, MD3DarkTheme, MD3LightTheme, useTheme, type MD3Theme } from 'react-native-paper';

// Nomi dei font caricati in _layout.tsx con @expo-google-fonts/inter
export const FONT = {
  normale: 'Inter_400Regular',
  medio: 'Inter_500Medium',
  semigrassetto: 'Inter_600SemiBold',
  grassetto: 'Inter_700Bold',
};

const base = configureFonts({ config: { fontFamily: FONT.normale } });
const fonts = {
  ...base,
  displayLarge: { ...base.displayLarge, fontFamily: FONT.grassetto, letterSpacing: -1 },
  displayMedium: { ...base.displayMedium, fontFamily: FONT.grassetto, letterSpacing: -0.8 },
  displaySmall: { ...base.displaySmall, fontFamily: FONT.grassetto, letterSpacing: -0.6 },
  headlineLarge: { ...base.headlineLarge, fontFamily: FONT.grassetto, letterSpacing: -0.5 },
  headlineMedium: { ...base.headlineMedium, fontFamily: FONT.grassetto, letterSpacing: -0.4 },
  headlineSmall: { ...base.headlineSmall, fontFamily: FONT.grassetto, letterSpacing: -0.3 },
  titleLarge: { ...base.titleLarge, fontFamily: FONT.semigrassetto, letterSpacing: -0.2 },
  titleMedium: { ...base.titleMedium, fontFamily: FONT.semigrassetto },
  titleSmall: { ...base.titleSmall, fontFamily: FONT.semigrassetto },
  labelLarge: { ...base.labelLarge, fontFamily: FONT.semigrassetto },
  labelMedium: { ...base.labelMedium, fontFamily: FONT.medio },
  labelSmall: { ...base.labelSmall, fontFamily: FONT.medio },
};

export const temaChiaro: MD3Theme = {
  ...MD3LightTheme,
  roundness: 5,
  fonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4F46E5',
    onPrimary: '#FFFFFF',
    primaryContainer: '#E0E7FF',
    onPrimaryContainer: '#1E1B4B',
    secondary: '#0284C7',
    onSecondary: '#FFFFFF',
    // usato per il pulsante selezionato nei selettori e nei chip
    secondaryContainer: '#E0E7FF',
    onSecondaryContainer: '#312E81',
    background: '#F5F6FA',
    onBackground: '#111827',
    surface: '#FFFFFF',
    onSurface: '#111827',
    surfaceVariant: '#EEF0F6',
    onSurfaceVariant: '#5B6072',
    outline: '#D5D8E2',
    outlineVariant: '#E6E8EF',
    error: '#DC2626',
    errorContainer: '#FEE2E2',
    onErrorContainer: '#7F1D1D',
    surfaceDisabled: 'rgba(17, 24, 39, 0.08)',
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#FFFFFF',
      level3: '#FFFFFF',
      level4: '#FFFFFF',
      level5: '#FFFFFF',
    },
  },
};

export const temaScuro: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 5,
  fonts,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#A5B4FC',
    onPrimary: '#1E1B4B',
    primaryContainer: '#3730A3',
    onPrimaryContainer: '#E0E7FF',
    secondary: '#7DD3FC',
    onSecondary: '#082F49',
    secondaryContainer: '#312E81',
    onSecondaryContainer: '#E0E7FF',
    background: '#0E1016',
    onBackground: '#E5E7EB',
    surface: '#171A22',
    onSurface: '#E5E7EB',
    surfaceVariant: '#232734',
    onSurfaceVariant: '#A6ABBD',
    outline: '#3A3F4E',
    outlineVariant: '#2A2E3A',
    error: '#F87171',
    errorContainer: '#7F1D1D',
    onErrorContainer: '#FEE2E2',
    elevation: {
      level0: 'transparent',
      level1: '#171A22',
      level2: '#1B1F28',
      level3: '#1F232D',
      level4: '#222632',
      level5: '#252A36',
    },
  },
};

export function useTemaDiSistema() {
  return useColorScheme() === 'dark' ? temaScuro : temaChiaro;
}

// Colori "di significato" (verde = ok, rosso = attenzione...) con sfondo tenue abbinato
export type Tinta = { testo: string; sfondo: string };

export function useTinte() {
  const scuro = useTheme().dark;
  const t = (testo: string, sfondo: string, testoScuro: string, sfondoScuro: string): Tinta =>
    scuro ? { testo: testoScuro, sfondo: sfondoScuro } : { testo, sfondo };
  return {
    verde: t('#15803D', '#DCFCE7', '#86EFAC', '#14532D'),
    rosso: t('#B91C1C', '#FEE2E2', '#FCA5A5', '#7F1D1D'),
    arancio: t('#C2410C', '#FFEDD5', '#FDBA74', '#7C2D12'),
    blu: t('#1D4ED8', '#DBEAFE', '#93C5FD', '#1E3A8A'),
    viola: t('#6D28D9', '#EDE9FE', '#C4B5FD', '#4C1D95'),
    grigio: t('#4B5563', '#F3F4F6', '#D1D5DB', '#374151'),
  };
}
