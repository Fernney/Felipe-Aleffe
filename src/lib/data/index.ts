import "server-only";
import { hojeISO } from "@/lib/domain/datas";
import { consolidar, filtrarBase, gerarAlertas, indicadores } from "@/lib/domain/regras";
import type { FiltroUnidade } from "@/lib/domain/types";
import { ProvedorDemo } from "./demo";
import type { Provedor } from "./provider";

let provedor: Provedor | null = null;

/** DATA_PROVIDER=sharepoint usa o Microsoft Graph; qualquer outro valor usa a base de demonstração. */
export async function obterProvedor(): Promise<Provedor> {
  if (provedor) return provedor;
  if (process.env.DATA_PROVIDER === "sharepoint") {
    const { ProvedorSharePoint } = await import("./sharepoint");
    provedor = new ProvedorSharePoint();
  } else {
    provedor = new ProvedorDemo();
  }
  return provedor;
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
