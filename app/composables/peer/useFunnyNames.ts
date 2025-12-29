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

  function generateName(seed?: string) {
    if (!seed) {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      return `${adj} ${noun}`;
    }

    // Simple hash function to get a deterministic number from seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }

    const adjIndex = Math.abs(hash) % adjectives.length;
    // Offset the hash for the noun to pick a different "randomness"
    const nounIndex = Math.abs(hash >> 8) % nouns.length;

    const adj = adjectives[adjIndex];
    const noun = nouns[nounIndex];
    return `${adj} ${noun}`;
  }

  return {
    generateName,
  };
}
