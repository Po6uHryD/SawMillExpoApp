import React from 'react';
import { View, Text, Button } from 'react-native';
// Импортируйте необходимые модули для работы с Excel
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';

export default function HomeScreen() {
  const importItems = async () => {
    try {
      // Открываем диалог для выбора файла
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      if (result.type === 'success') {
        // Читаем файл
        const file = await fetch(result.uri);
        const data = await file.blob();
        const reader = new FileReader();
        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const items = XLSX.utils.sheet_to_json(sheet);
            console.log(items); // Здесь вы можете обработать данные
          };
          reader.readAsArrayBuffer(data);
      }
    } catch (error) {
      console.error("Error importing file: ", error);
    }
  };

  return (
    <View>
      <Text>Welcome to Home Screen</Text>
      <Button title="Импортировать список изделий" onPress={importItems} />
    </View>
  );
}