// Impaginazione delle schermate di accesso: logo, titolo e riquadro con il modulo.
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TextInput, useTheme } from 'react-native-paper';
import { useState } from 'react';

import { Pagina } from './Pagina';
import { Riquadro } from './ui';

export function Benvenuto({ titolo, testo, children }: { titolo: string; testo?: string; children: ReactNode }) {
  const tema = useTheme();
  return (
    <Pagina centrata>
      <View style={styles.testa}>
        <View style={[styles.logo, { backgroundColor: tema.colors.primary }]}>
          <Icon source="home-city" size={34} color={tema.colors.onPrimary} />
        </View>
        <Text variant="headlineMedium" style={styles.centro}>
          {titolo}
        </Text>
        {testo && (
          <Text variant="bodyMedium" style={[styles.centro, { color: tema.colors.onSurfaceVariant }]}>
            {testo}
          </Text>
        )}
      </View>
      <Riquadro style={styles.modulo}>{children}</Riquadro>
    </Pagina>
  );
}

// Campo password con l'occhio per mostrarla/nasconderla
export function CampoPassword({
  label,
  value,
  onChangeText,
  onSubmitEditing,
  nuova = false,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  onSubmitEditing?: () => void;
  nuova?: boolean;
}) {
  const [visibile, setVisibile] = useState(false);
  return (
    <TextInput
      label={label}
      mode="outlined"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!visibile}
      autoComplete={nuova ? 'new-password' : 'current-password'}
      onSubmitEditing={onSubmitEditing}
      left={<TextInput.Icon icon="lock-outline" />}
      right={<TextInput.Icon icon={visibile ? 'eye-off-outline' : 'eye-outline'} onPress={() => setVisibile(!visibile)} />}
    />
  );
}

const styles = StyleSheet.create({
  testa: { alignItems: 'center', gap: 8, marginBottom: 12 },
  logo: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  centro: { textAlign: 'center' },
  modulo: { gap: 12, padding: 20 },
});
