// Motor de regras da Central de Diligenciamento.
// Reproduz a lógica que estava nas fórmulas do Power Apps (colDashTerrenos,
// colAlertas, fluxograma) e acrescenta risco, previsão e novos alertas.

import { MODULOS, MODULOS_MATRIZ } from "./modulos";
import { diffDias, fmtData, mediana, somaDias } from "./datas";
import type {
  Base,
  FiltroUnidade,
  Fluxo,
  ModuloId,
  PerguntaFluxo,
  Processo,
  StatusNorm,
  Terreno,
  Unidade,
} from "./types";

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

const CONCLUIDOS = ["aprovado", "concluído", "concluída", "concluido", "finalizado", "dispensado", "emitido", "deferido", "cumprida"];
const BLOQUEADOS = ["reprovado", "cancelado", "indeferido"];
const AGUARDANDO = ["pendente", "aguardando documentação", "aguardando"];
const NAO_INICIADOS = ["não iniciada", "a iniciar", "não iniciado", "nao iniciado"];

export function normalizarStatus(situacao: string | null | undefined): StatusNorm {
  const s = (situacao ?? "").trim().toLowerCase();
  if (!s) return "Não iniciado";
  if (CONCLUIDOS.includes(s)) return "Concluído";
  if (BLOQUEADOS.includes(s)) return "Bloqueado";
  if (AGUARDANDO.includes(s)) return "Aguardando";
  if (NAO_INICIADOS.includes(s)) return "Não iniciado";
  return "Em andamento";
}

export function processoEncerrado(p: Processo): boolean {
  const s = statusProcesso(p);
  return s === "Concluído" || s === "Bloqueado";
}

/** Status de um registro, com as exceções de Ambiental e Baixa usadas no app original. */
export function statusProcesso(p: Processo, hoje?: string): StatusNorm {
  if (p.modulo === "ambiental" && p.extras.reciboDefinitivo) return "Concluído";
  if (p.modulo === "baixa") {
    const prog = p.extras.programacaoBaixa as string | null;
    if (prog && (!hoje || prog <= hoje)) return "Concluído";
    if (p.extras.comunicadoTermino) return "Aguardando";
    if (p.extras.inicioObra) return "Em andamento";
    return p.situacao ? normalizarStatus(p.situacao) : "Não iniciado";
  }
  return normalizarStatus(p.situacao);
}

const PESO: Record<StatusNorm, number> = {
  Bloqueado: 5,
  Aguardando: 4,
  "Em andamento": 3,
  "Não iniciado": 2,
  Concluído: 1,
  "Não se aplica": 0,
};

/** Status agregado de vários registros do mesmo módulo: o mais crítico vence. */
export function agregarStatus(lista: StatusNorm[]): StatusNorm | null {
  if (!lista.length) return null;
  return lista.reduce((a, b) => (PESO[b] > PESO[a] ? b : a));
}

// ---------------------------------------------------------------------------
// Unidade (INOVA BH / SAÚDE BH)
// ---------------------------------------------------------------------------

export function normalizarUnidade(v: string | null | undefined): Unidade | null {
  const s = (v ?? "").toUpperCase();
  if (s.includes("INOVA")) return "INOVA BH";
  if (s.includes("SA") && (s.includes("ÚDE") || s.includes("UDE"))) return "SAÚDE BH";
  return null;
}

export function filtroCombina(f: FiltroUnidade, u: Unidade | null): boolean {
  if (f === "todas") return true;
  if (f === "inova") return u === "INOVA BH";
  return u === "SAÚDE BH";
}

export function parseFiltro(v: string | string[] | undefined): FiltroUnidade {
  const s = Array.isArray(v) ? v[0] : v;
  return s === "inova" || s === "saude" ? s : "todas";
}

// ---------------------------------------------------------------------------
// Fluxograma
// ---------------------------------------------------------------------------

