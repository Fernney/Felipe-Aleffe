// Provedor SharePoint via Microsoft Graph (permissão de aplicativo).
// Lê e grava nas mesmas listas do site CentraldeDiligenciamento_R00 usadas
// pelo Power Apps — o Power BI continua lendo as listas normalmente.
//
// Variáveis de ambiente: SP_TENANT_ID, SP_CLIENT_ID, SP_CLIENT_SECRET,
// SP_SITE (ex.: transpes.sharepoint.com:/sites/CentraldeDiligenciamento_R00)
// e opcionalmente SP_CACHE_SECONDS (padrão 60).

import "server-only";
import { LISTA_MODULOS, MODULOS } from "@/lib/domain/modulos";
import { normalizarUnidade } from "@/lib/domain/regras";
import type {
  Andamento, Base, Condicionante, DataISO, Endereco, Fluxo, ModuloId, Perfil, Processo,
  RelatorioMonitoramento, SimNao, Terreno, Usuario,
} from "@/lib/domain/types";
import {
  resolverVinculos, type AlteracaoProcesso, type NovoAndamento, type NovoProcesso, type Provedor, type RegistroEnvio,
} from "./provider";

const LISTAS = {
  terrenos: "36fdeb52-4dce-43be-9fc5-6134f873e421",
  fluxos: "d148efad-2907-479c-a20a-aa8568bcdb37",
  enderecos: "9f5c3704-54f9-463a-9ab8-80351fa71f48",
  ibed: "4da90385-672f-4dbf-92b5-95ff1d805e65",
  usuarios: "5d86ed7a-1042-45fa-97c7-e5afc2c55aae",
  condicionantes: "e29b6d47-3b36-4537-8a63-386e76d8f6f5",
  relatorios: "37b7b6ad-5592-40c0-b03b-f2a90f834321",
  ltLicenciamento: "74e6c0c6-e392-4bb6-828e-2c9e60551fba",
  ltParcelamento: "8282d565-f347-4b07-ac0f-706b0f43792c",
  envios: "dd0a2e9e-28b5-49fa-9afa-2a923c817fde",
};

const FLUXO_SP: Record<Exclude<keyof Fluxo, "id" | "terrenoId">, string> = {
  parcelado: "cd_terrenoparcelado",
  armbh: "cd_requerarmbh",
  cultural: "cd_protecaocultural",
  altura: "cd_superaalturalimite",
  relevancia: "cd_relevanciaambiental",
  supressao: "cd_possuisupressao",
  movTerra: "cd_movimentacaodeterra",
  eas: "cd_estabelecimentodesaude",
};

type Campos = Record<string, unknown>;
interface Item { id: string; fields: Campos }

const TZ = "America/Sao_Paulo";

// ---------- conversões ----------
function data(v: unknown): DataISO {
  if (typeof v !== "string" || !v) return null;
  // Colunas "somente data" vêm como meia-noite do fuso do site convertida para UTC.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(v));
}
function dataParaSp(v: DataISO | undefined): string | null {
  return v ? `${v}T03:00:00Z` : null; // meia-noite em Brasília
}
function txt(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}
function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function lookup(f: Campos, col: string): number | null {
  return num(f[`${col}LookupId`]);
}
function simNao(v: unknown): SimNao {
  const s = txt(v)?.toLowerCase();
  if (!s) return null;
  return s.startsWith("s") || s === "yes" || s === "true" ? "Sim" : "Não";
}
function perfil(v: unknown): Perfil {
  const s = (txt(v) ?? "").toLowerCase();
  if (s.includes("admin")) return "Administrador";
  if (s.includes("consulta") || s.includes("leitura")) return "Consulta";
  return "Editor";
}

// ---------- cliente Graph ----------
class Graph {
  private token: { valor: string; expira: number } | null = null;
  private siteId: string | null = null;

  constructor(
    private tenant: string,
    private clientId: string,
    private secret: string,
    private site: string,
  ) {}

