import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
// Импортируем необходимые модули для работы с Excel
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';

export default function HomeScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [stockLength, setStockLength] = useState('600'); // По умолчанию 6 метров (в см)
  const [isLoading, setIsLoading] = useState(false);

  const importItems = async () => {
    try {
      setIsLoading(true);
      // Открываем диалог для выбора файла
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      if (result.canceled) {
        setIsLoading(false);
        return;
      }
      
      if (result.assets && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        // Читаем файл
        const file = await fetch(selectedFile.uri);
        const data = await file.blob();
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const arrayBuffer = e.target.result;
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const importedItems = XLSX.utils.sheet_to_json(sheet);
            
            // Проверяем и преобразуем данные
            const processedItems = processImportedData(importedItems);
            setItems(processedItems);
            
            Alert.alert(
              "Импорт успешен", 
              `Загружено ${processedItems.length} позиций изделий.`
            );
          } catch (error) {
            Alert.alert("Ошибка", "Не удалось прочитать файл Excel: " + error.message);
          } finally {
            setIsLoading(false);
          }
        };
        
        reader.onerror = () => {
          Alert.alert("Ошибка", "Не удалось прочитать файл");
          setIsLoading(false);
        };
        
        reader.readAsArrayBuffer(data);
      }
    } catch (error) {
      Alert.alert("Ошибка", "Ошибка импорта файла: " + error.message);
      setIsLoading(false);
    }
  };

  // Функция для обработки и валидации импортированных данных
  const processImportedData = (importedItems) => {
    if (!importedItems || importedItems.length === 0) {
      throw new Error("Файл не содержит данных");
    }
    
    // Проверяем наличие необходимых полей в первой строке
    const firstItem = importedItems[0];
    const hasLengthField = 'length' in firstItem || 'Length' in firstItem || 'длина' in firstItem || 'Длина' in firstItem;
    const hasQuantityField = 'quantity' in firstItem || 'Quantity' in firstItem || 'количество' in firstItem || 'Количество' in firstItem;
    
    if (!hasLengthField || !hasQuantityField) {
      throw new Error("В файле отсутствуют обязательные поля: длина и/или количество");
    }
    
    // Нормализуем данные
    return importedItems.map((item, index) => {
      // Определяем, какие поля использовать
      const lengthField = 'length' in item ? 'length' : 
                          'Length' in item ? 'Length' : 
                          'длина' in item ? 'длина' : 'Длина';
      
      const quantityField = 'quantity' in item ? 'quantity' : 
                            'Quantity' in item ? 'Quantity' : 
                            'количество' in item ? 'количество' : 'Количество';
      
      // Преобразуем в числа
      const length = parseFloat(item[lengthField]);
      const quantity = parseInt(item[quantityField], 10);
      
      // Проверяем валидность
      if (isNaN(length) || length <= 0) {
        throw new Error(`Некорректная длина в строке ${index + 1}: ${item[lengthField]}`);
      }
      
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error(`Некорректное количество в строке ${index + 1}: ${item[quantityField]}`);
      }
      
      // Проверяем, что длина не превышает длину заготовки
      if (length > parseFloat(stockLength)) {
        throw new Error(`Длина изделия (${length}) в строке ${index + 1} превышает длину заготовки (${stockLength})`);
      }
      
      return {
        length,
        quantity,
        name: item.name || item.Name || item.название || item.Название || `Изделие ${index + 1}`
      };
    });
  };

  // Функция для добавления нового изделия вручную
  const addNewItem = () => {
    setItems([...items, { name: `Изделие ${items.length + 1}`, length: 0, quantity: 1 }]);
  };

  // Функция для обновления данных изделия
  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = field === 'name' ? value : parseFloat(value);
    setItems(updatedItems);
  };

  // Функция для удаления изделия
  const removeItem = (index) => {
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    setItems(updatedItems);
  };

  // Функция для перехода на экран оптимизации
  const goToOptimization = () => {
    // Проверяем, что есть данные для оптимизации
    if (items.length === 0) {
      Alert.alert("Ошибка", "Нет данных для оптимизации. Импортируйте данные или добавьте изделия вручную.");
      return;
    }
    
    // Проверяем валидность длины заготовки
    const stockLengthValue = parseFloat(stockLength);
    if (isNaN(stockLengthValue) || stockLengthValue <= 0) {
      Alert.alert("Ошибка", "Некорректная длина заготовки");
      return;
    }
    
    // Проверяем, что все изделия имеют корректные значения
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (isNaN(item.length) || item.length <= 0) {
        Alert.alert("Ошибка", `Некорректная длина изделия "${item.name}"`);
        return;
      }
      
      if (isNaN(item.quantity) || item.quantity <= 0) {
        Alert.alert("Ошибка", `Некорректное количество изделия "${item.name}"`);
        return;
      }
      
      if (item.length > stockLengthValue) {
        Alert.alert("Ошибка", `Длина изделия "${item.name}" (${item.length}) превышает длину заготовки (${stockLengthValue})`);
        return;
      }
    }
    
    // Переходим на экран оптимизации с данными
    navigation.navigate('Optimization', {
      stockLength: stockLengthValue,
      items: items
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Раскрой заготовок</Text>
      
      <View style={styles.stockLengthContainer}>
        <Text style={styles.label}>Длина заготовки (см):</Text>
        <TextInput
          style={styles.stockLengthInput}
          value={stockLength}
          onChangeText={setStockLength}
          keyboardType="numeric"
          placeholder="Введите длину заготовки"
        />
      </View>
      
      <View style={styles.buttonsContainer}>
        <Button 
          title="Импортировать из Excel" 
          onPress={importItems}
          disabled={isLoading} 
        />
        <Button 
          title="Добавить изделие" 
          onPress={addNewItem} 
          disabled={isLoading}
        />
      </View>
      
      {items.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Список изделий:</Text>
          <ScrollView style={styles.itemsContainer}>
            {items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <TextInput
                  style={styles.nameInput}
                  value={item.name}
                  onChangeText={(value) => updateItem(index, 'name', value)}
                  placeholder="Название"
                />
                <TextInput
                  style={styles.numberInput}
                  value={item.length.toString()}
                  onChangeText={(value) => updateItem(index, 'length', value)}
                  keyboardType="numeric"
                  placeholder="Длина"
                />
                <TextInput
                  style={styles.numberInput}
                  value={item.quantity.toString()}
                  onChangeText={(value) => updateItem(index, 'quantity', value)}
                  keyboardType="numeric"
                  placeholder="Кол-во"
                />
                <Button title="X" onPress={() => removeItem(index)} color="red" />
              </View>
            ))}
          </ScrollView>
          
          <Button 
            title="Оптимизировать раскрой" 
            onPress={goToOptimization}
            color="green"
            disabled={isLoading || items.length === 0}
          />
        </>
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
  stockLengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginRight: 8,
  },
  stockLengthInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  itemsContainer: {
    maxHeight: 300,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameInput: {
    flex: 2,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginRight: 8,
  },
  numberInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginRight: 8,
  },
});