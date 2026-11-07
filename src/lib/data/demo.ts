// Provedor de demonstração: gera uma base fictícia, porém realista, para rodar
// o sistema sem credenciais do SharePoint. Os dados ficam em memória enquanto
// o servidor estiver no ar (gravações funcionam, mas somem ao reiniciar).

import { hojeISO, somaDias } from "@/lib/domain/datas";
import { MODULOS } from "@/lib/domain/modulos";
import { aplicabilidade } from "@/lib/domain/regras";
import type { Andamento, Base, Fluxo, ModuloId, Processo, SimNao, Terreno, Unidade } from "@/lib/domain/types";
import { resolverVinculos, type AlteracaoProcesso, type NovoAndamento, type NovoProcesso, type Provedor, type RegistroEnvio } from "./provider";

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BAIRROS = [
  "Jardim Leblon", "Vila Pinho", "Lagoinha", "Céu Azul", "Jaqueline", "Tupi", "Primeiro de Maio", "Barreiro de Cima",
  "Mantiqueira", "Serra Verde", "Itaipu", "Conjunto Paulo VI", "Granja de Freitas", "Taquaril", "Ribeiro de Abreu",
  "Santa Mônica", "Copacabana", "Novo Aarão Reis", "Olhos D'Água", "Califórnia", "Solimões", "Lindéia",
];
const REGIONAIS = ["Barreiro", "Centro-Sul", "Leste", "Nordeste", "Noroeste", "Norte", "Oeste", "Pampulha", "Venda Nova"];
const RESPONSAVEIS = ["Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Rocha", "Felipe Aleffe"];

