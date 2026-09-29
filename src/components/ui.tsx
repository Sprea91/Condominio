// Piccoli componenti grafici riutilizzati in tutte le schermate.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { FAB, Icon, Text, useTheme } from 'react-native-paper';

import type { Tinta } from '@/lib/tema';

// Riquadro bianco con bordo leggero (al posto delle "card" con ombra). Se ha onPress è toccabile.
export function Riquadro({
  children,
  onPress,
  style,
  evidenziato = false,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  evidenziato?: boolean;
}) {
  const tema = useTheme();
  const stile = [
    styles.riquadro,
    {
      backgroundColor: tema.colors.surface,
      borderColor: evidenziato ? tema.colors.primary : tema.colors.outlineVariant,
    },
    style,
  ];
  if (!onPress) return <View style={stile}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        stile,
        hovered && { borderColor: tema.colors.outline },
        pressed && styles.premuto,
      ]}
    >
      {children}
    </Pressable>
  );
}

// Etichetta colorata a pillola (es. stato di un guasto)
export function Etichetta({ testo, tinta, icona }: { testo: string; tinta: Tinta; icona?: string }) {
  return (
    <View style={[styles.etichetta, { backgroundColor: tinta.sfondo }]}>
      {icona && <Icon source={icona} size={14} color={tinta.testo} />}
      <Text variant="labelMedium" style={{ color: tinta.testo }}>
        {testo}
      </Text>
    </View>
  );
}

// Icona dentro un cerchio colorato
export function IconaTonda({ icona, tinta, dimensione = 44 }: { icona: string; tinta: Tinta; dimensione?: number }) {
  return (
    <View
      style={[
        styles.iconaTonda,
        { backgroundColor: tinta.sfondo, width: dimensione, height: dimensione, borderRadius: dimensione / 2.6 },
      ]}
    >
      <Icon source={icona} size={dimensione * 0.5} color={tinta.testo} />
    </View>
  );
}

// Messaggio per le liste vuote
export function Vuoto({ icona, titolo, testo }: { icona: string; titolo: string; testo?: string }) {
  const tema = useTheme();
  return (
    <View style={styles.vuoto}>
      <View style={[styles.cerchioVuoto, { backgroundColor: tema.colors.surfaceVariant }]}>
        <Icon source={icona} size={32} color={tema.colors.onSurfaceVariant} />
      </View>
      <Text variant="titleMedium">{titolo}</Text>
      {testo && (
        <Text variant="bodyMedium" style={[styles.centro, { color: tema.colors.onSurfaceVariant }]}>
          {testo}
        </Text>
      )}
    </View>
  );
}

// Titoletto di sezione (piccolo, grigio, maiuscolo)
export function Titoletto({ children }: { children: ReactNode }) {
  const tema = useTheme();
  return (
    <Text variant="labelLarge" style={[styles.titoletto, { color: tema.colors.onSurfaceVariant }]}>
      {children}
    </Text>
  );
}

// Testo secondario grigio
export function Nota({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const tema = useTheme();
  return (
    <Text variant="bodySmall" style={[{ color: tema.colors.onSurfaceVariant }, style]}>
      {children}
    </Text>
  );
}

// Pulsante fisso in basso a destra ("+ Nuovo ...")
export function BottoneNuovo({ etichetta, onPress }: { etichetta: string; onPress: () => void }) {
  const tema = useTheme();
  return (
    <FAB
      icon="plus"
      label={etichetta}
      onPress={onPress}
      color={tema.colors.onPrimary}
      style={[styles.fab, { backgroundColor: tema.colors.primary }]}
    />
  );
}

// Messaggio d'errore in un riquadro rosso tenue
export function Errore({ testo }: { testo: string }) {
  const tema = useTheme();
  if (!testo) return null;
  return (
    <View style={[styles.errore, { backgroundColor: tema.colors.errorContainer }]}>
      <Icon source="alert-circle-outline" size={18} color={tema.colors.onErrorContainer} />
      <Text variant="bodyMedium" style={[styles.flex, { color: tema.colors.onErrorContainer }]}>
        {testo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  riquadro: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10 },
  premuto: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  etichetta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  iconaTonda: { alignItems: 'center', justifyContent: 'center' },
  vuoto: { alignItems: 'center', gap: 8, paddingVertical: 48, paddingHorizontal: 24 },
  cerchioVuoto: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  centro: { textAlign: 'center' },
  titoletto: { textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8 },
  fab: { position: 'absolute', right: 20, bottom: 20, borderRadius: 18 },
  errore: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 14 },
  flex: { flex: 1 },
});