export const PERGUNTAS: { chave: PerguntaFluxo; texto: string; ajuda: string }[] = [
  { chave: "parcelado", texto: "O terreno já está parcelado?", ajuda: "Se não estiver, abre-se o processo de Parcelamento do Solo." },
  { chave: "armbh", texto: "Necessita de anuência metropolitana (ARMBH)?", ajuda: "Só vale para terrenos não parcelados." },
  { chave: "cultural", texto: "Lote em área de proteção cultural?", ajuda: "Exige processo na DIPC." },
  { chave: "altura", texto: "Supera a altura limite (CINDACTA)?", ajuda: "Exige análise do CINDACTA." },
  { chave: "relevancia", texto: "Possui relevância ambiental?", ajuda: "Exige licenciamento GELIN e acompanhamento ambiental." },
  { chave: "supressao", texto: "Possui supressão de vegetação?", ajuda: "Sem relevância ambiental: GEAVA + compensação." },
  { chave: "movTerra", texto: "Possui movimentação de terra?", ajuda: "Exige autorização AMTT/GELIOC." },
  { chave: "eas", texto: "É estabelecimento de saúde (EAS)?", ajuda: "Informativo para os projetos da SPE Saúde." },
];

export type Aplicabilidade = Partial<Record<ModuloId, boolean>>;

/** Quais módulos o fluxograma exige (true), dispensa (false) ou não decide (ausente). */
export function aplicabilidade(f: Fluxo | undefined | null): Aplicabilidade | null {
  if (!f) return null;
  const sim = (v: Fluxo[PerguntaFluxo]) => v === "Sim";
  return {
    parcelamento: !sim(f.parcelado),
    armbh: !sim(f.parcelado) && sim(f.armbh),
    dipc: sim(f.cultural),
    cindacta: sim(f.altura),
    gelin: sim(f.relevancia),
    geava: !sim(f.relevancia) && sim(f.supressao),
    amtt: sim(f.movTerra),
    ambiental: sim(f.relevancia) || sim(f.supressao),
    alvara: true,
    baixa: true,
  };
}

/** Módulos considerados nas travas "a abrir" / "conflito" (igual ao app original). */
const MODULOS_TRAVA: ModuloId[] = ["parcelamento", "dipc", "cindacta", "gelin", "geava", "amtt"];

// ---------------------------------------------------------------------------
// Consolidado por terreno
// ---------------------------------------------------------------------------

export type Etapa = "Operação" | "Obra" | "Parcelamento do Solo" | "Licenciamento" | "Não informado";
export type NivelRisco = "Baixo" | "Médio" | "Alto";

export interface CelulaModulo {
  status: StatusNorm | null; // null = nenhum processo cadastrado
  aplicavel: boolean | undefined;
  qtd: number;
  situacao: "ok" | "a-abrir" | "conflito" | "neutro";
}

export interface ResumoTerreno {
  terreno: Terreno;
  fluxoRespondido: boolean;
  modulos: Record<ModuloId, CelulaModulo>;
  aAbrir: ModuloId[];
  conflitos: ModuloId[];
  etapa: Etapa;
  progresso: number; // 0..1 dos módulos exigidos concluídos
  risco: number; // 0..100
  nivelRisco: NivelRisco;
  motivosRisco: string[];
  liberacaoPrevista: string | null;
  alertas: number;
  alertasAltos: number;
}

/** Índices auxiliares montados uma vez por cálculo. */
export function indexar(base: Base) {
  const porTerreno = new Map<number, Processo[]>();
  for (const p of base.processos) {
    if (p.terrenoId == null) continue;
    const l = porTerreno.get(p.terrenoId) ?? [];
    l.push(p);
    porTerreno.set(p.terrenoId, l);
  }
  const fluxos = new Map<number, Fluxo>(base.fluxos.map((f) => [f.terrenoId, f]));
  const terrenos = new Map<number, Terreno>(base.terrenos.map((t) => [t.id, t]));
  const processos = new Map<string, Processo>(base.processos.map((p) => [`${p.modulo}:${p.id}`, p]));
  return { porTerreno, fluxos, terrenos, processos };
}

/** Duração mediana (dias) do início ao término, por módulo, a partir do histórico concluído. */
export function duracoesMedianas(base: Base): Partial<Record<ModuloId, number>> {
  const acc: Partial<Record<ModuloId, number[]>> = {};
  for (const p of base.processos) {
    if (!p.dataInicio || !p.dataTermino) continue;
    if (statusProcesso(p) !== "Concluído") continue;
    const d = diffDias(p.dataInicio, p.dataTermino);
    if (d < 0 || d > 3650) continue;
    (acc[p.modulo] ??= []).push(d);
  }
  const out: Partial<Record<ModuloId, number>> = {};
  for (const [m, v] of Object.entries(acc)) {
    const med = mediana(v!);
    if (med != null) out[m as ModuloId] = med;
  }
  return out;
}

