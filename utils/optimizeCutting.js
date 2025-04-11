/**
 * Функция оптимизации раскроя заготовок
 * @param {number} stockLength - длина заготовки со склада (6 метров)
 * @param {Array} items - массив объектов с полями length (длина изделия) и quantity (количество)
 * @returns {Array} - массив планов раскроя заготовок
 */
export function optimizeCutting(stockLength, items) {
  // Проверка входных данных
  if (!stockLength || !items || !items.length) {
    return [];
  }

  // Преобразуем входные данные в массив отдельных изделий
  let allPieces = [];
  items.forEach(item => {
    for (let i = 0; i < item.quantity; i++) {
      allPieces.push({
        length: item.length,
        originalItem: item // сохраняем ссылку на исходный элемент
      });
    }
  });

  // Сортируем изделия по убыванию длины для более эффективной упаковки
  allPieces.sort((a, b) => b.length - a.length);

  // Массив для хранения результатов раскроя
  const cuttingPlans = [];
  
  // Пока есть неразмещенные изделия
  while (allPieces.length > 0) {
    // Создаем новую заготовку
    const currentStock = {
      remainingLength: stockLength,
      pieces: []
    };
    
    // Флаг, показывающий, удалось ли добавить хотя бы одно изделие
    let addedAny = false;
    
    // Пытаемся разместить изделия в текущей заготовке
    for (let i = 0; i < allPieces.length; i++) {
      if (allPieces[i].length <= currentStock.remainingLength) {
        // Добавляем изделие в текущую заготовку
        currentStock.pieces.push(allPieces[i]);
        currentStock.remainingLength -= allPieces[i].length;
        
        // Удаляем изделие из списка неразмещенных
        allPieces.splice(i, 1);
        i--; // Корректируем индекс после удаления
        addedAny = true;
      }
    }
    
    // Если не удалось добавить ни одного изделия, значит осталось изделие,
    // которое не помещается в заготовку
    if (!addedAny && allPieces.length > 0) {
      throw new Error(`Изделие длиной ${allPieces[0].length} не помещается в заготовку длиной ${stockLength}`);
    }
    
    // Добавляем план раскроя текущей заготовки в результат
    cuttingPlans.push({
      pieces: currentStock.pieces,
      remainingLength: currentStock.remainingLength,
      utilizationPercent: ((stockLength - currentStock.remainingLength) / stockLength * 100).toFixed(2)
    });
  }
  
  return cuttingPlans;
}

/**
 * Функция для второго прохода оптимизации - пытается улучшить результат,
 * перераспределяя изделия между заготовками
 * @param {number} stockLength - длина заготовки со склада
 * @param {Array} initialPlans - начальный план раскроя
 * @returns {Array} - улучшенный план раскроя
 */
export function improveOptimization(stockLength, initialPlans) {
  if (!initialPlans || initialPlans.length <= 1) {
    return initialPlans;
  }
  
  // Копируем планы для работы
  const plans = JSON.parse(JSON.stringify(initialPlans));
  
  // Сортируем планы по возрастанию оставшейся длины
  plans.sort((a, b) => a.remainingLength - b.remainingLength);
  
  let improved = true;
  
  // Продолжаем улучшать, пока есть изменения
  while (improved) {
    improved = false;
    
    // Пытаемся перераспределить изделия
    for (let i = 0; i < plans.length - 1; i++) {
      const currentPlan = plans[i];
      
      // Перебираем все последующие планы
      for (let j = i + 1; j < plans.length; j++) {
        const nextPlan = plans[j];
        
        // Пытаемся найти изделие в nextPlan, которое можно переместить в currentPlan
        for (let k = 0; k < nextPlan.pieces.length; k++) {
          const piece = nextPlan.pieces[k];
          
          if (piece.length <= currentPlan.remainingLength) {
            // Перемещаем изделие
            currentPlan.pieces.push(piece);
            currentPlan.remainingLength -= piece.length;
            nextPlan.pieces.splice(k, 1);
            nextPlan.remainingLength += piece.length;
            
            // Обновляем проценты использования
            currentPlan.utilizationPercent = ((stockLength - currentPlan.remainingLength) / stockLength * 100).toFixed(2);
            nextPlan.utilizationPercent = ((stockLength - nextPlan.remainingLength) / stockLength * 100).toFixed(2);
            
            improved = true;
            break;
          }
        }
        
        if (improved) break;
      }
      
      if (improved) break;
    }
  }
  
  // Удаляем пустые планы
  const result = plans.filter(plan => plan.pieces.length > 0);
  
  return result;
}

/**
 * Основная функция оптимизации, которая комбинирует базовый алгоритм и улучшение
 * @param {number} stockLength - длина заготовки со склада
 * @param {Array} items - массив объектов с полями length и quantity
 * @returns {Object} - результат оптимизации с планами раскроя и статистикой
 */
export function optimizeCuttingWithStats(stockLength, items) {
  try {
    // Базовая оптимизация
    const initialPlans = optimizeCutting(stockLength, items);
    
    // Улучшение оптимизации
    const improvedPlans = improveOptimization(stockLength, initialPlans);
    
    // Рассчитываем статистику
    const totalStocks = improvedPlans.length;
    const totalUsedLength = improvedPlans.reduce((sum, plan) => 
      sum + (stockLength - plan.remainingLength), 0);
    const totalWaste = improvedPlans.reduce((sum, plan) => 
      sum + plan.remainingLength, 0);
    const overallEfficiency = (totalUsedLength / (totalStocks * stockLength) * 100).toFixed(2);
    
    return {
      plans: improvedPlans,
      stats: {
        totalStocks,
        totalUsedLength,
        totalWaste,
        overallEfficiency
      }
    };
  } catch (error) {
    return {
      error: error.message,
      plans: [],
      stats: {
        totalStocks: 0,
        totalUsedLength: 0,
        totalWaste: 0,
        overallEfficiency: 0
      }
    };
  }
}