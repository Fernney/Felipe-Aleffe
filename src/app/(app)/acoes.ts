"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEdicao } from "@/lib/auth";
import { obterProvedor } from "@/lib/data";
import { hojeISO } from "@/lib/domain/datas";
import { MODULOS, moduloValido } from "@/lib/domain/modulos";
import { aplicabilidade } from "@/lib/domain/regras";
import type { Fluxo, ModuloId } from "@/lib/domain/types";

export type Resultado = { ok: true; mensagem?: string } | { ok: false; erro: string };

const data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .or(z.literal("").transform(() => null));
const sn = z.enum(["Sim", "Não"]).nullable();

async function executar(fn: () => Promise<string | void>): Promise<Resultado> {
  try {
    const msg = await fn();
    revalidatePath("/", "layout");
    return { ok: true, mensagem: msg ?? undefined };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro inesperado" };
  }
}

function modulo(m: string): ModuloId {
  if (!moduloValido(m)) throw new Error("Módulo inválido");
  return m;
}

// ---------------- Fluxograma ----------------

const esquemaFluxo = z.object({
  id: z.number().nullable(),
  terrenoId: z.number().int().positive(),
  parcelado: sn, armbh: sn, cultural: sn, altura: sn, relevancia: sn, supressao: sn, movTerra: sn, eas: sn,
});

export async function salvarFluxo(entrada: Fluxo): Promise<Resultado> {
  return executar(async () => {
    await exigirEdicao();
    const f = esquemaFluxo.parse(entrada);
    await (await obterProvedor()).salvarFluxo(f);
    return "Fluxograma salvo.";
  });
}

/** Cria, de uma vez, os processos que o fluxograma exige e ainda não existem. */
export async function criarProcessosFaltantes(terrenoId: number): Promise<Resultado> {
  return executar(async () => {
    const s = await exigirEdicao();
    const p = await obterProvedor();
    const base = await p.carregar();
    const t = base.terrenos.find((x) => x.id === terrenoId);
    if (!t) throw new Error("Terreno não encontrado");
    const apl = aplicabilidade(base.fluxos.find((f) => f.terrenoId === terrenoId));
    if (!apl) throw new Error("Responda o fluxograma primeiro.");
    const faltantes = (["parcelamento", "dipc", "cindacta", "gelin", "geava", "amtt"] as ModuloId[]).filter(
      (m) => apl[m] && !base.processos.some((x) => x.modulo === m && x.terrenoId === terrenoId),
    );
    for (const m of faltantes) {
      const novo = await p.criarProcesso({
        modulo: m,
        terrenoId,
        titulo: `${MODULOS[m].sigla} · ${t.nome}`,
        situacao: "Não Iniciada",
        dataInicio: hojeISO(),
        comentarios: "Criado automaticamente a partir do fluxograma.",
      });
      if (MODULOS[m].linhaDoTempo)
        await p.registrarAndamento({
          modulo: m, processoId: novo.id, acao: "Processo aberto", comentario: "Aberto pelo fluxograma.", prazoAtendimento: null, usuarioEmail: s.email,
        });
    }
    return faltantes.length ? `${faltantes.length} processo(s) criado(s): ${faltantes.map((m) => MODULOS[m].sigla).join(", ")}.` : "Nada a criar.";
  });
}

// ---------------- Processos ----------------

const esquemaProcesso = z.object({
  titulo: z.string().trim().min(1, "Informe o protocolo/nome").max(255),
  situacao: z.string().max(100).nullable(),
  acao: z.string().max(100).nullable(),
  dataInicio: data,
  dataLimiteProtocolo: data,
  previsaoRetorno: data,
  dataTermino: data,
  link: z.string().url("Link inválido").max(500).nullable().or(z.literal("").transform(() => null)),
  comentarios: z.string().max(4000).nullable(),
  extras: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).optional(),
});
export type FormProcesso = z.input<typeof esquemaProcesso>;