function gerar(): Base {
  const r = prng(20261107);
  const hoje = hojeISO();
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const sn = (p: number): SimNao => (r() < p ? "Sim" : "Não");
  const dia = (min: number, max: number) => somaDias(hoje, Math.round(min + r() * (max - min)));

  const terrenos: Terreno[] = [];
  const fluxos: Fluxo[] = [];
  BAIRROS.forEach((bairro, i) => {
    const unidade: Unidade = i % 2 === 0 ? "INOVA BH" : "SAÚDE BH";
    const prefixo = unidade === "INOVA BH" ? (i % 4 === 0 ? "EMEI" : "EM") : "CS";
    const id = i + 1;
    terrenos.push({
      id,
      nome: `${prefixo} ${bairro}`,
      unidade,
      origemDemanda: pick(["PPP Lote 1", "PPP Lote 2", "Aditivo", "Demanda PBH"]),
      responsavel: pick(RESPONSAVEIS),
      fase: pick(["Projeto", "Licenciamento", "Obra", "Operação"]),
      dataDisponibilidade: dia(-700, -200),
      previsaoEntrega: dia(120, 600),
      prazoLiberacao: dia(30, 300),
      regional: pick(REGIONAIS),
      endereco: {
        logradouro: `Rua ${pick(["das Acácias", "Padre Eustáquio", "Itaú", "Contorno", "Juramento", "Pitangui"])}`,
        numero: Math.round(50 + r() * 1800),
        complemento: null,
        bairro,
        cidade: "Belo Horizonte",
        uf: "MG",
        cep: `3${Math.round(1000 + r() * 8999)}-${Math.round(100 + r() * 899)}`,
      },
    });
    if (i % 7 !== 6) {
      fluxos.push({
        id: id,
        terrenoId: id,
        parcelado: sn(0.55),
        armbh: sn(0.3),
        cultural: sn(0.25),
        altura: sn(0.2),
        relevancia: sn(0.25),
        supressao: sn(0.5),
        movTerra: sn(0.6),
        eas: unidade === "SAÚDE BH" ? "Sim" : "Não",
      });
    }
  });

  const processos: Processo[] = [];
  const andamentos: Andamento[] = [];
  let pid = 100;
  let aid = 1;
  const SIT = ["Não Iniciada", "Em análise", "Em análise", "Aguardando documentação", "Pendente", "Aprovado", "Aprovado", "Aprovado", "Reprovado"];

  const novo = (modulo: ModuloId, terrenoId: number | null, extras: Processo["extras"] = {}, forcarSit?: string): Processo => {
    const situacao = forcarSit ?? pick(SIT);
    const inicio = dia(-500, -20);
    const concluido = ["Aprovado", "Dispensado"].includes(situacao);
    const p: Processo = {
      id: pid++,
      modulo,
      terrenoId,
      titulo: `${MODULOS[modulo].sigla}-${2025 + Math.floor(r() * 2)}/${String(Math.floor(r() * 9000) + 1000)}`,
      situacao,
      acao: pick(["Protocolar", "Acompanhar análise", "Responder exigência", "Aguardar retorno", "Emitir documento"]),
      dataInicio: inicio,
      dataLimiteProtocolo: situacao === "Não Iniciada" || situacao === "Aguardando documentação" ? dia(-10, 45) : null,
      previsaoRetorno: concluido ? null : r() < 0.6 ? dia(-20, 160) : null,
      dataAtualizacao: dia(-120, 0),
      dataTermino: concluido ? somaDias(inicio, Math.round(60 + r() * 220)) : null,
      link: null,
      comentarios: r() < 0.4 ? pick(["Aguardando parecer da PBH.", "Exigência técnica respondida.", "Reunião agendada com o órgão.", "Documentação complementar enviada."]) : null,
      extras,
    };
    if (p.dataTermino && p.dataTermino > hoje) p.dataTermino = dia(-30, -1);
    processos.push(p);
    // Linha do tempo
    const n = 1 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const quando = somaDias(inicio, 5 + k * 30 + Math.round(r() * 10));
      andamentos.push({
        id: aid++,
        modulo,
        processoId: p.id,
        acao: pick(["Protocolo realizado", "Exigência recebida", "Resposta enviada", "Vistoria agendada", "Análise em curso", "Reunião técnica"]),
        comentario: r() < 0.5 ? "Registro gerado na base de demonstração." : null,
        data: `${quando > hoje ? hoje : quando}T${String(9 + k).padStart(2, "0")}:00:00.000Z`,
        prazoAtendimento: k === n - 1 && !concluido && r() < 0.6 ? dia(-12, 40) : null,
        usuario: pick(RESPONSAVEIS),
      });
    }
    return p;
  };

  for (const t of terrenos) {
    const f = fluxos.find((x) => x.terrenoId === t.id);
    const apl = aplicabilidade(f) ?? { parcelamento: r() < 0.5, dipc: r() < 0.3, alvara: true };
    let alvara: Processo | null = null;
    let geava: Processo | null = null;
    let gelin: Processo | null = null;
    if (apl.parcelamento) {
      const parc = novo("parcelamento", t.id, {
        vencimentoDiretrizes: dia(-30, 200),
        faseProcesso: pick(["Diretrizes", "Projeto", "Aprovação", "Registro"]),
        modalidade: pick(["Loteamento", "Desmembramento", "Reparcelamento"]),
        requerArmbh: apl.armbh ? "Sim" : "Não",
      });
      if (apl.armbh)
        novo("armbh", null, {
          parcelamentoId: parc.id,
          anuencia: pick(["Solicitada", "Emitida", "Pendente"]),
          diretrizes: pick(["Emitidas", "Em análise"]),
          numeroAnuencia: null,
          validadeDiretrizes: dia(-15, 240),
        });
    }
    if (apl.dipc) novo("dipc", t.id, { requerPatrimonio: "Sim" });
    if (apl.cindacta) novo("cindacta", t.id, { preAnalise: "Sim", situacaoPreAnalise: pick(["Favorável", "Em análise"]) });
    if (apl.gelin) gelin = novo("gelin", t.id, { tipoAmbiental: "Licenciamento" });
    if (apl.geava) geava = novo("geava", t.id, { tipoAmbiental: "Supressão" });
    if (apl.amtt) novo("amtt", t.id, { volumeBotaFora: Math.round(r() * 4000), volumeEmprestimo: Math.round(r() * 2000), tipoProcesso: "Autorização" });
    if (r() < 0.75) alvara = novo("alvara", t.id, { numeroAlvara: r() < 0.5 ? `ALV-${Math.floor(r() * 99999)}` : null });
    if (r() < 0.25) novo("outros", t.id, { processo: pick(["COPASA - viabilidade", "CEMIG - carga", "BHTrans - impacto"]) });
    // Conflito proposital em um terreno (para demonstrar a trava)
    if (t.id === 5 && !apl.cindacta) novo("cindacta", t.id, {}, "Em análise");

    if (geava || gelin) {
      const tipo = gelin ? "Relevância Ambiental" : "Compensação";
      const amb = novo("ambiental", null, {
        tipo,
        geavaId: geava?.id ?? null,
        gelinId: gelin?.id ?? null,
        parecer: `PT-${Math.floor(r() * 900) + 100}/2025`,
        prazoTermo: dia(-20, 300),
        reciboDefinitivo: r() < 0.2 ? dia(-60, -1) : null,
        arvoresSuprimidas: Math.round(r() * 60),
        mudasCompensar: Math.round(40 + r() * 400),
        mudasDpea: Math.round(r() * 120),
        mudasGelin: Math.round(r() * 80),
      });
      amb.titulo = `Ambiental · ${t.nome}`;
    }
    if (alvara && alvara.situacao === "Aprovado" && r() < 0.7) {
      const ini = dia(-400, -100);
      const fim = r() < 0.6 ? dia(-90, -3) : null;
      novo("baixa", null, {
        alvaraId: alvara.id,
        inicioObra: ini,
        comunicadoTermino: fim && r() < 0.4 ? somaDias(fim, 5) : null,
        programacaoBaixa: null,
      }).dataTermino = fim;
    }
  }
  // Ajusta títulos da baixa
  for (const p of processos.filter((x) => x.modulo === "baixa")) p.titulo = `Baixa ${p.titulo.split("-")[1]}`;

  const ambientais = processos.filter((p) => p.modulo === "ambiental");
  const condicionantes = ambientais.flatMap((a, i) =>
    [1, 2, 3].map((k) => ({
      id: i * 10 + k,
      ambientalId: a.id,
      item: `${k}`,
      condicionante: pick(["Plantio compensatório", "Relatório fotográfico", "Cercamento da APP", "Monitoramento de fauna"]),
      prazo: dia(-30, 120),
      status: pick(["Pendente", "Em andamento", "Cumprida"]),
      observacao: null,
    })),
  );
  const relatorios = ambientais.flatMap((a, i) =>
    [1, 2].map((k) => ({
      id: i * 10 + k,
      ambientalId: a.id,
      nome: `Relatório de monitoramento ${k}`,
      prevista: dia(-40, 60),
      real: r() < 0.4 ? dia(-60, -1) : null,
    })),
  );

  return resolverVinculos({
    terrenos,
    fluxos,
    processos,
    condicionantes,
    relatorios,
    andamentos,
    usuarios: [
      { id: 1, nome: "Administrador Demo", email: "admin@demo.local", perfil: "Administrador" },
      { id: 2, nome: "Editor Demo", email: "editor@demo.local", perfil: "Editor" },
      { id: 3, nome: "Consulta Demo", email: "consulta@demo.local", perfil: "Consulta" },
    ],
    geradoEm: new Date().toISOString(),
    origem: "demo",
  });
}