  private async obterToken(): Promise<string> {
    if (this.token && this.token.expira > Date.now() + 60_000) return this.token.valor;
    const corpo = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.secret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });
    const r = await fetch(`https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/token`, {
      method: "POST",
      body: corpo,
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Falha ao autenticar no Microsoft Entra ID (${r.status})`);
    const j = (await r.json()) as { access_token: string; expires_in: number };
    this.token = { valor: j.access_token, expira: Date.now() + j.expires_in * 1000 };
    return j.access_token;
  }

  async req<T>(caminho: string, init: RequestInit = {}, tentativa = 0): Promise<T> {
    const url = caminho.startsWith("https://") ? caminho : `https://graph.microsoft.com/v1.0${caminho}`;
    const r = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${await this.obterToken()}`,
        "Content-Type": "application/json",
        Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly",
        ...(init.headers ?? {}),
      },
    });
    // Limite de requisições do SharePoint: respeita Retry-After.
    if ((r.status === 429 || r.status === 503) && tentativa < 4) {
      const espera = Number(r.headers.get("Retry-After") ?? 2 ** tentativa) * 1000;
      await new Promise((ok) => setTimeout(ok, espera));
      return this.req<T>(caminho, init, tentativa + 1);
    }
    if (!r.ok) {
      const corpo = await r.text();
      throw new Error(`Graph ${r.status} em ${caminho.split("?")[0]}: ${corpo.slice(0, 300)}`);
    }
    if (r.status === 204) return undefined as T;
    return (await r.json()) as T;
  }

  async site_(): Promise<string> {
    if (this.siteId) return this.siteId;
    const s = await this.req<{ id: string }>(`/sites/${this.site}`);
    return (this.siteId = s.id);
  }

  async itens(listaId: string): Promise<Item[]> {
    const site = await this.site_();
    const out: Item[] = [];
    let url: string | undefined = `/sites/${site}/lists/${listaId}/items?$expand=fields&$top=999`;
    while (url) {
      const pagina: { value: Item[]; "@odata.nextLink"?: string } = await this.req(url);
      out.push(...pagina.value);
      url = pagina["@odata.nextLink"];
    }
    return out;
  }

  async criar(listaId: string, campos: Campos): Promise<Item> {
    const site = await this.site_();
    return this.req<Item>(`/sites/${site}/lists/${listaId}/items`, {
      method: "POST",
      body: JSON.stringify({ fields: campos }),
    });
  }

  async atualizar(listaId: string, id: number, campos: Campos): Promise<void> {
    const site = await this.site_();
    await this.req(`/sites/${site}/lists/${listaId}/items/${id}/fields`, {
      method: "PATCH",
      body: JSON.stringify(campos),
    });
  }
}

// ---------- mapeamentos ----------
function paraProcesso(modulo: ModuloId, it: Item): Processo {
  const def = MODULOS[modulo];
  const f = it.fields;
  const g = (col?: string) => (col ? f[col] : undefined);
  const extras: Processo["extras"] = {};
  for (const e of def.extras) {
    if (e.tipo === "data") extras[e.chave] = data(f[e.sp]);
    else if (e.tipo === "numero") extras[e.chave] = f[`${e.sp}LookupId`] !== undefined ? lookup(f, e.sp) : num(f[e.sp]);
    else extras[e.chave] = txt(f[e.sp]);
  }
  return {
    id: Number(it.id),
    modulo,
    terrenoId: def.sp.terreno ? lookup(f, def.sp.terreno) : null,
    titulo: txt(g(def.sp.titulo)) ?? `#${it.id}`,
    situacao: txt(g(def.sp.situacao)),
    acao: txt(g(def.sp.acao)),
    dataInicio: data(g(def.sp.dataInicio)),
    dataLimiteProtocolo: data(g(def.sp.dataLimiteProtocolo)),
    previsaoRetorno: data(g(def.sp.previsaoRetorno)),
    dataAtualizacao: data(g(def.sp.dataAtualizacao)) ?? data(f.Modified),
    dataTermino: data(g(def.sp.dataTermino)),
    link: txt(g(def.sp.link)),
    comentarios: txt(g(def.sp.comentarios)),
    extras,
  };
}

