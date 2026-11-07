import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";

/**
 * Dois jeitos de o sistema acessar o SharePoint:
 *
 * - "delegado" (padrão): usa o login Microsoft de quem está usando o sistema.
 *   Enxerga exatamente o que a pessoa já enxerga no SharePoint. Não exige
 *   administrador para liberar o site — só que a organização permita que o
 *   usuário consinta as permissões delegadas no primeiro acesso.
 * - "aplicativo": o sistema tem acesso próprio (client credentials + Sites.Selected).
 *   Exige um administrador, mas permite o resumo diário automático (cron) e a
 *   API do Power BI, que rodam sem ninguém logado.
 */
export type ModoSharePoint = "delegado" | "aplicativo";

export function modoSharePoint(): ModoSharePoint {
  return process.env.SP_AUTH_MODE === "aplicativo" ? "aplicativo" : "delegado";
}

/** Permissões pedidas no login quando o modo é delegado. */
export const ESCOPOS_DELEGADOS = "openid profile email offline_access User.Read Sites.ReadWrite.All Mail.Send";

export interface TokensUsuario {
  accessToken: string;
  refreshToken?: string;
  /** Epoch em segundos. */
  expiresAt: number;
}

const tenant = () => process.env.AZURE_AD_TENANT_ID ?? process.env.SP_TENANT_ID ?? "organizations";

/** Renova o token delegado com o refresh token (fluxo padrão do Entra ID). */
export async function renovarTokenUsuario(refreshToken: string): Promise<TokensUsuario> {
  const corpo = new URLSearchParams({
    client_id: process.env.AZURE_AD_CLIENT_ID ?? "",
    client_secret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: ESCOPOS_DELEGADOS,
  });
  const r = await fetch(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/token`, { method: "POST", body: corpo, cache: "no-store" });
  if (!r.ok) throw new Error("Sua sessão Microsoft expirou. Saia e entre novamente.");
  const j = (await r.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  return { accessToken: j.access_token, refreshToken: j.refresh_token ?? refreshToken, expiresAt: Math.floor(Date.now() / 1000) + j.expires_in };
}

// Tokens renovados ficam em memória: nas páginas o Next.js não deixa regravar o cookie.
const renovados = new Map<string, TokensUsuario>();
const chave = (rt: string) => createHash("sha256").update(rt).digest("hex");

/** Token do Graph do usuário da requisição atual (lido do cookie de sessão criptografado). */
export async function tokenDoUsuarioAtual(): Promise<string> {
  const jar = await cookies();
  const t = (await getToken({ req: { cookies: jar, headers: {} } as never })) as (Partial<TokensUsuario> & { email?: string }) | null;
  if (!t?.accessToken) throw new Error("Entre com a sua conta Microsoft para acessar o SharePoint.");
  const agora = Math.floor(Date.now() / 1000);
  if ((t.expiresAt ?? 0) - 60 > agora) return t.accessToken;
  if (!t.refreshToken) throw new Error("Sua sessão Microsoft expirou. Saia e entre novamente.");
  const k = chave(t.refreshToken);
  const cache = renovados.get(k);
  if (cache && cache.expiresAt - 60 > agora) return cache.accessToken;
  const novo = await renovarTokenUsuario(t.refreshToken);
  renovados.set(k, novo);
  return novo.accessToken;
}

/** E-mail de quem está logado (para separar o cache de dados por usuário). */
export async function emailDoUsuarioAtual(): Promise<string> {
  const t = await getToken({ req: { cookies: await cookies(), headers: {} } as never });
  return (t?.email ?? "anonimo").toLowerCase();
}

// ---------------------------------------------------------------------------
// Modo aplicativo (client credentials)
// ---------------------------------------------------------------------------

let tokenApp: { valor: string; expira: number } | null = null;

export async function tokenDoAplicativo(): Promise<string> {
  if (tokenApp && tokenApp.expira > Date.now() + 60_000) return tokenApp.valor;
  const { SP_TENANT_ID, SP_CLIENT_ID, SP_CLIENT_SECRET } = process.env;
  if (!SP_TENANT_ID || !SP_CLIENT_ID || !SP_CLIENT_SECRET)
    throw new Error("Modo aplicativo: configure SP_TENANT_ID, SP_CLIENT_ID e SP_CLIENT_SECRET.");
  const corpo = new URLSearchParams({
    client_id: SP_CLIENT_ID,
    client_secret: SP_CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const r = await fetch(`https://login.microsoftonline.com/${SP_TENANT_ID}/oauth2/v2.0/token`, { method: "POST", body: corpo, cache: "no-store" });
  if (!r.ok) throw new Error(`Falha ao autenticar o aplicativo no Microsoft Entra ID (${r.status})`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  tokenApp = { valor: j.access_token, expira: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}
