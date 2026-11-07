import "server-only";
import ExcelJS from "exceljs";
import type { Painel } from "@/lib/data";
import { MODULOS, MODULOS_MATRIZ, moduloValido } from "@/lib/domain/modulos";
import { duracoesMedianas, previsaoConclusao, statusProcesso } from "@/lib/domain/regras";
import type { ModuloId } from "@/lib/domain/types";

export type Valor = string | number | boolean | null;
export interface Tabela {
  nome: string;
  colunas: string[];
  linhas: Record<string, Valor>[];
}

export const RELATORIOS = [
  { id: "consolidado", titulo: "Consolidado por terreno", descricao: "Status de cada módulo, etapa, risco, progresso e previsão — um terreno por linha." },
  { id: "alertas", titulo: "Alertas e pendências", descricao: "Tudo que está vencido ou vencendo, com prioridade." },
  { id: "processos", titulo: "Todos os processos", descricao: "Os 11 módulos numa tabela única (formato ideal para o Power BI)." },
  { id: "andamentos", titulo: "Linha do tempo", descricao: "Histórico de andamentos de todos os processos." },
  { id: "terrenos", titulo: "Cadastro de terrenos", descricao: "Dados cadastrais, endereço e respostas do fluxograma." },
  { id: "condicionantes", titulo: "Condicionantes ambientais", descricao: "Itens, prazos e status das condicionantes." },
] as const;

export type IdRelatorio = (typeof RELATORIOS)[number]["id"] | "modulo";

