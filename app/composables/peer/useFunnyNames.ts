export function useFunnyNames() {
  const adjectives = [
    "Ленивый",
    "Быстрый",
    "Сонный",
    "Храбрый",
    "Весёлый",
    "Умный",
    "Хитрый",
    "Громкий",
    "Тихий",
    "Сильный",
    "Мягкий",
    "Пушистый",
    "Зелёный",
    "Красный",
    "Синий",
    "Неловкий",
    "Забавный",
    "Крутой",
    "Милый",
    "Сердитый",
  ];

  const nouns = [
    "Кот",
    "Пёс",
    "Хомяк",
    "Енот",
    "Лев",
    "Тигр",
    "Медведь",
    "Волк",
    "Лис",
    "Заяц",
    "Бобр",
    "Крот",
    "Слон",
    "Жираф",
    "Пингвин",
    "Сова",
    "Орёл",
    "Ястреб",
    "Краб",
    "Кит",
    "Капибара",
    "Панда",
    "Коала",
    "Лемур",
  ];

  function generateName() {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj} ${noun}`;
  }

  return {
    generateName,
  };
}
