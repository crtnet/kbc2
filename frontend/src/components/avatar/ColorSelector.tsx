// src/components/avatar/ColorSelector.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { AvatarColor, CustomAvatar } from './AvatarParts';

// Tenta importar os componentes do react-native-paper; se não estiverem disponíveis, utiliza fallbacks simples
let Menu, Button, Dialog, Portal;
try {
  const RNPaper = require('react-native-paper');
  Menu = RNPaper.Menu;
  Button = RNPaper.Button;
  Dialog = RNPaper.Dialog;
  Portal = RNPaper.Portal;
} catch (e) {
  console.warn('react-native-paper não está disponível, utilizando componentes alternativos');
  
  // Fallback simples para Menu e seus itens
  Menu = ({ visible, onDismiss, anchor, style, children }) => {
    if (!visible) return null;
    return (
      <View style={[{
        position: 'absolute',
        backgroundColor: 'white',
        top: anchor.y,
        left: anchor.x,
        zIndex: 1000,
        padding: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ddd'
      }, style]}>
        {children}
      </View>
    );
  };
  Menu.Item = ({ onPress, title, leadingIcon }) => (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
      {typeof leadingIcon === 'function' ? leadingIcon() : null}
      <Text style={{ marginLeft: 10 }}>{title}</Text>
    </TouchableOpacity>
  );
  
  Button = ({ onPress, children }) => (
    <TouchableOpacity 
      onPress={onPress} 
      style={{ padding: 10, backgroundColor: '#2196F3', borderRadius: 5, margin: 5 }}
    >
      <Text style={{ color: 'white', textAlign: 'center' }}>{children}</Text>
    </TouchableOpacity>
  );
  
  Dialog = ({ visible, onDismiss, children }) => {
    if (!visible) return null;
    return (
      <View style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999
      }}>
        <View style={{ backgroundColor: 'white', borderRadius: 5, padding: 20, width: '80%' }}>
          {children}
        </View>
      </View>
    );
  };
  Dialog.Title = ({ children }) => <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>{children}</Text>;
  Dialog.Content = ({ children }) => <View>{children}</View>;
  Dialog.Actions = ({ children }) => <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 }}>{children}</View>;
  
  Portal = ({ children }) => <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>{children}</View>;
}

