import { sessaoAtual } from "@/lib/auth";
import { carregarPainel } from "@/lib/data";
import { alertasDaSpe, htmlAlertas } from "@/lib/email";

export async function GET(req: Request) {
  const s = await sessaoAtual();
  if (!s) return new Response("Não autenticado", { status: 401 });
  const url = new URL(req.url);
  const spe = url.searchParams.get("spe") === "inova" ? "inova" : "saude";
  const { alertas } = await carregarPainel("todas");
  const html = htmlAlertas(alertasDaSpe(alertas, spe), spe, "Prévia — este e-mail ainda não foi enviado.", url.origin);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
