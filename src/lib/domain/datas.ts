import type { DataISO } from "./types";

const DIA = 86_400_000;

/** Hoje como yyyy-mm-dd no fuso de Brasília. */
export function hojeISO(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

export function paraData(iso: string): Date {
  return new Date(iso.slice(0, 10) + "T00:00:00Z");
}

export function somaDias(iso: string, dias: number): string {
  return new Date(paraData(iso).getTime() + dias * DIA).toISOString().slice(0, 10);
}

/** Diferença em dias (b − a). */
export function diffDias(a: string, b: string): number {
  return Math.round((paraData(b).getTime() - paraData(a).getTime()) / DIA);
}

export function fmtData(iso: DataISO | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function fmtDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function mediana(valores: number[]): number | null {
  if (!valores.length) return null;
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}