function limparExtras(m: ModuloId, extras: Record<string, string | number | null> = {}) {
  const out: Record<string, string | number | null> = {};
  for (const e of MODULOS[m].extras) {
    if (!(e.chave in extras)) continue;
    const v = extras[e.chave];
    if (v === "" || v == null) out[e.chave] = null;
    else if (e.tipo === "numero") out[e.chave] = Number.isFinite(Number(v)) ? Number(v) : null;
    else if (e.tipo === "data") out[e.chave] = /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : null;
    else out[e.chave] = String(v).slice(0, 255);
  }
  return out;
}

export async function salvarProcesso(mod: string, id: number, entrada: FormProcesso): Promise<Resultado> {
  return executar(async () => {
    const s = await exigirEdicao();
    const m = modulo(mod);
    const dados = esquemaProcesso.parse(entrada);
    const p = await obterProvedor();
    const antes = (await p.carregar()).processos.find((x) => x.modulo === m && x.id === id);
    await p.atualizarProcesso(m, id, { ...dados, extras: limparExtras(m, dados.extras) });
    // Auditoria: mudança de situação vira um andamento na linha do tempo
    if (antes && dados.situacao !== antes.situacao && MODULOS[m].linhaDoTempo) {
      await p.registrarAndamento({
        modulo: m, processoId: id, acao: `Situação: ${antes.situacao ?? "—"} → ${dados.situacao ?? "—"}`,
        comentario: null, prazoAtendimento: null, usuarioEmail: s.email,
      });
    }
    return "Alterações salvas.";
  });
}

export async function criarProcesso(mod: string, terrenoId: number | null, entrada: FormProcesso): Promise<Resultado & { id?: number }> {
  try {
    const s = await exigirEdicao();
    const m = modulo(mod);
    const dados = esquemaProcesso.parse(entrada);
    const p = await obterProvedor();
    const novo = await p.criarProcesso({ modulo: m, terrenoId, ...dados, extras: limparExtras(m, dados.extras) });
    if (MODULOS[m].linhaDoTempo)
      await p.registrarAndamento({ modulo: m, processoId: novo.id, acao: "Processo cadastrado", comentario: null, prazoAtendimento: null, usuarioEmail: s.email });
    revalidatePath("/", "layout");
    return { ok: true, id: novo.id };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro inesperado" };
  }
}

/** Usado pelo quadro Kanban (arrastar e soltar). */
export async function moverSituacao(mod: string, id: number, situacao: string): Promise<Resultado> {
  return executar(async () => {
    const s = await exigirEdicao();
    const m = modulo(mod);
    const p = await obterProvedor();
    const antes = (await p.carregar()).processos.find((x) => x.modulo === m && x.id === id);
    if (!antes) throw new Error("Processo não encontrado");
    if (antes.situacao === situacao) return;
    await p.atualizarProcesso(m, id, { situacao });
    if (MODULOS[m].linhaDoTempo)
      await p.registrarAndamento({
        modulo: m, processoId: id, acao: `Situação: ${antes.situacao ?? "—"} → ${situacao}`, comentario: "Movido no quadro.", prazoAtendimento: null, usuarioEmail: s.email,
      });
  });
}

// ---------------- Linha do tempo ----------------

const esquemaAndamento = z.object({
  acao: z.string().trim().min(2, "Descreva a ação").max(255),
  comentario: z.string().max(4000).nullable(),
  prazoAtendimento: data,
});

export async function registrarAndamento(mod: string, processoId: number, entrada: z.input<typeof esquemaAndamento>): Promise<Resultado> {
  return executar(async () => {
    const s = await exigirEdicao();
    const m = modulo(mod);
    const a = esquemaAndamento.parse(entrada);
    await (await obterProvedor()).registrarAndamento({ modulo: m, processoId, ...a, usuarioEmail: s.email });
    return "Andamento registrado.";
  });
}
