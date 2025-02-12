// FlipBookScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { WebView } from 'react-native-webview';

export default function FlipBookScreen({ route, navigation }) {
  // Recebe a URL do visualizador de flipbook via parâmetros
  const { viewerUrl } = route.params;

  return (
    <View style={styles.container}>
      <WebView 
        source={{ uri: viewerUrl }}
        startInLoadingState={true}
        renderLoading={() => <ActivityIndicator size="large" style={styles.loader} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
