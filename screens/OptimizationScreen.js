import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Button, Alert, Share } from 'react-native';
import { optimizeCuttingWithStats } from '../utils/optimizeCutting';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function OptimizationScreen({ route, navigation }) {
  const { stockLength, items } = route.params;
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Запускаем оптимизацию при загрузке экрана
    runOptimization();
  }, []);

  const runOptimization = () => {
    setLoading(true);
    setError(null);

    try {
      // Запускаем алгоритм оптимизации
      const result = optimizeCuttingWithStats(stockLength, items);
      
      if (result.error) {
        setError(result.error);
      } else {
        setOptimizationResult(result);
      }
    } catch (err) {
      setError(err.message || 'Произошла ошибка при оптимизации');
    } finally {
      setLoading(false);
    }
  };

  // Функция для форматирования числа с разделителями тысяч
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  // Функция для экспорта результатов
  const exportResults = async () => {
    if (!optimizationResult) return;

    try {
      // Создаем текстовое представление результатов
      let resultText = `РЕЗУЛЬТАТЫ ОПТИМИЗАЦИИ РАСКРОЯ\n\n`;
      resultText += `Длина заготовки: ${stockLength} см\n`;
      resultText += `Количество изделий: ${items.reduce((sum, item) => sum + item.quantity, 0)}\n`;
      resultText += `Количество типов изделий: ${items.length}\n\n`;
      
      resultText += `СТАТИСТИКА:\n`;
      resultText += `Использовано заготовок: ${optimizationResult.stats.totalStocks} шт.\n`;
      resultText += `Общая длина использованных заготовок: ${formatNumber(optimizationResult.stats.totalStocks * stockLength)} см\n`;
      resultText += `Общая длина использованного материала: ${formatNumber(optimizationResult.stats.totalUsedLength)} см\n`;
      resultText += `Общая длина отходов: ${formatNumber(optimizationResult.stats.totalWaste)} см\n`;
      resultText += `Общая эффективность: ${optimizationResult.stats.overallEfficiency}%\n\n`;
      
      resultText += `ПЛАНЫ РАСКРОЯ:\n`;
      optimizationResult.plans.forEach((plan, index) => {
        resultText += `\nЗаготовка ${index + 1}:\n`;
        resultText += `Эффективность использования: ${plan.utilizationPercent}%\n`;
        resultText += `Остаток: ${plan.remainingLength} см\n`;
        resultText += `Изделия:\n`;
        
        plan.pieces.forEach((piece, pieceIndex) => {
          resultText += `  ${pieceIndex + 1}. ${piece.originalItem.name || 'Изделие'}: ${piece.length} см\n`;
        });
      });
      
      // Создаем временный файл
      const fileUri = `${FileSystem.documentDirectory}оптимизация_раскроя_${Date.now()}.txt`;
      await FileSystem.writeAsStringAsync(fileUri, resultText);
      
      // Проверяем, доступно ли общий доступ
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert(
          "Ошибка",
          "Функция общего доступа недоступна на этом устройстве"
        );
      }
    } catch (error) {
      Alert.alert("Ошибка", `Не удалось экспортировать результаты: ${error.message}`);
    }
  };

  // Функция для отображения списка изделий
  const renderItemsList = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Список изделий:</Text>
        {items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemDetails}>{item.length} см × {item.quantity} шт.</Text>
          </View>
        ))}
      </View>
    );
  };

  // Функция для отображения статистики
  const renderStats = () => {
    if (!optimizationResult) return null;
    
    const { stats } = optimizationResult;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Статистика:</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Использовано заготовок:</Text>
          <Text style={styles.statsValue}>{stats.totalStocks} шт.</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Общая длина заготовок:</Text>
          <Text style={styles.statsValue}>{formatNumber(stats.totalStocks * stockLength)} см</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Использовано материала:</Text>
          <Text style={styles.statsValue}>{formatNumber(stats.totalUsedLength)} см</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Общая длина отходов:</Text>
          <Text style={styles.statsValue}>{formatNumber(stats.totalWaste)} см</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Эффективность:</Text>
          <Text style={[styles.statsValue, { fontWeight: 'bold' }]}>{stats.overallEfficiency}%</Text>
        </View>
      </View>
    );
  };

  // Функция для отображения планов раскроя
  const renderCuttingPlans = () => {
    if (!optimizationResult) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Планы раскроя:</Text>
        {optimizationResult.plans.map((plan, index) => (
          <View key={index} style={styles.planContainer}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>Заготовка {index + 1}</Text>
              <Text style={styles.planEfficiency}>Эффективность: {plan.utilizationPercent}%</Text>
            </View>
            
            <View style={styles.stockVisual}>
              <View style={[styles.stockUsed, { flex: stockLength - plan.remainingLength }]} />
              {plan.remainingLength > 0 && (
                <View style={[styles.stockWaste, { flex: plan.remainingLength }]}>
                  <Text style={styles.wasteText}>{plan.remainingLength} см</Text>
                </View>
              )}
            </View>
            
            <View style={styles.piecesContainer}>
              {plan.pieces.map((piece, pieceIndex) => (
                <View key={pieceIndex} style={styles.pieceRow}>
                  <Text style={styles.pieceIndex}>{pieceIndex + 1}.</Text>
                  <Text style={styles.pieceName}>{piece.originalItem.name || 'Изделие'}</Text>
                  <Text style={styles.pieceLength}>{piece.length} см</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Результаты оптимизации</Text>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Выполняется оптимизация...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ошибка: {error}</Text>
          <Button title="Вернуться назад" onPress={() => navigation.goBack()} />
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {renderItemsList()}
          {renderStats()}
          {renderCuttingPlans()}
          
          <View style={styles.buttonsContainer}>
            <Button 
              title="Экспортировать результаты" 
              onPress={exportResults} 
            />
            <Button 
              title="Вернуться к списку изделий" 
              onPress={() => navigation.goBack()} 
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    fontSize: 16,
  },
  itemDetails: {
    fontSize: 16,
    color: '#555',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statsLabel: {
    fontSize: 16,
  },
  statsValue: {
    fontSize: 16,
    color: '#333',
  },
  planContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    padding: 8,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  planEfficiency: {
    fontSize: 16,
    color: '#555',
  },
  stockVisual: {
    height: 30,
    flexDirection: 'row',
    marginVertical: 8,
  },
  stockUsed: {
    backgroundColor: '#4CAF50',
    height: '100%',
  },
  stockWaste: {
    backgroundColor: '#F44336',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wasteText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  piecesContainer: {
    padding: 8,
  },
  pieceRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  pieceIndex: {
    width: 25,
    fontSize: 14,
  },
  pieceName: {
    flex: 1,
    fontSize: 14,
  },
  pieceLength: {
    width: 60,
    fontSize: 14,
    textAlign: 'right',
  },
  buttonsContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
});