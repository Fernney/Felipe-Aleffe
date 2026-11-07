import { sessaoAtual } from "@/lib/auth";
import { carregarPainel } from "@/lib/data";
import { filtroAtual } from "@/lib/filtro";
import { montarTabela, paraCsv, paraXlsx } from "@/lib/relatorios";
import { hojeISO } from "@/lib/domain/datas";

const COR = { todas: "FF6F3B8C", inova: "FF0D5A55", saude: "FF6E368C" } as const;

export async function GET(req: Request, { params }: { params: Promise<{ relatorio: string }> }) {
  if (!(await sessaoAtual())) return new Response("Não autenticado", { status: 401 });
  const { relatorio } = await params;
  const url = new URL(req.url);
  const filtro = await filtroAtual();
  const t = montarTabela(relatorio, await carregarPainel(filtro), url.searchParams.get("modulo") ?? undefined);
  if (!t) return new Response("Relatório não encontrado", { status: 404 });
  const sufixo = `${filtro === "todas" ? "" : `_${filtro.toUpperCase()}`}_${hojeISO()}`;
  if (url.searchParams.get("formato") === "csv") {
    return new Response(paraCsv(t), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${t.nome}${sufixo}.csv"` },
    });
  }
  const buf = await paraXlsx(t, COR[filtro]);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${t.nome}${sufixo}.xlsx"`,
    },
  });
}
