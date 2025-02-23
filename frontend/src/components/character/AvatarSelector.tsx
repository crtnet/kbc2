import React, { useState } from 'react';
import { View, StyleSheet, Image, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Text, Button, Portal, Modal } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';

interface AvatarSelectorProps {
  visible: boolean;
  onDismiss: () => void;
  onSelectAvatar: (avatar: string) => void;
  title: string;
}

const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  visible,
  onDismiss,
  onSelectAvatar,
  title,
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState<string | number | null>(null);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  // Lista de avatares pré-definidos
  const defaultAvatars = [
    require('../../../assets/avatars/boy1.png'),
    require('../../../assets/avatars/boy2.png'),
    require('../../../assets/avatars/girl1.png'),
    require('../../../assets/avatars/girl2.png'),
    require('../../../assets/avatars/animal1.png'),
    require('../../../assets/avatars/animal2.png'),
    require('../../../assets/avatars/fantasy1.png'),
    require('../../../assets/avatars/fantasy2.png'),
  ];

  const handleImagePicker = async () => {
    try {
      // Solicitar permissão para acessar a galeria
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        alert('Desculpe, precisamos de permissão para acessar a galeria de fotos.');
        return;
      }

      // Abrir a galeria para selecionar imagem
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setCustomAvatar(uri);
        setSelectedAvatar(uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      alert('Erro ao selecionar imagem. Tente novamente.');
    }
  };

  const handleConfirm = () => {
    if (selectedAvatar) {
      // Se for um avatar pré-definido, converte para URI
      const avatarToSend = typeof selectedAvatar === 'number' 
        ? Image.resolveAssetSource(selectedAvatar).uri 
        : selectedAvatar;
      
      onSelectAvatar(avatarToSend);
      onDismiss();
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.title}>{title}</Text>
        
        <ScrollView style={styles.avatarGrid}>
          <View style={styles.gridContainer}>
            {defaultAvatars.map((avatar, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.avatarContainer,
                  selectedAvatar === avatar && styles.selectedAvatarContainer,
                ]}
                onPress={() => setSelectedAvatar(avatar)}
              >
                <Image source={avatar} style={styles.avatar} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Button
          mode="contained"
          onPress={handleImagePicker}
          style={styles.uploadButton}
        >
          Carregar Imagem
        </Button>

        {customAvatar && (
          <View style={styles.customAvatarContainer}>
            <Text>Imagem Personalizada:</Text>
            <Image source={{ uri: customAvatar }} style={styles.customAvatar} />
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={onDismiss}
            style={styles.button}
          >
            Cancelar
          </Button>
          <Button
            mode="contained"
            onPress={handleConfirm}
            style={styles.button}
            disabled={!selectedAvatar}
          >
            Confirmar
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  avatarGrid: {
    maxHeight: 300,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    margin: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAvatarContainer: {
    borderColor: '#1976d2',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    resizeMode: 'cover',
  },
  uploadButton: {
    marginVertical: 10,
  },
  customAvatarContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  customAvatar: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginTop: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default AvatarSelector;