function camposDeAlteracao(modulo: ModuloId, alt: AlteracaoProcesso): Campos {
  const def = MODULOS[modulo];
  const c: Campos = {};
  const set = (col: string | undefined, v: unknown) => {
    if (col && v !== undefined) c[col] = v;
  };
  set(def.sp.titulo, alt.titulo);
  set(def.sp.situacao, alt.situacao);
  set(def.sp.acao, alt.acao);
  set(def.sp.comentarios, alt.comentarios);
  set(def.sp.link, alt.link);
  for (const k of ["dataInicio", "dataLimiteProtocolo", "previsaoRetorno", "dataTermino"] as const) {
    if (alt[k] !== undefined) set(def.sp[k], dataParaSp(alt[k]));
  }
  if (def.sp.dataAtualizacao) c[def.sp.dataAtualizacao] = dataParaSp(new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()));
  for (const [chave, valor] of Object.entries(alt.extras ?? {})) {
    const e = def.extras.find((x) => x.chave === chave);
    if (!e) continue;
    if (e.tipo === "data") c[e.sp] = dataParaSp(valor as DataISO);
    else if (e.tipo === "numero" && chave.endsWith("Id")) c[`${e.sp}LookupId`] = valor == null ? null : String(valor);
    else c[e.sp] = valor;
  }
  return c;
}

// ---------- provedor ----------
const cache = globalThis as unknown as { __baseSp?: { base: Base; em: number } };

export class ProvedorSharePoint implements Provedor {
  readonly origem = "sharepoint" as const;
  private g: Graph;
  private ttl = Number(process.env.SP_CACHE_SECONDS ?? 60) * 1000;

  constructor() {
    const { SP_TENANT_ID, SP_CLIENT_ID, SP_CLIENT_SECRET, SP_SITE } = process.env;
    if (!SP_TENANT_ID || !SP_CLIENT_ID || !SP_CLIENT_SECRET || !SP_SITE)
      throw new Error("Configure SP_TENANT_ID, SP_CLIENT_ID, SP_CLIENT_SECRET e SP_SITE.");
    this.g = new Graph(SP_TENANT_ID, SP_CLIENT_ID, SP_CLIENT_SECRET, SP_SITE);
  }

  private invalidar() {
    cache.__baseSp = undefined;
  }

