import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  Modal, 
  Platform 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useImagePicker } from '../hooks/useImagePicker';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';

interface ImageSelectorProps {
  onImageSelected?: (uri: string) => void;
  initialImage?: string;
  aspectRatio?: [number, number];
  allowCropping?: boolean;
}

export const ImageSelector: React.FC<ImageSelectorProps> = ({
  onImageSelected,
  initialImage,
  aspectRatio = [1, 1],
  allowCropping = true,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { image, pickImage, takePhoto, clearImage } = useImagePicker();
  const [modalVisible, setModalVisible] = useState(false);

  const handleImageSelect = async () => {
    const selectedImage = await pickImage({
      aspect: aspectRatio,
      allowsEditing: allowCropping,
    });
    
    if (selectedImage) {
      onImageSelected?.(selectedImage);
      setModalVisible(false);
    }
  };

  const handleTakePhoto = async () => {
    const capturedImage = await takePhoto({
      aspect: aspectRatio,
      allowsEditing: allowCropping,
    });
    
    if (capturedImage) {
      onImageSelected?.(capturedImage);
      setModalVisible(false);
    }
  };

  const renderImage = () => {
    const imageUri = image || initialImage;
    
    return imageUri ? (
      <Image 
        source={{ uri: imageUri }} 
        style={styles.image} 
        resizeMode="cover" 
      />
    ) : (
      <View style={[
        styles.placeholderContainer, 
        { backgroundColor: theme.colors.card }
      ]}>
        <MaterialIcons 
          name="add-photo-alternate" 
          size={48} 
          color={theme.colors.textSecondary} 
        />
        <Text style={{ color: theme.colors.textSecondary }}>
          {t('image.selectImage')}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.imageContainer}
        onPress={() => setModalVisible(true)}
      >
        {renderImage()}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[
            styles.modalContent, 
            { backgroundColor: theme.colors.card }
          ]}>
            <Text style={[
              styles.modalTitle, 
              { color: theme.colors.text }
            ]}>
              {t('image.chooseSource')}
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  { backgroundColor: theme.colors.primary }
                ]}
                onPress={handleImageSelect}
              >
                <MaterialIcons name="photo-library" size={24} color="white" />
                <Text style={styles.buttonText}>
                  {t('image.gallery')}
                </Text>
              </TouchableOpacity>

              {Platform.OS !== 'web' && (
                <TouchableOpacity 
                  style={[
                    styles.modalButton, 
                    { backgroundColor: theme.colors.success }
                  ]}
                  onPress={handleTakePhoto}
                >
                  <MaterialIcons name="camera-alt" size={24} color="white" />
                  <Text style={styles.buttonText}>
                    {t('image.camera')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: theme.colors.textSecondary }}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  imageContainer: {
    width: 200,
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    width: '45%',
  },
  buttonText: {
    color: 'white',
    marginLeft: 10,
  },
  closeButton: {
    marginTop: 15,
  },
});