/** Data prevista de conclusão de um processo aberto (previsão de retorno ou histórico). */
export function previsaoConclusao(p: Processo, medianas: Partial<Record<ModuloId, number>>): string | null {
  if (p.dataTermino) return p.dataTermino;
  if (p.previsaoRetorno) return p.previsaoRetorno;
  const med = medianas[p.modulo];
  if (p.dataInicio && med != null) return somaDias(p.dataInicio, med);
  return null;
}

export function consolidar(base: Base, hoje: string, alertas?: Alerta[]): ResumoTerreno[] {
  const idx = indexar(base);
  const meds = duracoesMedianas(base);
  const lista = alertas ?? gerarAlertas(base, hoje);
  const alertasPorTerreno = new Map<number, Alerta[]>();
  for (const a of lista) {
    if (a.terrenoId == null) continue;
    const l = alertasPorTerreno.get(a.terrenoId) ?? [];
    l.push(a);
    alertasPorTerreno.set(a.terrenoId, l);
  }

  return base.terrenos.map((t) => {
    const procs = idx.porTerreno.get(t.id) ?? [];
    const fluxo = idx.fluxos.get(t.id);
    const apl = aplicabilidade(fluxo);

    const modulos = {} as Record<ModuloId, CelulaModulo>;
    const aAbrir: ModuloId[] = [];
    const conflitos: ModuloId[] = [];
    for (const m of [...MODULOS_MATRIZ, "armbh"] as ModuloId[]) {
      const doModulo = procs.filter((p) => p.modulo === m);
      const status = agregarStatus(doModulo.map((p) => statusProcesso(p, hoje)));
      const aplicavel = apl?.[m];
      let situacao: CelulaModulo["situacao"] = "neutro";
      if (MODULOS_TRAVA.includes(m) && apl) {
        if (aplicavel === true && !doModulo.length) {
          situacao = "a-abrir";
          aAbrir.push(m);
        } else if (aplicavel === false && doModulo.length) {
          situacao = "conflito";
          conflitos.push(m);
        } else situacao = "ok";
      }
      modulos[m] = { status, aplicavel, qtd: doModulo.length, situacao };
    }

    // Etapa do empreendimento pelos processos cadastrados
    const baixa = procs.find((p) => p.modulo === "baixa");
    const ativo = (m: ModuloId[]) =>
      procs.some((p) => m.includes(p.modulo) && ["Em andamento", "Aguardando"].includes(statusProcesso(p, hoje)));
    let etapa: Etapa = "Não informado";
    if (baixa?.dataTermino && baixa.dataTermino <= hoje) etapa = "Operação";
    else if (baixa?.dataTermino || baixa?.extras.inicioObra) etapa = "Obra";
    else if (ativo(["parcelamento", "armbh"])) etapa = "Parcelamento do Solo";
    else if (ativo(["dipc", "cindacta", "gelin", "geava", "amtt", "alvara", "outros"])) etapa = "Licenciamento";

    // Progresso: módulos exigidos já concluídos
    const exigidos = apl
      ? (Object.entries(apl).filter(([m, v]) => v && m !== "baixa").map(([m]) => m) as ModuloId[])
      : (MODULOS_MATRIZ.filter((m) => modulos[m].qtd > 0 && m !== "baixa") as ModuloId[]);
    const concluidos = exigidos.filter((m) => modulos[m]?.status === "Concluído").length;
    const progresso = exigidos.length ? concluidos / exigidos.length : 0;

    // Risco 0..100 com explicação
    const meus = alertasPorTerreno.get(t.id) ?? [];
    const altos = meus.filter((a) => a.alta).length;
    const motivos: string[] = [];
    let risco = 0;
    if (altos) {
      risco += Math.min(45, altos * 15);
      motivos.push(`${altos} alerta(s) crítico(s)`);
    }
    const normais = meus.length - altos;
    if (normais) {
      risco += Math.min(20, normais * 5);
      motivos.push(`${normais} alerta(s) de atenção`);
    }
    const bloqueados = MODULOS_MATRIZ.filter((m) => modulos[m].status === "Bloqueado");
    if (bloqueados.length) {
      risco += bloqueados.length * 20;
      motivos.push(`Bloqueado em ${bloqueados.map((m) => MODULOS[m].sigla).join(", ")}`);
    }
    if (aAbrir.length) {
      risco += aAbrir.length * 8;
      motivos.push(`${aAbrir.length} processo(s) exigido(s) não aberto(s)`);
    }
    if (conflitos.length) {
      risco += conflitos.length * 10;
      motivos.push(`${conflitos.length} conflito(s) com o fluxograma`);
    }
    if (!fluxo) {
      risco += 10;
      motivos.push("Fluxograma não respondido");
    }

    // Liberação prevista = maior previsão entre processos exigidos ainda abertos
    let liberacao: string | null = null;
    for (const p of procs) {
      if (p.modulo === "baixa" || processoEncerrado(p)) continue;
      if (apl && apl[p.modulo] === false) continue;
      const prev = previsaoConclusao(p, meds);
      if (prev && (!liberacao || prev > liberacao)) liberacao = prev;
    }
    if (liberacao && t.prazoLiberacao && liberacao > t.prazoLiberacao) {
      risco += 15;
      motivos.push(`Previsão (${fmtData(liberacao)}) após o prazo de liberação (${fmtData(t.prazoLiberacao)})`);
    }

    risco = Math.min(100, risco);
    return {
      terreno: t,
      fluxoRespondido: !!fluxo,
      modulos,
      aAbrir,
      conflitos,
      etapa,
      progresso,
      risco,
      nivelRisco: risco >= 55 ? "Alto" : risco >= 25 ? "Médio" : "Baixo",
      motivosRisco: motivos,
      liberacaoPrevista: liberacao,
      alertas: meus.length,
      alertasAltos: altos,
    };
  });
}

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------

