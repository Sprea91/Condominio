// Barra in alto con titolo e freccia "indietro" (torna alla Home se non c'è una pagina precedente,
// ad esempio quando la pagina è stata aperta o ricaricata direttamente nel browser).
import { router } from 'expo-router';
import { Appbar } from 'react-native-paper';

export function Intestazione({ titolo }: { titolo: string }) {
  function indietro() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <Appbar.Header>
      <Appbar.BackAction onPress={indietro} />
      <Appbar.Content title={titolo} />
    </Appbar.Header>
  );
}
