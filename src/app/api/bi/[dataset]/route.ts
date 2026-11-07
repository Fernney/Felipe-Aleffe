import { timingSafeEqual } from "node:crypto";
import { carregarPainel } from "@/lib/data";
import { parseFiltro } from "@/lib/domain/regras";
import { montarTabela, paraCsv } from "@/lib/relatorios";

/**
 * API de dados para o Power BI (e qualquer outra ferramenta).
 * GET /api/bi/consolidado?unidade=inova&formato=csv
 * Autenticação: header "Authorization: Bearer <BI_API_TOKEN>".
 */
function autorizado(req: Request): boolean {
  const esperado = process.env.BI_API_TOKEN;
  if (!esperado || esperado.length < 24) return false;
  const recebido = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request, { params }: { params: Promise<{ dataset: string }> }) {
  if (!autorizado(req)) return Response.json({ erro: "Token inválido ou BI_API_TOKEN não configurado" }, { status: 401 });
  const { dataset } = await params;
  const url = new URL(req.url);
  const painel = await carregarPainel(parseFiltro(url.searchParams.get("unidade") ?? undefined));
  const t = montarTabela(dataset, painel, url.searchParams.get("modulo") ?? undefined);
  if (!t) return Response.json({ erro: "Dataset desconhecido" }, { status: 404 });
  if (url.searchParams.get("formato") === "csv") {
    return new Response(paraCsv(t), { headers: { "Content-Type": "text/csv; charset=utf-8" } });
  }
  return Response.json(t.linhas, { headers: { "Cache-Control": "no-store", "X-Gerado-Em": painel.base.geradoEm } });
}
