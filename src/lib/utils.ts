import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toDateOnlyString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatDateOnlyPtBR(dateString: string | null | undefined) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return dateString;

  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
}
