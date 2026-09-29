// Riquadretto a forma di foglio di calendario: mese in alto, giorno grande sotto.
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { giornoMese } from '@/lib/formato';

export function DataCalendario({ iso, passata = false }: { iso: string; passata?: boolean }) {
  const tema = useTheme();
  const { giorno, mese } = giornoMese(iso);
  const colore = passata ? tema.colors.onSurfaceVariant : tema.colors.primary;
  return (
    <View style={[styles.foglio, { borderColor: tema.colors.outlineVariant, backgroundColor: tema.colors.surface }]}>
      <View style={[styles.testa, { backgroundColor: colore }]}>
        <Text variant="labelSmall" style={[styles.mese, { color: tema.colors.surface }]}>
          {mese}
        </Text>
      </View>
      <Text variant="headlineSmall" style={styles.giorno}>
        {giorno}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  foglio: { width: 54, borderRadius: 12, borderWidth: 1, overflow: 'hidden', alignItems: 'center' },
  testa: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 2 },
  mese: { letterSpacing: 1 },
  giorno: { paddingVertical: 4 },
});