  async carregar(): Promise<Base> {
    if (cache.__baseSp && Date.now() - cache.__baseSp.em < this.ttl) return structuredClone(cache.__baseSp.base);

    const [terrenosR, fluxosR, endR, ibedR, usuR, condR, relR, ltLicR, ltParR, ...modsR] = await Promise.all([
      this.g.itens(LISTAS.terrenos),
      this.g.itens(LISTAS.fluxos),
      this.g.itens(LISTAS.enderecos),
      this.g.itens(LISTAS.ibed),
      this.g.itens(LISTAS.usuarios),
      this.g.itens(LISTAS.condicionantes),
      this.g.itens(LISTAS.relatorios),
      this.g.itens(LISTAS.ltLicenciamento),
      this.g.itens(LISTAS.ltParcelamento),
      ...LISTA_MODULOS.map((m) => this.g.itens(m.listaId)),
    ]);

    const enderecos = new Map<number, Endereco>();
    for (const it of endR) {
      const f = it.fields;
      const tid = lookup(f, "cd_idterreno");
      if (tid == null) continue;
      enderecos.set(tid, {
        logradouro: txt(f.Title), numero: num(f.cd_numero), complemento: txt(f.cd_complemento),
        bairro: txt(f.cd_bairro), cidade: txt(f.cd_cidade), uf: txt(f.cd_uf), cep: txt(f.cd_cep),
      });
    }
    const regional = new Map<number, string>();
    for (const it of ibedR) {
      const tid = lookup(it.fields, "cd_terreno");
      const reg = txt(it.fields.cd_regional);
      if (tid != null && reg) regional.set(tid, reg);
    }

    const terrenos: Terreno[] = terrenosR.map((it) => {
      const f = it.fields;
      const id = Number(it.id);
      return {
        id,
        nome: txt(f.Title) ?? `Terreno ${id}`,
        unidade: normalizarUnidade(txt(f.cd_concessionaria_r01) ?? txt(f.cd_concessionaria)),
        origemDemanda: txt(f.cd_origemdemanda),
        responsavel: txt(f.cd_responsavel),
        fase: txt(f.cd_faseempreendimento),
        dataDisponibilidade: data(f.cd_datadedisponibilidade_r01) ?? data(f.cd_datadadisponibilidade),
        previsaoEntrega: data(f.cd_previsaoentrega),
        prazoLiberacao: data(f["PrazodeLibera_x00e7__x00e3_o"]),
        regional: regional.get(id) ?? null,
        endereco: enderecos.get(id) ?? null,
      };
    });

    const fluxos: Fluxo[] = [];
    for (const it of fluxosR) {
      const tid = lookup(it.fields, "cd_terrenoid");
      if (tid == null) continue;
      const fl: Fluxo = { id: Number(it.id), terrenoId: tid } as Fluxo;
      for (const [k, col] of Object.entries(FLUXO_SP)) (fl as unknown as Record<string, SimNao>)[k] = simNao(it.fields[col]);
      fluxos.push(fl);
    }

    const processos: Processo[] = LISTA_MODULOS.flatMap((def, i) => modsR[i].map((it) => paraProcesso(def.id, it)));

    const usuarios: Usuario[] = usuR.map((it) => ({
      id: Number(it.id),
      nome: txt(it.fields.Title) ?? "",
      email: (txt(it.fields.cd_emailcorporativo) ?? "").toLowerCase(),
      perfil: perfil(it.fields.cd_perfildeacesso),
    }));
    const nomeUsuario = new Map(usuarios.map((u) => [u.id, u.nome]));

    const andamentos: Andamento[] = [];
    const lerLinha = (itens: Item[], lista: "licenciamento" | "parcelamento", prazoCol: string) => {
      const mods = LISTA_MODULOS.filter((m) => m.linhaDoTempo?.lista === lista);
      for (const it of itens) {
        const f = it.fields;
        const mod = mods.find((m) => lookup(f, m.linhaDoTempo!.coluna) != null);
        if (!mod) continue;
        andamentos.push({
          id: Number(it.id),
          modulo: mod.id,
          processoId: lookup(f, mod.linhaDoTempo!.coluna)!,
          acao: txt(f.Title) ?? "",
          comentario: txt(f.cd_comentario),
          data: txt(f.cd_datadaatualizacao) ?? txt(f.Created) ?? new Date().toISOString(),
          prazoAtendimento: data(f[prazoCol]),
          usuario: nomeUsuario.get(lookup(f, "cd_usuariodosistema") ?? -1) ?? null,
        });
      }
    };
    lerLinha(ltLicR, "licenciamento", "cd_prazodeatendimento");
    lerLinha(ltParR, "parcelamento", "cd_prazodeatendiemnto"); // (sic) nome interno da coluna

    const condicionantes: Condicionante[] = condR.map((it) => ({
      id: Number(it.id),
      ambientalId: lookup(it.fields, "cd_ambiental"),
      item: txt(it.fields.cd_item),
      condicionante: txt(it.fields.Title),
      prazo: data(it.fields.cd_prazo),
      status: txt(it.fields.cd_status),
      observacao: txt(it.fields.cd_observacao),
    }));
    const relatorios: RelatorioMonitoramento[] = relR.map((it) => ({
      id: Number(it.id),
      ambientalId: lookup(it.fields, "cd_ambiental"),
      nome: txt(it.fields.Title) ?? "Relatório",
      prevista: data(it.fields.cd_dataprevistadorelatoriodemon),
      real: data(it.fields.cd_datarealdorelatoriodemon),
    }));

    const base = resolverVinculos({
      terrenos, fluxos, processos, condicionantes, relatorios, andamentos, usuarios,
      geradoEm: new Date().toISOString(),
      origem: "sharepoint",
    });
    cache.__baseSp = { base, em: Date.now() };
    return structuredClone(base);
  }

