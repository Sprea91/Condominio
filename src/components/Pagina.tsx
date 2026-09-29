// Contenitore comune delle schermate: centrato, largo al massimo 480 px
// (così nel browser del PC non si allarga a tutto schermo) e scorrevole.
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Pagina({ children, centrata = false }: { children: ReactNode; centrata?: boolean }) {
  const tema = useTheme();
  return (
    <SafeAreaView style={[styles.fondo, { backgroundColor: tema.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scorrimento, centrata && styles.centrata]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.colonna}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  scorrimento: { flexGrow: 1, padding: 16, alignItems: 'center' },
  centrata: { justifyContent: 'center' },
  colonna: { width: '100%', maxWidth: 480, gap: 12 },
});
