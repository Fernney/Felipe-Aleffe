import { MODULOS } from "./modulos";
import { statusProcesso } from "./regras";
import type { Base } from "./types";

export interface Evento {
  data: string;
  titulo: string;
  tipo: "Protocolo" | "Retorno" | "Linha do tempo" | "Diretrizes" | "Termo ambiental" | "Condicionante" | "Relatório" | "Liberação";
  terreno: string;
  href: string;
}

/** Todos os prazos futuros e vencidos em aberto, num só calendário. */
export function eventosAgenda(base: Base, hoje: string): Evento[] {
  const nome = new Map(base.terrenos.map((t) => [t.id, t.nome]));
  const out: Evento[] = [];
  const ultimoAndamento = new Map<string, (typeof base.andamentos)[number]>();
  for (const a of base.andamentos) {
    const k = `${a.modulo}:${a.processoId}`;
    if (!ultimoAndamento.has(k) || a.data > ultimoAndamento.get(k)!.data) ultimoAndamento.set(k, a);
  }
  for (const p of base.processos) {
    const st = statusProcesso(p, hoje);
    if (st === "Concluído" || st === "Bloqueado") continue;
    const terreno = p.terrenoId ? nome.get(p.terrenoId) ?? "" : "Sem terreno";
    const href = `/processos/${p.modulo}/${p.id}`;
    const sig = MODULOS[p.modulo].sigla;
    if (p.dataLimiteProtocolo) out.push({ data: p.dataLimiteProtocolo, titulo: `${sig} · limite de protocolo`, tipo: "Protocolo", terreno, href });
    if (p.previsaoRetorno) out.push({ data: p.previsaoRetorno, titulo: `${sig} · previsão de retorno`, tipo: "Retorno", terreno, href });
    const venc = p.extras.vencimentoDiretrizes as string | null;
    if (venc) out.push({ data: venc, titulo: "Vencimento das diretrizes", tipo: "Diretrizes", terreno, href });
    const termo = p.extras.prazoTermo as string | null;
    if (termo && !p.extras.reciboDefinitivo) out.push({ data: termo, titulo: "Prazo do termo de compromisso", tipo: "Termo ambiental", terreno, href });
    const u = ultimoAndamento.get(`${p.modulo}:${p.id}`);
    if (u?.prazoAtendimento) out.push({ data: u.prazoAtendimento, titulo: `${sig} · ${u.acao}`, tipo: "Linha do tempo", terreno, href });
  }
  const amb = new Map(base.processos.filter((p) => p.modulo === "ambiental").map((p) => [p.id, p]));
  for (const c of base.condicionantes) {
    if (!c.prazo || /cumprid|conclu/i.test(c.status ?? "")) continue;
    const a = c.ambientalId != null ? amb.get(c.ambientalId) : undefined;
    out.push({ data: c.prazo, titulo: `Condicionante item ${c.item ?? "?"}`, tipo: "Condicionante", terreno: a?.terrenoId ? nome.get(a.terrenoId) ?? "" : "", href: a ? `/processos/ambiental/${a.id}` : "/processos/ambiental" });
  }
  for (const r of base.relatorios) {
    if (r.real || !r.prevista) continue;
    const a = r.ambientalId != null ? amb.get(r.ambientalId) : undefined;
    out.push({ data: r.prevista, titulo: r.nome, tipo: "Relatório", terreno: a?.terrenoId ? nome.get(a.terrenoId) ?? "" : "", href: a ? `/processos/ambiental/${a.id}` : "/processos/ambiental" });
  }
  for (const t of base.terrenos) {
    if (t.prazoLiberacao) out.push({ data: t.prazoLiberacao, titulo: "Prazo de liberação do terreno", tipo: "Liberação", terreno: t.nome, href: `/terrenos/${t.id}` });
  }
  return out.sort((a, b) => a.data.localeCompare(b.data));
}

/** Arquivo iCalendar para importar no Outlook / Google Agenda. */
export function gerarIcs(eventos: Evento[], urlBase: string): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const carimbo = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JOPE//Central de Diligenciamento//PT-BR",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Prazos · Central de Diligenciamento",
  ];
  eventos.forEach((e, i) => {
    const d = e.data.replace(/-/g, "");
    linhas.push(
      "BEGIN:VEVENT",
      `UID:${d}-${i}-${e.href.replace(/\W/g, "")}@diligenciamento`,
      `DTSTAMP:${carimbo}`,
      `DTSTART;VALUE=DATE:${d}`,
      `SUMMARY:${esc(`${e.terreno ? `${e.terreno} · ` : ""}${e.titulo}`)}`,
      `DESCRIPTION:${esc(`${e.tipo} — ${urlBase}${e.href}`)}`,
      `URL:${urlBase}${e.href}`,
      "BEGIN:VALARM",
      "TRIGGER:-P2D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(e.titulo)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  });
  linhas.push("END:VCALENDAR");
  return linhas.join("\r\n");
}
