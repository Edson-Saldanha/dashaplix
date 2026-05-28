// Máscaras de formatação para campos brasileiros
const onlyDigits = (v: string) => (v ?? "").replace(/\D/g, "");

export function maskPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskCPF(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function maskCNPJ(v: string): string {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function maskCpfCnpj(v: string): string {
  const d = onlyDigits(v);
  return d.length <= 11 ? maskCPF(v) : maskCNPJ(v);
}

export function maskCEP(v: string): string {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function maskCurrencyBRL(v: string): string {
  const d = onlyDigits(v).slice(0, 15);
  if (!d) return "";
  const num = Number(d) / 100;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function maskPercent(v: string): string {
  const d = onlyDigits(v).slice(0, 5);
  if (!d) return "";
  const num = Number(d) / 100;
  return `${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export const PLACEHOLDERS: Record<string, string> = {
  phone: "(99) 99999-9999",
  cpf: "000.000.000-00",
  cnpj: "00.000.000/0000-00",
  cpf_cnpj: "CPF ou CNPJ",
  cep: "00000-000",
  currency: "R$ 0,00",
  percent: "0,00%",
};
