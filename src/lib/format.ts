export const brl = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n ?? 0));

export const parseLocalDate = (d: string | Date): Date => {
  if (d instanceof Date) return d;
  // "YYYY-MM-DD" → local midnight (avoid UTC shift)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(d);
};

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(parseLocalDate(d));
};

export const fmtDateTime = (d: string | Date | null | undefined) => {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(dt);
};
