/** Interpret a calendar date without UTC conversion or day shifts. */
export function calendarDateToLocal(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}