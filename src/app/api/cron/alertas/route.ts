import { timingSafeEqual } from "node:crypto";
import { carregarPainel, semUsuarioDisponivel, obterProvedor } from "@/lib/data";
import { fmtDataHora } from "@/lib/domain/datas";
import { alertasDaSpe, DESTINOS, htmlAlertas } from "@/lib/email";

/**
 * Resumo diário automático por e-mail (substitui o fluxo agendado do Power Automate).
 * Agende uma chamada diária: GET /api/cron/alertas com "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET ?? "";
  const recebido = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""));
  if (segredo.length < 16 || recebido.length !== segredo.length || !timingSafeEqual(recebido, Buffer.from(segredo)))
    return Response.json({ erro: "Não autorizado" }, { status: 401 });

  if (!semUsuarioDisponivel())
    return Response.json(
      { erro: "Com SP_AUTH_MODE=delegado esta rotina não roda sem alguém logado. Use o envio/exportação pela tela ou peça ao TI o modo aplicativo." },
      { status: 503 },
    );
  const { alertas } = await carregarPainel("todas");
  const p = await obterProvedor();
  const urlBase = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const enviados: Record<string, number> = {};
  for (const spe of ["saude", "inova"] as const) {
    const lista = alertasDaSpe(alertas, spe);
    if (!lista.length) continue;
    if ("enviarEmail" in p && typeof p.enviarEmail === "function") {
      const html = htmlAlertas(lista, spe, `Envio automático diário · ${fmtDataHora(new Date().toISOString())}`, urlBase);
      await (p.enviarEmail as (a: string[], b: string, c: string) => Promise<void>)([DESTINOS[spe].email], `[Diligenciamento] Resumo diário · ${lista.length} alerta(s)`, html);
    }
    enviados[spe] = lista.length;
  }
  await p.registrarEnvioAlertas({ nome: `Envio automático ${fmtDataHora(new Date().toISOString())}`, enviadoPor: "Sistema", origem: "Automático", quantidade: alertas.length });
  return Response.json({ ok: true, enviados, origem: p.origem });
}