export type CategoriaAlerta =
  | "Diretrizes de parcelamento"
  | "Validade das diretrizes ARMBH"
  | "Data limite de protocolo"
  | "Termo de compromisso"
  | "Condicionante vencida"
  | "Condicionante a vencer"
  | "Relatório atrasado"
  | "Relatório a vencer"
  | "Comunicado de término pendente"
  | "Conflito com o fluxograma"
  | "Processo a abrir"
  | "Prazo da linha do tempo vencido"
  | "Prazo da linha do tempo a vencer"
  | "Processo parado"
  | "Fluxograma não respondido";

export interface Alerta {
  id: string;
  tipo: CategoriaAlerta;
  terrenoId: number | null;
  terreno: string;
  unidade: Unidade | null;
  modulo: ModuloId | "fluxograma";
  data: string;
  alta: boolean;
  detalhe: string;
  href: string;
}

export interface OpcoesAlerta {
  diasAvisoLinhaDoTempo?: number;
  diasProcessoParado?: number;
}

export function gerarAlertas(base: Base, hoje: string, op: OpcoesAlerta = {}): Alerta[] {
  const diasAviso = op.diasAvisoLinhaDoTempo ?? 15;
  const diasParado = op.diasProcessoParado ?? 60;
  const idx = indexar(base);
  const out: Alerta[] = [];
  const add = (a: Omit<Alerta, "id" | "terreno" | "unidade"> & { chave: string }) => {
    const t = a.terrenoId != null ? idx.terrenos.get(a.terrenoId) : undefined;
    const { chave, ...resto } = a;
    out.push({ ...resto, id: `${a.tipo}:${chave}`, terreno: t?.nome ?? "Terreno não vinculado", unidade: t?.unidade ?? null });
  };
  const hrefProc = (p: Processo) => `/processos/${p.modulo}/${p.id}`;
  const em = (d: number) => somaDias(hoje, d);

  for (const p of base.processos) {
    const st = statusProcesso(p, hoje);
    const aberto = st !== "Concluído" && st !== "Bloqueado";

    // 1) Diretrizes de parcelamento vencendo em 90 dias
    const venc = p.extras.vencimentoDiretrizes as string | null;
    if (p.modulo === "parcelamento" && venc && venc <= em(90) && st !== "Concluído") {
      add({
        chave: `parc-${p.id}`, tipo: "Diretrizes de parcelamento", terrenoId: p.terrenoId, modulo: "parcelamento",
        data: venc, alta: venc < hoje, href: hrefProc(p),
        detalhe: `${venc < hoje ? "Vencidas em" : "Vencem em"} ${fmtData(venc)} · ${p.titulo}`,
      });
    }
    // 1b) Validade das diretrizes ARMBH (novo)
    const valArmbh = p.extras.validadeDiretrizes as string | null;
    if (p.modulo === "armbh" && valArmbh && valArmbh <= em(90) && aberto) {
      add({
        chave: `armbh-${p.id}`, tipo: "Validade das diretrizes ARMBH", terrenoId: p.terrenoId, modulo: "armbh",
        data: valArmbh, alta: valArmbh < hoje, href: hrefProc(p),
        detalhe: `${valArmbh < hoje ? "Vencida em" : "Vence em"} ${fmtData(valArmbh)} · SEI ${p.titulo}`,
      });
    }
    // 2) Data limite de protocolo em 30 dias (o app original fazia só para DIPC; agora vale para todos)
    if (p.dataLimiteProtocolo && aberto && p.dataLimiteProtocolo <= em(30) && st !== "Em andamento") {
      add({
        chave: `lim-${p.modulo}-${p.id}`, tipo: "Data limite de protocolo", terrenoId: p.terrenoId, modulo: p.modulo,
        data: p.dataLimiteProtocolo, alta: p.dataLimiteProtocolo < hoje, href: hrefProc(p),
        detalhe: `${MODULOS[p.modulo].sigla} · ${p.dataLimiteProtocolo < hoje ? "vencida em" : "limite em"} ${fmtData(p.dataLimiteProtocolo)}`,
      });
    }
    // 3) Termo de compromisso ambiental em 60 dias sem recibo definitivo
    const prazoTermo = p.extras.prazoTermo as string | null;
    if (p.modulo === "ambiental" && prazoTermo && prazoTermo <= em(60) && !p.extras.reciboDefinitivo && st !== "Concluído") {
      add({
        chave: `termo-${p.id}`, tipo: "Termo de compromisso", terrenoId: p.terrenoId, modulo: "ambiental",
        data: prazoTermo, alta: prazoTermo < hoje, href: hrefProc(p),
        detalhe: `${prazoTermo < hoje ? "Prazo vencido em" : "Prazo em"} ${fmtData(prazoTermo)} · ${p.titulo}`,
      });
    }
    // 6) Baixa: obra concluída sem comunicado de término
    if (p.modulo === "baixa" && p.dataTermino && p.dataTermino <= hoje && !p.extras.comunicadoTermino) {
      const dias = diffDias(p.dataTermino, hoje);
      add({
        chave: `baixa-${p.id}`, tipo: "Comunicado de término pendente", terrenoId: p.terrenoId, modulo: "baixa",
        data: p.dataTermino, alta: dias > 30, href: hrefProc(p),
        detalhe: `Obra concluída em ${fmtData(p.dataTermino)} · há ${dias} dias sem comunicado`,
      });
    }
  }

  // 4) Condicionantes ambientais
  const ambPorId = new Map(base.processos.filter((p) => p.modulo === "ambiental").map((p) => [p.id, p]));
  for (const c of base.condicionantes) {
    if (!c.prazo || normalizarStatus(c.status) === "Concluído") continue;
    const amb = c.ambientalId != null ? ambPorId.get(c.ambientalId) : undefined;
    const href = amb ? `/processos/ambiental/${amb.id}` : "/processos/ambiental";
    if (c.prazo < hoje) {
      add({ chave: `cond-${c.id}`, tipo: "Condicionante vencida", terrenoId: amb?.terrenoId ?? null, modulo: "ambiental",
        data: c.prazo, alta: true, href, detalhe: `Item ${c.item ?? "?"} · prazo ${fmtData(c.prazo)}` });
    } else if (c.prazo <= em(7)) {
      add({ chave: `cond-${c.id}`, tipo: "Condicionante a vencer", terrenoId: amb?.terrenoId ?? null, modulo: "ambiental",
        data: c.prazo, alta: false, href, detalhe: `Item ${c.item ?? "?"} · vence em ${fmtData(c.prazo)} (${diffDias(hoje, c.prazo)} dias)` });
    }
  }

  // 5) Relatórios de monitoramento
  for (const r of base.relatorios) {
    if (r.real || !r.prevista) continue;
    const amb = r.ambientalId != null ? ambPorId.get(r.ambientalId) : undefined;
    const href = amb ? `/processos/ambiental/${amb.id}` : "/processos/ambiental";
    if (r.prevista < hoje) {
      add({ chave: `rel-${r.id}`, tipo: "Relatório atrasado", terrenoId: amb?.terrenoId ?? null, modulo: "ambiental",
        data: r.prevista, alta: true, href, detalhe: `${r.nome} · previsto ${fmtData(r.prevista)}` });
    } else if (r.prevista <= em(7)) {
      add({ chave: `rel-${r.id}`, tipo: "Relatório a vencer", terrenoId: amb?.terrenoId ?? null, modulo: "ambiental",
        data: r.prevista, alta: false, href, detalhe: `${r.nome} · previsto ${fmtData(r.prevista)} (${diffDias(hoje, r.prevista)} dias)` });
    }
  }

  // 7) Fluxograma: conflitos, processos a abrir e terrenos sem respostas
  for (const t of base.terrenos) {
    const apl = aplicabilidade(idx.fluxos.get(t.id));
    const href = `/terrenos/${t.id}`;
    if (!apl) {
      add({ chave: `semfluxo-${t.id}`, tipo: "Fluxograma não respondido", terrenoId: t.id, modulo: "fluxograma",
        data: hoje, alta: false, href: `${href}#fluxograma`, detalhe: "Responda as 8 perguntas para saber quais processos abrir" });
      continue;
    }
    const procs = idx.porTerreno.get(t.id) ?? [];
    const abrir = MODULOS_TRAVA.filter((m) => apl[m] === true && !procs.some((p) => p.modulo === m));
    const conflito = MODULOS_TRAVA.filter((m) => apl[m] === false && procs.some((p) => p.modulo === m));
    if (conflito.length)
      add({ chave: `conf-${t.id}`, tipo: "Conflito com o fluxograma", terrenoId: t.id, modulo: "fluxograma", data: hoje, alta: true, href,
        detalhe: `${conflito.map((m) => MODULOS[m].sigla).join(", ")} cadastrado(s), mas o fluxograma diz que não se aplica` });
    if (abrir.length)
      add({ chave: `abrir-${t.id}`, tipo: "Processo a abrir", terrenoId: t.id, modulo: "fluxograma", data: hoje, alta: false, href,
        detalhe: `Exigido(s) e ainda não cadastrado(s): ${abrir.map((m) => MODULOS[m].sigla).join(", ")}` });
  }

  // 8) Prazo de atendimento do último andamento + 9) processo parado
  const ultimo = new Map<string, (typeof base.andamentos)[number]>();
  for (const a of base.andamentos) {
    const k = `${a.modulo}:${a.processoId}`;
    const atual = ultimo.get(k);
    if (!atual || a.data > atual.data) ultimo.set(k, a);
  }
  for (const p of base.processos) {
    const st = statusProcesso(p, hoje);
    if (st === "Concluído" || st === "Bloqueado") continue;
    const u = ultimo.get(`${p.modulo}:${p.id}`);
    if (u?.prazoAtendimento) {
      if (u.prazoAtendimento < hoje)
        add({ chave: `lt-${p.modulo}-${p.id}`, tipo: "Prazo da linha do tempo vencido", terrenoId: p.terrenoId, modulo: p.modulo,
          data: u.prazoAtendimento, alta: true, href: hrefProc(p),
          detalhe: `${MODULOS[p.modulo].sigla} · "${u.acao}" venceu em ${fmtData(u.prazoAtendimento)}` });
      else if (u.prazoAtendimento <= em(diasAviso))
        add({ chave: `lt-${p.modulo}-${p.id}`, tipo: "Prazo da linha do tempo a vencer", terrenoId: p.terrenoId, modulo: p.modulo,
          data: u.prazoAtendimento, alta: false, href: hrefProc(p),
          detalhe: `${MODULOS[p.modulo].sigla} · "${u.acao}" vence em ${fmtData(u.prazoAtendimento)}` });
    }
    const ultimaMov = [u?.data?.slice(0, 10), p.dataAtualizacao, p.dataInicio].filter(Boolean).sort().pop();
    if (st !== "Não iniciado" && ultimaMov && diffDias(ultimaMov, hoje) > diasParado)
      add({ chave: `parado-${p.modulo}-${p.id}`, tipo: "Processo parado", terrenoId: p.terrenoId, modulo: p.modulo,
        data: ultimaMov, alta: false, href: hrefProc(p),
        detalhe: `${MODULOS[p.modulo].sigla} · sem movimentação há ${diffDias(ultimaMov, hoje)} dias` });
  }

  return out.sort((a, b) => Number(b.alta) - Number(a.alta) || a.data.localeCompare(b.data));
}

