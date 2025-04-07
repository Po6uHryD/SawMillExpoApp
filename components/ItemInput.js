import React from 'react';
import { View, TextInput, Button } from 'react-native';

export default function ItemInput({ onAddItem }) {
  // Логика для добавления изделия
  return (
    <View>
      <TextInput placeholder="Описание изделия" />
      <TextInput placeholder="Длина изделия" keyboardType="numeric" />
      <TextInput placeholder="Количество" keyboardType="numeric" />
      <Button title="Добавить изделие" onPress={onAddItem} />
    </View>
  );
}