// Riquadro sfumato con il saldo del condominio (Home e Conto spese).
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

const BIANCO = '#FFFFFF';

export function CardSaldo({
  etichetta,
  importo,
  sotto,
  onPress,
}: {
  etichetta: string;
  importo: string;
  sotto?: ReactNode;
  onPress?: () => void;
}) {
  const contenuto = (
    <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      {/* cerchi decorativi */}
      <View style={[styles.cerchio, styles.cerchioGrande]} />
      <View style={[styles.cerchio, styles.cerchioPiccolo]} />
      <View style={styles.riga}>
        <Text variant="labelLarge" style={styles.tenue}>
          {etichetta}
        </Text>
        {onPress && (
          <View style={styles.dettagli}>
            <Text variant="labelMedium" style={styles.bianco}>
              Entrate e uscite
            </Text>
            <Icon source="chevron-right" size={18} color={BIANCO} />
          </View>
        )}
      </View>
      <Text variant="displaySmall" style={styles.bianco}>
        {importo}
      </Text>
      {sotto && (
        <Text variant="bodySmall" style={styles.tenue}>
          {sotto}
        </Text>
      )}
    </LinearGradient>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.premuto}>
      {contenuto}
    </Pressable>
  ) : (
    contenuto
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 20, gap: 6, overflow: 'hidden' },
  riga: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bianco: { color: BIANCO },
  dettagli: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 3,
  },
  tenue: { color: BIANCO, opacity: 0.85 },
  cerchio: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  cerchioGrande: { width: 180, height: 180, right: -50, top: -70 },
  cerchioPiccolo: { width: 110, height: 110, right: 60, bottom: -60 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