// ---------------------------------------------------------------------------
// Indicadores gerais
// ---------------------------------------------------------------------------

export interface Indicadores {
  terrenos: number;
  processos: number;
  abertos: number;
  concluidos: number;
  bloqueados: number;
  alertas: number;
  alertasAltos: number;
  riscoAlto: number;
  porStatus: Record<StatusNorm, number>;
  porEtapa: Record<Etapa, number>;
  porModulo: { modulo: ModuloId; sigla: string; status: Record<StatusNorm, number> }[];
  mudasCompensar: number;
  mudasPlantadas: number;
}

export function indicadores(base: Base, resumos: ResumoTerreno[], alertas: Alerta[], hoje: string): Indicadores {
  const vazio = (): Record<StatusNorm, number> => ({
    Concluído: 0, "Em andamento": 0, Aguardando: 0, Bloqueado: 0, "Não iniciado": 0, "Não se aplica": 0,
  });
  const porStatus = vazio();
  const porModuloMap = new Map<ModuloId, Record<StatusNorm, number>>();
  let mudasCompensar = 0;
  let mudasPlantadas = 0;
  for (const p of base.processos) {
    const s = statusProcesso(p, hoje);
    porStatus[s]++;
    const m = porModuloMap.get(p.modulo) ?? vazio();
    m[s]++;
    porModuloMap.set(p.modulo, m);
    if (p.modulo === "ambiental") {
      mudasCompensar += Number(p.extras.mudasCompensar ?? 0);
      mudasPlantadas += Number(p.extras.mudasDpea ?? 0) + Number(p.extras.mudasGelin ?? 0);
    }
  }
  const porEtapa: Record<Etapa, number> = { "Não informado": 0, "Parcelamento do Solo": 0, Licenciamento: 0, Obra: 0, Operação: 0 };
  for (const r of resumos) porEtapa[r.etapa]++;
  return {
    terrenos: resumos.length,
    processos: base.processos.length,
    abertos: porStatus["Em andamento"] + porStatus.Aguardando + porStatus["Não iniciado"],
    concluidos: porStatus.Concluído,
    bloqueados: porStatus.Bloqueado,
    alertas: alertas.length,
    alertasAltos: alertas.filter((a) => a.alta).length,
    riscoAlto: resumos.filter((r) => r.nivelRisco === "Alto").length,
    porStatus,
    porEtapa,
    porModulo: [...MODULOS_MATRIZ, "armbh" as ModuloId]
      .filter((m) => porModuloMap.has(m))
      .map((m) => ({ modulo: m, sigla: MODULOS[m].sigla, status: porModuloMap.get(m)! })),
    mudasCompensar,
    mudasPlantadas,
  };
}

/** Recorta a base para uma unidade (INOVA / SAÚDE). */
export function filtrarBase(base: Base, f: FiltroUnidade): Base {
  if (f === "todas") return base;
  const ids = new Set(base.terrenos.filter((t) => filtroCombina(f, t.unidade)).map((t) => t.id));
  const processos = base.processos.filter((p) => p.terrenoId != null && ids.has(p.terrenoId));
  const chaves = new Set(processos.map((p) => `${p.modulo}:${p.id}`));
  const ambIds = new Set(processos.filter((p) => p.modulo === "ambiental").map((p) => p.id));
  return {
    ...base,
    terrenos: base.terrenos.filter((t) => ids.has(t.id)),
    fluxos: base.fluxos.filter((f2) => ids.has(f2.terrenoId)),
    processos,
    condicionantes: base.condicionantes.filter((c) => c.ambientalId != null && ambIds.has(c.ambientalId)),
    relatorios: base.relatorios.filter((r) => r.ambientalId != null && ambIds.has(r.ambientalId)),
    andamentos: base.andamentos.filter((a) => chaves.has(`${a.modulo}:${a.processoId}`)),
  };
}
