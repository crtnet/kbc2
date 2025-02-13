import React from 'react';
import { View } from 'react-native';

const App = () => {
  return (
    <View style={styles.container}>
      {/* Your app content here */}
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    // Use boxShadow instead of shadowProps
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    // Use style.pointerEvents instead of props.pointerEvents
    pointerEvents: 'auto'
  }
};

export default App;