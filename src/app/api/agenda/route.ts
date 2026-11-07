import { sessaoAtual } from "@/lib/auth";
import { carregarPainel } from "@/lib/data";
import { eventosAgenda, gerarIcs } from "@/lib/domain/agenda";
import { filtroAtual } from "@/lib/filtro";

export async function GET(req: Request) {
  if (!(await sessaoAtual())) return new Response("Não autenticado", { status: 401 });
  const { base, hoje } = await carregarPainel(await filtroAtual());
  const ics = gerarIcs(eventosAgenda(base, hoje), new URL(req.url).origin);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="prazos-diligenciamento.ics"',
    },
  });
}
