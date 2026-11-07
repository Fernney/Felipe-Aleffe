import "server-only";
import { hojeISO } from "@/lib/domain/datas";
import { consolidar, filtrarBase, gerarAlertas, indicadores } from "@/lib/domain/regras";
import type { FiltroUnidade } from "@/lib/domain/types";
import { ProvedorDemo } from "./demo";
import type { Provedor } from "./provider";
import { emailDoUsuarioAtual, modoSharePoint, tokenDoAplicativo, tokenDoUsuarioAtual } from "./tokens";

let demo: ProvedorDemo | null = null;
let aplicativo: Provedor | null = null;

export const usaSharePoint = () => process.env.DATA_PROVIDER === "sharepoint";

/**
 * DATA_PROVIDER=sharepoint usa o Microsoft Graph; qualquer outro valor usa a base de demonstração.
 * No modo delegado (padrão) o provedor age com o login de quem fez a requisição.
 */
export async function obterProvedor(): Promise<Provedor> {
  if (!usaSharePoint()) return (demo ??= new ProvedorDemo());
  const { ProvedorSharePoint } = await import("./sharepoint");
  if (modoSharePoint() === "aplicativo") return (aplicativo ??= new ProvedorSharePoint(tokenDoAplicativo, "aplicativo", false));
  return new ProvedorSharePoint(tokenDoUsuarioAtual, `usuario:${await emailDoUsuarioAtual()}`, true);
}

/** Provedor com um token já conhecido (usado no momento do login, antes de existir cookie). */
export async function obterProvedorComToken(token: string, email: string): Promise<Provedor> {
  if (!usaSharePoint()) return (demo ??= new ProvedorDemo());
  const { ProvedorSharePoint } = await import("./sharepoint");
  return new ProvedorSharePoint(async () => token, `usuario:${email.toLowerCase()}`, true);
}

/** Rotinas sem usuário logado (cron, API do Power BI) só funcionam com demo ou modo aplicativo. */
export function semUsuarioDisponivel(): boolean {
  return !usaSharePoint() || modoSharePoint() === "aplicativo";
}

/** Carrega a base, aplica o filtro de unidade e calcula alertas, consolidado e indicadores. */
export async function carregarPainel(filtro: FiltroUnidade = "todas") {
  const p = await obterProvedor();
  const completa = await p.carregar();
  const base = filtrarBase(completa, filtro);
  const hoje = hojeISO();
  const alertas = gerarAlertas(base, hoje);
  const resumos = consolidar(base, hoje, alertas);
  const ind = indicadores(base, resumos, alertas, hoje);
  return { base, completa, alertas, resumos, ind, hoje, filtro };
}

export type Painel = Awaited<ReturnType<typeof carregarPainel>>;