interface ColorSelectorProps {
  currentPartCategory: string;
  customAvatar: CustomAvatar;
  savedColors: AvatarColor[];
  onSelectColor: (color: string) => void;
  onOpenColorMenu: (event: any) => void;
  showColorMenu: boolean;
  onDismissColorMenu: () => void;
  colorMenuAnchor: { x: number, y: number };
  onSaveCustomColor: (color: string, name: string) => void;
  canColorize: boolean;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({
  currentPartCategory,
  customAvatar,
  savedColors,
  onSelectColor,
  onOpenColorMenu,
  showColorMenu,
  onDismissColorMenu,
  colorMenuAnchor,
  onSaveCustomColor,
  canColorize
}) => {
  // Estados para controle do diálogo de cor personalizada e loading
  const [showCustomColorDialog, setShowCustomColorDialog] = useState(false);
  const [customColor, setCustomColor] = useState('#FF0000');
  const [customColorName, setCustomColorName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Quando a categoria mudar, exibe um loading breve para transição
  useEffect(() => {
    console.log(`ColorSelector: Categoria alterada para ${currentPartCategory}`);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  }, [currentPartCategory]);

  // Array de cores pré-definidas memorizado para evitar recálculos
  const predefinedColors = useMemo(() => [
    { name: 'Vermelho', value: '#FF4D4D' },
    { name: 'Verde', value: '#4CAF50' },
    { name: 'Azul', value: '#2196F3' },
    { name: 'Amarelo', value: '#FFC107' },
    { name: 'Roxo', value: '#9C27B0' },
    { name: 'Laranja', value: '#FF9800' },
    { name: 'Marrom', value: '#795548' },
    { name: 'Azul Acinzentado', value: '#607D8B' },
    { name: 'Preto', value: '#000000' },
    { name: 'Branco', value: '#FFFFFF' }
  ], []);

  // Abre o diálogo para criar uma cor personalizada
  const handleAddCustomColor = () => {
    onDismissColorMenu();
    setShowCustomColorDialog(true);
  };

  // Salva a cor personalizada e reinicia os estados do diálogo
  const handleSaveCustomColor = () => {
    onSaveCustomColor(customColor, customColorName || 'Cor personalizada');
    setShowCustomColorDialog(false);
    setCustomColor('#FF0000');
    setCustomColorName('');
  };

  if (!canColorize) {
    return (
      <View style={styles.colorSelectorContainer} testID="no-color-options">
        <Text style={styles.noColorOptionsText}>
          Este elemento não possui opções de cor
        </Text>
      </View>
    );
  }
  
  if (isLoading) {
    return (
      <View style={[styles.colorSelectorContainer, styles.loadingContainer]} testID="color-selector-loading">
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Carregando opções de cores...</Text>
      </View>
    );
  }
  
  // Gera uma chave única para forçar a recriação do ScrollView quando a categoria mudar
  const colorsKey = `colors-${currentPartCategory}`;
  
  return (
    <View style={styles.colorSelectorContainer} testID="color-selector">
      <Text style={styles.colorSelectorTitle}>Selecione uma cor:</Text>
      <ScrollView 
        key={colorsKey}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.colorSwatchesContainer}
      >
        <View style={styles.colorGrid}>
          {savedColors.map((color) => (
            <TouchableOpacity
              key={color.id}
              style={[
                styles.colorSwatch,
                { backgroundColor: color.value },
                customAvatar[currentPartCategory]?.color === color.value && styles.selectedColorSwatch
              ]}
              onPress={() => onSelectColor(color.value)}
              accessibilityLabel={`Cor ${color.name}`}
              testID={`color-swatch-${color.id}`}
            >
              {customAvatar[currentPartCategory]?.color === color.value && (
                <View style={styles.selectedColorIndicator} />
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addColorButton}
            onPress={onOpenColorMenu}
            accessibilityLabel="Adicionar nova cor"
            testID="add-color-button"
          >
            <Text style={styles.addColorButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Menu de cores com opções pré-definidas */}
      <Menu
        visible={showColorMenu}
        onDismiss={onDismissColorMenu}
        anchor={{ x: colorMenuAnchor.x, y: colorMenuAnchor.y }}
        style={styles.colorMenu}
      >
        {predefinedColors.map((color) => (
          <Menu.Item 
            key={color.value}
            onPress={() => onSelectColor(color.value)} 
            title={color.name} 
            leadingIcon={() => <View style={[styles.colorMenuItem, { backgroundColor: color.value }]} />}
          />
        ))}
        <Menu.Item 
          onPress={handleAddCustomColor} 
          title="Personalizar cor..." 
          leadingIcon="eyedropper-variant"
        />
      </Menu>

      {/* Diálogo para criação de cor personalizada */}
      <Portal>
        <Dialog visible={showCustomColorDialog} onDismiss={() => setShowCustomColorDialog(false)}>
          <Dialog.Title>Criar cor personalizada</Dialog.Title>
          <Dialog.Content>
            <View style={styles.colorPreview}>
              <View style={[styles.colorPreviewSwatch, { backgroundColor: customColor }]} />
            </View>
            <TextInput 
              value={customColor}
              onChangeText={setCustomColor}
              placeholder="Código da cor (ex: #FF0000)"
              style={styles.colorInput}
            />
            <TextInput 
              value={customColorName}
              onChangeText={setCustomColorName}
              placeholder="Nome da cor (opcional)"
              style={styles.colorInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCustomColorDialog(false)}>Cancelar</Button>
            <Button onPress={handleSaveCustomColor}>Salvar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Exibe a cor atualmente selecionada */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Cor atual: {savedColors.find(c => 
            c.value === customAvatar[currentPartCategory]?.color
          )?.name || customAvatar[currentPartCategory]?.color || 'Não definida'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  colorSelectorContainer: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    flex: 1
  },
  colorSelectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center'
  },
  colorSwatchesContainer: {
    paddingBottom: 20
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  colorSwatch: {
    width: 55,
    height: 55,
    borderRadius: 30,
    margin: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  selectedColorSwatch: {
    borderWidth: 3,
    borderColor: '#2196F3'
  },
  selectedColorIndicator: {
    width: 15,
    height: 15,
    borderRadius: 10,
    backgroundColor: '#fff'
  },
  addColorButton: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    margin: 10
  },
  addColorButtonText: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold'
  },
  noColorOptionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20
  },
  colorMenu: {
    width: 250,
    borderRadius: 8,
    elevation: 5
  },
  colorMenuItem: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  colorPreview: {
    alignItems: 'center',
    marginBottom: 16
  },
  colorPreviewSwatch: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  colorInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginBottom: 12,
    paddingHorizontal: 12
  },
  infoContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  }
});

export default ColorSelector;