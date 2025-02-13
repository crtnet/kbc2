import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FormattedMessage } from 'react-intl';
import { Text } from 'react-native';

const MainScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <FormattedMessage id="I86Kj3" defaultMessage="HEIC to JPG" />
        </Text>
      </View>
      
      <View style={styles.qualitySection}>
        <Text style={styles.label}>
          <FormattedMessage id="y+7ihJ" defaultMessage="Quality" />
        </Text>
      </View>

      <View style={styles.uploadSection}>
        <Text style={styles.text}>
          <FormattedMessage id="aZ1Q0A" defaultMessage="Drag and drop images or" />
        </Text>
        <Text style={styles.text}>
          <FormattedMessage id="qZGdi+" defaultMessage="HEIC files are allowed" />
        </Text>
        <Text style={styles.text}>
          <FormattedMessage id="W4cWeE" defaultMessage="unlimited number of files" />
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          <FormattedMessage 
            id="phdZCb" 
            defaultMessage="Your photos are not uploaded to any server." 
          />
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  qualitySection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  uploadSection: {
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    marginBottom: 8,
  },
  infoSection: {
    marginTop: 'auto',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
});

export default MainScreen;