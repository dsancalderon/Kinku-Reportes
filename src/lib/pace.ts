export function monthlyPace(month: string, now: Date = new Date()) {
  const [year, monthNumber] = month.split('-').map(Number);
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const currentMonth = today.slice(0, 7);
  const day = currentMonth < month ? 0 : currentMonth > month ? daysInMonth : Number(today.slice(8, 10));
  return { day, daysInMonth, percent: day / daysInMonth * 100 };
}

export function meetsMonthlyPace(result: number | null, target: number | null, month: string, now: Date = new Date()) {
  if (result === null || target === null || target <= 0) return null;
  return result / target * 100 >= monthlyPace(month, now).percent;
}
