// Number and text formatting utilities

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const fullNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const dateFormatterNoYear = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
});

export function formatNumber(num: number): string {
  return compactFormatter.format(num);
}

export function formatNumberFull(num: number): string {
  return fullNumberFormatter.format(num);
}

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatDateNoYear(date: Date): string {
  return dateFormatterNoYear.format(date);
}
