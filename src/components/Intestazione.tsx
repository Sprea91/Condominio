// Intestazione della schermata: freccia "indietro" e titolo grande.
// La freccia torna alla Home se non c'è una pagina precedente
// (ad esempio quando la pagina è stata aperta o ricaricata direttamente nel browser).
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

export function Intestazione({ titolo, sottotitolo, destra }: { titolo: string; sottotitolo?: string; destra?: ReactNode }) {
  const tema = useTheme();

  function indietro() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <View style={styles.contenitore}>
      <IconButton
        icon="arrow-left"
        mode="contained-tonal"
        size={20}
        onPress={indietro}
        style={styles.freccia}
        containerColor={tema.colors.surface}
        accessibilityLabel="Indietro"
      />
      <View style={styles.testi}>
        <Text variant="headlineSmall" numberOfLines={2}>
          {titolo}
        </Text>
        {sottotitolo && (
          <Text variant="bodyMedium" style={{ color: tema.colors.onSurfaceVariant }}>
            {sottotitolo}
          </Text>
        )}
      </View>
      {destra}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  freccia: { margin: 0, marginLeft: -4 },
  testi: { flex: 1 },
});
