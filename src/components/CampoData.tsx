// Campi per scegliere una data o un'ora con il selettore nativo del dispositivo
// (calendario/orologio di iPhone, Android o del browser del PC).
// Sopra il campo grafico c'è un vero <input type="date|time"> trasparente: toccandolo si apre il selettore.
// Il valore resta nel formato usato dal resto dell'app: data "gg/mm/aaaa", ora "hh:mm".
import { createElement, useRef } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { TextInput } from 'react-native-paper';

type Props = {
  label: string;
  value: string;
  onChangeText: (valore: string) => void;
  style?: StyleProp<ViewStyle>;
  // mostra la X per svuotare il campo (per le date facoltative)
  svuotabile?: boolean;
};

// "gg/mm/aaaa" <-> "aaaa-mm-gg" (formato dell'<input type="date">)
function versoInput(testo: string) {
  const m = testo.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  return m ? `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}` : '';
}
function daInput(valore: string) {
  const m = valore.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function Campo({ tipo, label, value, onChangeText, style, svuotabile }: Props & { tipo: 'date' | 'time' }) {
  const input = useRef<HTMLInputElement | null>(null);
  const icona = tipo === 'date' ? 'calendar' : 'clock-outline';
  const mostraX = svuotabile && !!value;

  // Sul telefono installato come app nativa (non usato oggi) resta un campo di testo normale
  if (Platform.OS !== 'web') {
    return (
      <TextInput
        style={style}
        label={label}
        mode="outlined"
        value={value}
        onChangeText={onChangeText}
        placeholder={tipo === 'date' ? 'gg/mm/aaaa' : 'hh:mm'}
        keyboardType="numbers-and-punctuation"
        left={<TextInput.Icon icon={icona} />}
      />
    );
  }

  const apri = () => {
    try {
      input.current?.showPicker?.();
    } catch {
      // alcuni browser aprono il selettore solo con il tocco diretto: va bene lo stesso
    }
  };

  return (
    <View style={[styles.contenitore, style]}>
      <TextInput
        label={label}
        mode="outlined"
        value={value}
        editable={false}
        left={<TextInput.Icon icon={icona} />}
        right={mostraX ? <TextInput.Icon icon="close" onPress={() => onChangeText('')} /> : undefined}
      />
      {createElement('input', {
        ref: input,
        type: tipo,
        value: tipo === 'date' ? versoInput(value) : value,
        onChange: (e: { target: { value: string } }) =>
          onChangeText(tipo === 'date' ? daInput(e.target.value) : e.target.value),
        onClick: apri,
        'aria-label': label,
        style: {
          position: 'absolute',
          left: 0,
          top: 6,
          bottom: 0,
          // lascia libera la X a destra
          width: mostraX ? 'calc(100% - 52px)' : '100%',
          opacity: 0,
          cursor: 'pointer',
          border: 0,
          padding: 0,
          margin: 0,
          fontSize: 16, // evita lo zoom automatico di iPhone
        },
      })}
    </View>
  );
}

export function CampoData(props: Props) {
  return <Campo tipo="date" {...props} />;
}

export function CampoOra(props: Props) {
  return <Campo tipo="time" {...props} />;
}

const styles = StyleSheet.create({
  contenitore: { position: 'relative' },
});
