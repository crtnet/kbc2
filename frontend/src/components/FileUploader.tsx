// frontend/src/components/FileUploader.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FormattedMessage } from 'react-intl';
import { Text } from 'react-native-paper';

export default function FileUploader() {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>
        <FormattedMessage id="I86Kj3" defaultMessage="HEIC to JPG" />
      </Text>
      <Text style={styles.message}>
        <FormattedMessage id="y+7ihJ" defaultMessage="Qualidade" />
      </Text>
      <Text style={styles.message}>
        <FormattedMessage id="aZ1Q0A" defaultMessage="Arraste e solte imagens ou clique para selecionar" />
      </Text>
      <Text style={styles.message}>
        <FormattedMessage id="qZGdi+" defaultMessage="Arquivos HEIC são permitidos" />
      </Text>
      <Text style={styles.message}>
        <FormattedMessage id="W4cWeE" defaultMessage="Número ilimitado de arquivos" />
      </Text>
      <Text style={styles.message}>
        <FormattedMessage id="phdZCb" defaultMessage="Suas fotos não são enviadas para nenhum servidor" />
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    // Se houver necessidade de pointerEvents, defina via style:
    // Exemplo: pointerEvents: 'auto'
  },
  message: {
    marginBottom: 8,
    // Se necessário, em vez de usar a prop `pointerEvents` no componente,
    // inclua-a aqui via style, conforme a recomendação.
  },
});
