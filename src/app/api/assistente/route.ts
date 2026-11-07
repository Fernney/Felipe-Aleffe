import { z } from "zod";
import { sessaoAtual } from "@/lib/auth";
import { carregarPainel } from "@/lib/data";
import { perguntarClaude, responderLocal } from "@/lib/assistente";
import { filtroAtual } from "@/lib/filtro";

const Corpo = z.object({
  mensagens: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(20)
    .refine((m) => m[0].role === "user" && m[m.length - 1].role === "user", "A conversa deve começar e terminar com o usuário"),
});

export async function POST(req: Request) {
  if (!(await sessaoAtual())) return Response.json({ erro: "Não autenticado" }, { status: 401 });
  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: "Requisição inválida" }, { status: 400 });
  const painel = await carregarPainel(await filtroAtual());
  const { mensagens } = parsed.data;
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ resposta: responderLocal(painel, mensagens[mensagens.length - 1].content), modo: "local" });
  }
  try {
    return Response.json({ resposta: await perguntarClaude(painel, mensagens), modo: "ia" });
  } catch (e) {
    console.error("Assistente:", e);
    return Response.json({ resposta: responderLocal(painel, mensagens[mensagens.length - 1].content), modo: "local", aviso: "IA indisponível no momento" });
  }
}