  async atualizarProcesso(modulo: ModuloId, id: number, alt: AlteracaoProcesso) {
    await this.g.atualizar(MODULOS[modulo].listaId, id, camposDeAlteracao(modulo, alt));
    this.invalidar();
  }

  async criarProcesso(n: NovoProcesso): Promise<Processo> {
    const def = MODULOS[n.modulo];
    const campos = camposDeAlteracao(n.modulo, { situacao: "Não Iniciada", dataInicio: null, ...n });
    if (def.sp.terreno && n.terrenoId != null) campos[`${def.sp.terreno}LookupId`] = String(n.terrenoId);
    const it = await this.g.criar(def.listaId, campos);
    this.invalidar();
    return paraProcesso(n.modulo, it);
  }

  async registrarAndamento(a: NovoAndamento): Promise<Andamento> {
    const lt = MODULOS[a.modulo].linhaDoTempo;
    if (!lt) throw new Error("Este módulo não possui linha do tempo no SharePoint.");
    const base = await this.carregar();
    const usuario = base.usuarios.find((u) => u.email === a.usuarioEmail.toLowerCase());
    const lista = lt.lista === "licenciamento" ? LISTAS.ltLicenciamento : LISTAS.ltParcelamento;
    const prazoCol = lt.lista === "licenciamento" ? "cd_prazodeatendimento" : "cd_prazodeatendiemnto";
    const agora = new Date().toISOString();
    const campos: Campos = {
      Title: a.acao,
      cd_comentario: a.comentario,
      cd_datadaatualizacao: agora,
      [prazoCol]: dataParaSp(a.prazoAtendimento),
      cd_tipodeprocesso: lt.tipo,
      [`${lt.coluna}LookupId`]: String(a.processoId),
    };
    if (usuario) campos.cd_usuariodosistemaLookupId = String(usuario.id);
    const it = await this.g.criar(lista, campos);
    this.invalidar();
    return {
      id: Number(it.id), modulo: a.modulo, processoId: a.processoId, acao: a.acao, comentario: a.comentario,
      data: agora, prazoAtendimento: a.prazoAtendimento, usuario: usuario?.nome ?? a.usuarioEmail,
    };
  }

  async salvarFluxo(f: Fluxo) {
    const campos: Campos = {};
    for (const [k, col] of Object.entries(FLUXO_SP)) campos[col] = (f as unknown as Record<string, SimNao>)[k];
    if (f.id) await this.g.atualizar(LISTAS.fluxos, f.id, campos);
    else await this.g.criar(LISTAS.fluxos, { ...campos, Title: `Fluxo terreno ${f.terrenoId}`, cd_terrenoidLookupId: String(f.terrenoId) });
    this.invalidar();
  }

  async registrarEnvioAlertas(r: RegistroEnvio) {
    await this.g.criar(LISTAS.envios, {
      Title: r.nome,
      cd_datadoenvio: dataParaSp(new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date())),
      cd_enviadopor: r.enviadoPor,
      cd_origem: r.origem,
      cd_quantidade: r.quantidade,
    });
  }

  /** Envia e-mail pelo Graph (caixa definida em MAIL_SENDER). */
  async enviarEmail(para: string[], assunto: string, html: string) {
    const remetente = process.env.MAIL_SENDER;
    if (!remetente) throw new Error("Configure MAIL_SENDER para enviar e-mails.");
    await this.g.req(`/users/${encodeURIComponent(remetente)}/sendMail`, {
      method: "POST",
      body: JSON.stringify({
        message: {
          subject: assunto,
          body: { contentType: "HTML", content: html },
          toRecipients: para.map((address) => ({ emailAddress: { address } })),
        },
        saveToSentItems: true,
      }),
    });
  }
}