const g = globalThis as unknown as { __baseDemo?: Base; __enviosDemo?: RegistroEnvio[] };

export class ProvedorDemo implements Provedor {
  readonly origem = "demo" as const;

  private base(): Base {
    return (g.__baseDemo ??= gerar());
  }

  async carregar(): Promise<Base> {
    // Cópia profunda para que os cálculos nunca alterem o estado em memória.
    return structuredClone({ ...this.base(), geradoEm: new Date().toISOString() });
  }

  async atualizarProcesso(modulo: ModuloId, id: number, alt: AlteracaoProcesso) {
    const p = this.base().processos.find((x) => x.modulo === modulo && x.id === id);
    if (!p) throw new Error("Processo não encontrado");
    const { extras, ...resto } = alt;
    Object.assign(p, resto);
    if (extras) p.extras = { ...p.extras, ...extras };
    p.dataAtualizacao = hojeISO();
  }

  async criarProcesso(n: NovoProcesso): Promise<Processo> {
    const b = this.base();
    const p: Processo = {
      id: Math.max(0, ...b.processos.map((x) => x.id)) + 1,
      modulo: n.modulo,
      terrenoId: n.terrenoId,
      titulo: n.titulo,
      situacao: n.situacao ?? "Não Iniciada",
      acao: n.acao ?? null,
      dataInicio: n.dataInicio ?? hojeISO(),
      dataLimiteProtocolo: n.dataLimiteProtocolo ?? null,
      previsaoRetorno: n.previsaoRetorno ?? null,
      dataAtualizacao: hojeISO(),
      dataTermino: n.dataTermino ?? null,
      link: n.link ?? null,
      comentarios: n.comentarios ?? null,
      extras: n.extras ?? {},
    };
    b.processos.push(p);
    return p;
  }

  async registrarAndamento(a: NovoAndamento): Promise<Andamento> {
    const b = this.base();
    const u = b.usuarios.find((x) => x.email === a.usuarioEmail);
    const novo: Andamento = {
      id: Math.max(0, ...b.andamentos.map((x) => x.id)) + 1,
      modulo: a.modulo,
      processoId: a.processoId,
      acao: a.acao,
      comentario: a.comentario,
      data: new Date().toISOString(),
      prazoAtendimento: a.prazoAtendimento,
      usuario: u?.nome ?? a.usuarioEmail,
    };
    b.andamentos.push(novo);
    return novo;
  }

  async salvarFluxo(f: Fluxo) {
    const b = this.base();
    const i = b.fluxos.findIndex((x) => x.terrenoId === f.terrenoId);
    if (i >= 0) b.fluxos[i] = { ...f, id: b.fluxos[i].id };
    else b.fluxos.push({ ...f, id: f.terrenoId });
  }

  async registrarEnvioAlertas(r: RegistroEnvio) {
    (g.__enviosDemo ??= []).push(r);
  }
}
