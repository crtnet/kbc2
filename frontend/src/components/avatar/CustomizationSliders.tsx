// src/components/avatar/CustomizationSliders.tsx
import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { CustomizationSlider } from './AvatarParts';

// Fallback slider for environments where @react-native-community/slider isn't available
const FallbackSlider = ({ 
  value, 
  minimumValue, 
  maximumValue, 
  step, 
  onValueChange, 
  style 
}) => {
  return (
    <View style={[style, { height: 40, backgroundColor: '#f0f0f0', borderRadius: 4 }]}>
      <Text style={{ textAlign: 'center', lineHeight: 40, color: '#888' }}>
        Valor: {value}
      </Text>
    </View>
  );
};

// Try to import Slider with fallback for environments without the module
let Slider;
try {
  Slider = require('@react-native-community/slider').default;
} catch (e) {
  console.warn('Slider component not available, using fallback');
  Slider = FallbackSlider;
}

interface CustomizationSlidersProps {
  currentPartCategory: string;
  customAvatar: any;
  sliders: { [key: string]: CustomizationSlider[] };
  onSliderChange: (sliderId: string, value: number) => void;
}

const CustomizationSliders: React.FC<CustomizationSlidersProps> = ({
  currentPartCategory,
  customAvatar,
  sliders,
  onSliderChange
}) => {
  // Estado para rastrear carregamento
  const [isLoading, setIsLoading] = useState(true);
  
  // Use useEffect para atualizar o estado de carregamento quando a categoria muda
  useEffect(() => {
    console.log(`CustomizationSliders: Categoria alterada para ${currentPartCategory}`);
    setIsLoading(true);
    
    // Pequeno delay para mostrar um indicador de carregamento e garantir que o componente será atualizado
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  }, [currentPartCategory]);
  
  // Use useMemo para evitar recálculos desnecessários
  const currentPartSliders = useMemo(() => {
    return sliders[currentPartCategory] || [];
  }, [sliders, currentPartCategory]);
  
  if (isLoading) {
    return (
      <View style={[styles.slidersContainer, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Carregando ajustes...</Text>
      </View>
    );
  }
  
  if (currentPartSliders.length === 0) {
    return (
      <View style={styles.slidersContainer} testID="no-sliders-container">
        <Text style={styles.noSlidersText}>
          Este elemento não possui opções de ajuste
        </Text>
      </View>
    );
  }
  
  // Função para obter o valor atual de um slider
  const getSliderValue = (sliderId: string): number => {
    const part = customAvatar[currentPartCategory];
    if (!part) return 1;
    
    switch (sliderId) {
      case 'size':
        return part.size || 1;
      case 'width':
        return part.width || 1;
      case 'height':
        return part.height || 1;
      case 'spacing':
        return part.spacing || 1;
      case 'rotation':
        return part.rotation || 0;
      case 'density':
        return part.density || 1;
      case 'position_y':
        return part.position?.y || 0;
      case 'position_x':
        return part.position?.x || 0;
      default:
        return 1;
    }
  };
  
  // Gerar uma chave única para ScrollView para forçar recriação quando a categoria muda
  const slidersKey = `sliders-${currentPartCategory}`;
  
  return (
    <ScrollView 
      key={slidersKey}
      style={styles.slidersContainer} 
      showsVerticalScrollIndicator={false}
      testID="sliders-container"
    >
      <Text style={styles.slidersTitle}>Ajustes disponíveis:</Text>
      {currentPartSliders.map((slider) => {
        const currentValue = getSliderValue(slider.id);
        
        return (
          <View key={`${currentPartCategory}-${slider.id}`} style={styles.sliderContainer} testID={`slider-${slider.id}`}>
            <View style={styles.sliderLabelContainer}>
              <Text style={styles.sliderLabel}>{slider.name}</Text>
              <Text style={styles.sliderValue}>
                {Number.isInteger(currentValue) ? currentValue : currentValue.toFixed(2)}
              </Text>
            </View>
            <Slider
              value={currentValue}
              minimumValue={slider.min}
              maximumValue={slider.max}
              step={slider.step}
              onValueChange={(value) => onSliderChange(slider.id, value)}
              minimumTrackTintColor="#2196F3"
              maximumTrackTintColor="#D1D1D1"
              thumbTintColor="#2196F3"
              style={styles.slider}
              accessibilityLabel={`Ajustar ${slider.name}`}
            />
          </View>
        );
      })}
      
      <View style={styles.resetContainer}>
        <Text 
          style={styles.resetButton}
          onPress={() => {
            // Reset all sliders for this part to default values
            currentPartSliders.forEach(slider => {
              onSliderChange(slider.id, slider.defaultValue);
            });
          }}
        >
          Restaurar Padrões
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  slidersContainer: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 15
  },
  slidersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center'
  },
  sliderContainer: {
    marginBottom: 25,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1
  },
  sliderLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sliderLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500'
  },
  sliderValue: {
    fontSize: 15,
    color: '#2196F3',
    fontWeight: 'bold'
  },
  slider: {
    width: '100%',
    height: 40
  },
  noSlidersText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20
  },
  resetContainer: {
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 60,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 20
  },
  resetButton: {
    color: '#F44336',
    fontSize: 15,
    fontWeight: 'bold',
    padding: 10
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

export default CustomizationSliders;