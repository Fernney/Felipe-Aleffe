import { describe, expect, it } from "vitest";
import { aplicabilidade, consolidar, filtrarBase, gerarAlertas, normalizarStatus, normalizarUnidade, statusProcesso } from "./regras";
import type { Base, Fluxo, Processo } from "./types";

const HOJE = "2026-11-07";

function proc(p: Partial<Processo> & Pick<Processo, "id" | "modulo">): Processo {
  return {
    terrenoId: 1, titulo: "X", situacao: null, acao: null, dataInicio: null, dataLimiteProtocolo: null,
    previsaoRetorno: null, dataAtualizacao: HOJE, dataTermino: null, link: null, comentarios: null, extras: {},
    ...p,
  };
}

function base(parcial: Partial<Base>): Base {
  return {
    terrenos: [{ id: 1, nome: "CS Teste", unidade: "SAÚDE BH", origemDemanda: null, responsavel: null, fase: null,
      dataDisponibilidade: null, previsaoEntrega: null, prazoLiberacao: null, regional: null, endereco: null }],
    fluxos: [], processos: [], condicionantes: [], relatorios: [], andamentos: [], usuarios: [],
    geradoEm: HOJE, origem: "demo", ...parcial,
  };
}

const fluxo = (f: Partial<Fluxo>): Fluxo => ({
  id: 1, terrenoId: 1, parcelado: "Sim", armbh: "Não", cultural: "Não", altura: "Não",
  relevancia: "Não", supressao: "Não", movTerra: "Não", eas: "Não", ...f,
});

describe("status", () => {
  it("normaliza igual ao app original", () => {
    expect(normalizarStatus(null)).toBe("Não iniciado");
    expect(normalizarStatus("Aprovado")).toBe("Concluído");
    expect(normalizarStatus("Dispensado")).toBe("Concluído");
    expect(normalizarStatus("Cancelado")).toBe("Bloqueado");
    expect(normalizarStatus("Aguardando documentação")).toBe("Aguardando");
    expect(normalizarStatus("Não Iniciada")).toBe("Não iniciado");
    expect(normalizarStatus("Em análise")).toBe("Em andamento");
  });
  it("baixa usa as datas da obra", () => {
    expect(statusProcesso(proc({ id: 1, modulo: "baixa", extras: { inicioObra: "2026-01-01" } }), HOJE)).toBe("Em andamento");
    expect(statusProcesso(proc({ id: 1, modulo: "baixa", extras: { comunicadoTermino: "2026-10-01" } }), HOJE)).toBe("Aguardando");
    expect(statusProcesso(proc({ id: 1, modulo: "baixa", extras: { programacaoBaixa: "2026-10-01" } }), HOJE)).toBe("Concluído");
  });
  it("ambiental com recibo definitivo é concluído", () => {
    expect(statusProcesso(proc({ id: 1, modulo: "ambiental", situacao: "Em análise", extras: { reciboDefinitivo: "2026-01-01" } }))).toBe("Concluído");
  });
});

describe("unidade", () => {
  it("reconhece INOVA e SAÚDE", () => {
    expect(normalizarUnidade("INOVA BH")).toBe("INOVA BH");
    expect(normalizarUnidade("SPE Saúde BH")).toBe("SAÚDE BH");
    expect(normalizarUnidade("SAUDE BH")).toBe("SAÚDE BH");
    expect(normalizarUnidade("")).toBeNull();
  });
});

describe("fluxograma", () => {
  it("aplica as mesmas regras do Power Apps", () => {
    const a = aplicabilidade(fluxo({ parcelado: "Não", armbh: "Sim", relevancia: "Não", supressao: "Sim", movTerra: "Sim" }))!;
    expect(a.parcelamento).toBe(true);
    expect(a.armbh).toBe(true);
    expect(a.geava).toBe(true);
    expect(a.gelin).toBe(false);
    expect(a.amtt).toBe(true);
    expect(a.dipc).toBe(false);
  });
  it("relevância ambiental leva a GELIN e não a GEAVA", () => {
    const a = aplicabilidade(fluxo({ relevancia: "Sim", supressao: "Sim" }))!;
    expect(a.gelin).toBe(true);
    expect(a.geava).toBe(false);
  });
  it("sem respostas não decide nada", () => {
    expect(aplicabilidade(undefined)).toBeNull();
  });
});

describe("consolidado e alertas", () => {
  it("detecta processo a abrir e conflito", () => {
    const b = base({
      fluxos: [fluxo({ cultural: "Sim", altura: "Não" })],
      processos: [proc({ id: 10, modulo: "cindacta", situacao: "Em análise" })],
    });
    const [r] = consolidar(b, HOJE);
    expect(r.aAbrir).toEqual(["dipc"]);
    expect(r.conflitos).toEqual(["cindacta"]);
    const tipos = gerarAlertas(b, HOJE).map((a) => a.tipo);
    expect(tipos).toContain("Conflito com o fluxograma");
    expect(tipos).toContain("Processo a abrir");
  });

  it("alerta diretrizes de parcelamento vencidas como alta prioridade", () => {
    const b = base({
      fluxos: [fluxo({ parcelado: "Não" })],
      processos: [proc({ id: 1, modulo: "parcelamento", situacao: "Em análise", extras: { vencimentoDiretrizes: "2026-10-01" } })],
    });
    const a = gerarAlertas(b, HOJE).find((x) => x.tipo === "Diretrizes de parcelamento")!;
    expect(a.alta).toBe(true);
    expect(a.terreno).toBe("CS Teste");
  });

  it("alerta comunicado de término pendente", () => {
    const b = base({ processos: [proc({ id: 3, modulo: "baixa", dataTermino: "2026-09-01", extras: {} })] });
    const a = gerarAlertas(b, HOJE).find((x) => x.tipo === "Comunicado de término pendente")!;
    expect(a.alta).toBe(true);
  });

  it("alerta prazo vencido do último andamento", () => {
    const b = base({
      fluxos: [fluxo({})],
      processos: [proc({ id: 7, modulo: "alvara", situacao: "Em análise" })],
      andamentos: [
        { id: 1, modulo: "alvara", processoId: 7, acao: "Antigo", comentario: null, data: "2026-01-01T10:00:00Z", prazoAtendimento: "2026-02-01", usuario: null },
        { id: 2, modulo: "alvara", processoId: 7, acao: "Responder exigência", comentario: null, data: "2026-11-01T10:00:00Z", prazoAtendimento: "2026-11-05", usuario: null },
      ],
    });
    const a = gerarAlertas(b, HOJE).filter((x) => x.tipo === "Prazo da linha do tempo vencido");
    expect(a).toHaveLength(1);
    expect(a[0].detalhe).toContain("Responder exigência");
  });

  it("risco sobe com bloqueio e conflitos", () => {
    const b = base({
      fluxos: [fluxo({ altura: "Não" })],
      processos: [proc({ id: 1, modulo: "cindacta", situacao: "Reprovado" })],
    });
    const [r] = consolidar(b, HOJE);
    expect(r.risco).toBeGreaterThanOrEqual(30);
    expect(r.motivosRisco.join(" ")).toContain("Bloqueado");
  });

  it("filtra por unidade", () => {
    const b = base({ processos: [proc({ id: 1, modulo: "alvara" })] });
    expect(filtrarBase(b, "inova").terrenos).toHaveLength(0);
    expect(filtrarBase(b, "saude").processos).toHaveLength(1);
  });
});