export function montarTabela(id: string, p: Painel, modulo?: string): Tabela | null {
  const { base, resumos, alertas, hoje } = p;
  const nomeT = new Map(base.terrenos.map((t) => [t.id, t]));
  const meds = duracoesMedianas(base);

  const linhaProcesso = (x: (typeof base.processos)[number]) => {
    const t = x.terrenoId ? nomeT.get(x.terrenoId) : undefined;
    const st = statusProcesso(x, hoje);
    return {
      Módulo: MODULOS[x.modulo].nome,
      Sigla: MODULOS[x.modulo].sigla,
      "ID SharePoint": x.id,
      Protocolo: x.titulo,
      "ID Terreno": x.terrenoId,
      Terreno: t?.nome ?? null,
      Unidade: t?.unidade ?? null,
      Situação: x.situacao,
      Status: st,
      Ação: x.acao,
      "Data de início": x.dataInicio,
      "Limite de protocolo": x.dataLimiteProtocolo,
      "Previsão de retorno": x.previsaoRetorno,
      "Data de término": x.dataTermino,
      "Conclusão prevista": st === "Concluído" || st === "Bloqueado" ? null : previsaoConclusao(x, meds),
      "Última atualização": x.dataAtualizacao,
      Comentários: x.comentarios,
    } as Record<string, Valor>;
  };

  switch (id) {
    case "consolidado": {
      const linhas = resumos.map((r) => {
        const l: Record<string, Valor> = {
          "ID Terreno": r.terreno.id,
          Terreno: r.terreno.nome,
          Unidade: r.terreno.unidade,
          Regional: r.terreno.regional,
          Responsável: r.terreno.responsavel,
          Etapa: r.etapa,
          "Fluxograma respondido": r.fluxoRespondido ? "Sim" : "Não",
        };
        for (const m of MODULOS_MATRIZ) {
          const c = r.modulos[m];
          l[MODULOS[m].sigla] = c.situacao === "a-abrir" ? "A abrir" : c.situacao === "conflito" ? `Conflito (${c.status})` : c.status ?? (c.aplicavel === false ? "Não se aplica" : "");
        }
        Object.assign(l, {
          "Progresso (%)": Math.round(r.progresso * 100),
          "Índice de risco": r.risco,
          "Nível de risco": r.nivelRisco,
          "Motivos do risco": r.motivosRisco.join("; "),
          "Prazo de liberação": r.terreno.prazoLiberacao,
          "Liberação prevista": r.liberacaoPrevista,
          "Processos a abrir": r.aAbrir.map((m) => MODULOS[m].sigla).join(", "),
          Conflitos: r.conflitos.map((m) => MODULOS[m].sigla).join(", "),
          Alertas: r.alertas,
          "Alertas críticos": r.alertasAltos,
        });
        return l;
      });
      return { nome: "Consolidado_Terrenos", colunas: Object.keys(linhas[0] ?? { Terreno: 0 }), linhas };
    }
    case "alertas": {
      const linhas = alertas.map((a) => ({
        Prioridade: a.alta ? "Alta" : "Atenção",
        Tipo: a.tipo,
        Terreno: a.terreno,
        Unidade: a.unidade,
        Módulo: a.modulo === "fluxograma" ? "Fluxograma" : MODULOS[a.modulo].sigla,
        Data: a.data,
        Detalhe: a.detalhe,
      }));
      return { nome: "Alertas", colunas: ["Prioridade", "Tipo", "Terreno", "Unidade", "Módulo", "Data", "Detalhe"], linhas };
    }
    case "processos": {
      const linhas = base.processos.map(linhaProcesso);
      return { nome: "Processos", colunas: Object.keys(linhas[0] ?? { Módulo: 0 }), linhas };
    }
    case "modulo": {
      if (!modulo || !moduloValido(modulo)) return null;
      const def = MODULOS[modulo as ModuloId];
      const linhas = base.processos
        .filter((x) => x.modulo === modulo)
        .map((x) => {
          const l = linhaProcesso(x);
          for (const e of def.extras) l[e.rotulo] = x.extras[e.chave] ?? null;
          return l;
        });
      return { nome: def.nome.replace(/\s+/g, "_"), colunas: Object.keys(linhas[0] ?? { Módulo: 0 }), linhas };
    }
    case "andamentos": {
      const proc = new Map(base.processos.map((x) => [`${x.modulo}:${x.id}`, x]));
      const linhas = base.andamentos.map((a) => {
        const x = proc.get(`${a.modulo}:${a.processoId}`);
        const t = x?.terrenoId ? nomeT.get(x.terrenoId) : undefined;
        return {
          Data: a.data, Módulo: MODULOS[a.modulo].sigla, "ID Processo": a.processoId, Protocolo: x?.titulo ?? null,
          Terreno: t?.nome ?? null, Unidade: t?.unidade ?? null, Ação: a.acao, Comentário: a.comentario,
          "Prazo de atendimento": a.prazoAtendimento, Usuário: a.usuario,
        } as Record<string, Valor>;
      });
      return { nome: "Linha_do_Tempo", colunas: Object.keys(linhas[0] ?? { Data: 0 }), linhas };
    }
    case "terrenos": {
      const fl = new Map(base.fluxos.map((f) => [f.terrenoId, f]));
      const linhas = base.terrenos.map((t) => {
        const f = fl.get(t.id);
        return {
          "ID Terreno": t.id, Terreno: t.nome, Unidade: t.unidade, "Origem da demanda": t.origemDemanda, Responsável: t.responsavel,
          Fase: t.fase, Regional: t.regional, Logradouro: t.endereco?.logradouro ?? null, Número: t.endereco?.numero ?? null,
          Bairro: t.endereco?.bairro ?? null, Cidade: t.endereco?.cidade ?? null, UF: t.endereco?.uf ?? null, CEP: t.endereco?.cep ?? null,
          "Data de disponibilidade": t.dataDisponibilidade, "Prazo de liberação": t.prazoLiberacao, "Previsão de entrega": t.previsaoEntrega,
          Parcelado: f?.parcelado ?? null, "Requer ARMBH": f?.armbh ?? null, "Proteção cultural": f?.cultural ?? null,
          "Supera altura": f?.altura ?? null, "Relevância ambiental": f?.relevancia ?? null, Supressão: f?.supressao ?? null,
          "Movimentação de terra": f?.movTerra ?? null, EAS: f?.eas ?? null,
        } as Record<string, Valor>;
      });
      return { nome: "Terrenos", colunas: Object.keys(linhas[0] ?? { Terreno: 0 }), linhas };
    }
    case "condicionantes": {
      const amb = new Map(base.processos.filter((x) => x.modulo === "ambiental").map((x) => [x.id, x]));
      const linhas = base.condicionantes.map((c) => {
        const a = c.ambientalId != null ? amb.get(c.ambientalId) : undefined;
        const t = a?.terrenoId ? nomeT.get(a.terrenoId) : undefined;
        return {
          "Processo ambiental": a?.titulo ?? null, Terreno: t?.nome ?? null, Unidade: t?.unidade ?? null,
          Item: c.item, Condicionante: c.condicionante, Prazo: c.prazo, Status: c.status, Observação: c.observacao,
        } as Record<string, Valor>;
      });
      return { nome: "Condicionantes", colunas: Object.keys(linhas[0] ?? { Item: 0 }), linhas };
    }
  }
  return null;
}

/** CSV com ";" e BOM — abre corretamente no Excel em português. */
export function paraCsv(t: Tabela): string {
  const esc = (v: Valor) => {
    if (v == null) return "";
    const s = String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [t.colunas.join(";"), ...t.linhas.map((l) => t.colunas.map((c) => esc(l[c] ?? null)).join(";"))].join("\r\n");
}

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function paraXlsx(t: Tabela, corCabecalho = "FF6F3B8C"): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Central de Diligenciamento";
  wb.created = new Date();
  const ws = wb.addWorksheet(t.nome.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = t.colunas.map((c) => ({ header: c, key: c, width: Math.min(45, Math.max(12, c.length + 4)) }));
  for (const l of t.linhas) {
    const linha: Record<string, unknown> = {};
    for (const c of t.colunas) {
      const v = l[c];
      linha[c] = typeof v === "string" && DATA_RE.test(v) ? new Date(`${v}T12:00:00Z`) : v;
    }
    ws.addRow(linha);
  }
  const cab = ws.getRow(1);
  cab.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cab.fill = { type: "pattern", pattern: "solid", fgColor: { argb: corCabecalho } };
  cab.alignment = { vertical: "middle" };
  ws.eachRow((row, i) => {
    if (i > 1) row.eachCell((cell) => { if (cell.value instanceof Date) cell.numFmt = "dd/mm/yyyy"; });
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: Math.max(1, t.colunas.length) } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
