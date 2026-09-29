// Campo "Ditta" con i suggerimenti dei nomi già usati nell'app: si scrive o si sceglie con un tocco.
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Chip, TextInput } from 'react-native-paper';

import { chiaveDitta, useDitte } from '@/lib/ditte';

import { corrisponde } from './CampoRicerca';

type Props = {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  style?: StyleProp<ViewStyle>;
  dense?: boolean;
};

export function CampoDitta({ label = 'Ditta', value, onChangeText, style, dense }: Props) {
  const ditte = useDitte();
  const [attivo, setAttivo] = useState(false);

  // Suggerimenti: con il campo vuoto le prime ditte, scrivendo quelle che corrispondono
  const esatta = ditte.some((d) => chiaveDitta(d) === chiaveDitta(value));
  const suggerite = esatta ? [] : ditte.filter((d) => corrisponde(value, d)).slice(0, 8);

  return (
    <View style={[styles.contenitore, style]}>
      <TextInput
        label={label}
        mode="outlined"
        dense={dense}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setAttivo(true)}
        // piccolo ritardo: lascia il tempo di toccare un suggerimento
        onBlur={() => setTimeout(() => setAttivo(false), 200)}
        left={<TextInput.Icon icon="domain" />}
        right={value ? <TextInput.Icon icon="close" onPress={() => onChangeText('')} /> : undefined}
      />
      {attivo && suggerite.length > 0 && (
        <View style={styles.suggerimenti}>
          {suggerite.map((d) => (
            <Chip key={d} icon="history" compact onPress={() => onChangeText(d)}>
              {d}
            </Chip>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: { gap: 6 },
  suggerimenti: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
