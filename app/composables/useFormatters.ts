export default function useFormatters() {
  function timeConverter(UTCStringDate: string) {
    if (!UTCStringDate) return;
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const date = new Date(UTCStringDate);
    const timeOfDate = `${fillDateByZero(date.getHours())}:${fillDateByZero(date.getMinutes())}`;
    const secondsDiff = Math.floor((now.getTime() - date.getTime()) / 1000);
    const minutesDiff = Math.floor(secondsDiff / 60);
    const year = date.getFullYear();

    const monthNames = [
      "января",
      "февраля",
      "марта",
      "апреля",
      "мая",
      "июня",
      "июля",
      "августа",
      "сентября",
      "октября",
      "ноября",
      "декабря",
    ];

    if (secondsDiff > 0 && secondsDiff < 60) {
      return `${secondsDiff} ${useNumWord(secondsDiff, ["секунду", "секунды", "секунд"])} назад`;
    }
    if (minutesDiff > 0 && minutesDiff < 60) {
      return `${minutesDiff} ${useNumWord(minutesDiff, ["минуту", "минуты", "минут"])} назад`;
    }
    if (date >= today) {
      return `сегодня в ${timeOfDate}`;
    }
    if (date >= yesterday) {
      return `вчера в ${timeOfDate}`;
    }
    if (now.getFullYear() === date.getFullYear()) {
      const day = date.getDate();
      const month = monthNames[date.getMonth()];
      return `${day} ${month} в ${timeOfDate}`;
    }
    const day = fillDateByZero(date.getDate());
    const month = monthNames[date.getMonth()];
    return `${day} ${month} ${year}  в ${timeOfDate}`;
  }
  function fillDateByZero(dateNum: number) {
    return dateNum.toString().padStart(2, "0");
  }
  function useNumWord(value: number, words: string[]) {
    const locValue = Math.abs(value) % 100;
    const num = value % 10;
    if (locValue > 10 && locValue < 20) return words[2];
    if (num > 1 && num < 5) return words[1];
    if (num === 1) return words[0];
    return words[2];
  }
  return {
    timeConverter,
  };
}
