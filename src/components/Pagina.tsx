// Contenitore comune delle schermate: centrato, largo al massimo 480 px
// (così nel browser del PC non si allarga a tutto schermo) e scorrevole.
// Con "titolo" mostra in alto la barra con la freccia indietro.
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Intestazione } from './Intestazione';

type Props = {
  children: ReactNode;
  centrata?: boolean;
  titolo?: string;
  // Se presente, trascinando la lista verso il basso si ricaricano i dati
  onAggiorna?: () => void;
  aggiornamento?: boolean;
  // Pulsante fisso in basso a destra (es. "+ Nuovo")
  fisso?: ReactNode;
};

export function Pagina({ children, centrata = false, titolo, onAggiorna, aggiornamento = false, fisso }: Props) {
  const tema = useTheme();
  return (
    <SafeAreaView
      style={[styles.fondo, { backgroundColor: tema.colors.background }]}
      edges={titolo ? ['bottom', 'left', 'right'] : undefined}
    >
      {titolo && <Intestazione titolo={titolo} />}
      <ScrollView
        contentContainerStyle={[styles.scorrimento, centrata && styles.centrata]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onAggiorna ? <RefreshControl refreshing={aggiornamento} onRefresh={onAggiorna} /> : undefined
        }
      >
        <View style={styles.colonna}>{children}</View>
      </ScrollView>
      {fisso}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  scorrimento: { flexGrow: 1, padding: 16, paddingBottom: 96, alignItems: 'center' },
  centrata: { justifyContent: 'center' },
  colonna: { width: '100%', maxWidth: 480, gap: 12 },
});
