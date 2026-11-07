import "server-only";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import type { Perfil } from "@/lib/domain/types";
import { obterProvedor, obterProvedorComToken, usaSharePoint } from "@/lib/data";
import { ESCOPOS_DELEGADOS, modoSharePoint, renovarTokenUsuario } from "@/lib/data/tokens";

export const loginDemoAtivo = process.env.DATA_PROVIDER !== "sharepoint" || process.env.DEMO_LOGIN === "true";
export const loginMicrosoftAtivo = !!process.env.AZURE_AD_CLIENT_ID;

const providers: NextAuthOptions["providers"] = [];
if (loginMicrosoftAtivo) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      // No modo delegado, o login já pede acesso ao SharePoint e ao envio de e-mail em nome do usuário.
      authorization: {
        params: { scope: usaSharePoint() && modoSharePoint() === "delegado" ? ESCOPOS_DELEGADOS : "openid profile email" },
      },
      // Contas corporativas nem sempre trazem a claim "email": usa o login (UPN) como e-mail.
      // Também evita baixar a foto do Graph, que deixaria o cookie de sessão grande demais.
      profile(p: { sub: string; name?: string; email?: string; preferred_username?: string; upn?: string }) {
        const email = (p.email ?? p.preferred_username ?? p.upn ?? "").toLowerCase();
        return { id: p.sub, name: p.name ?? email, email, image: null };
      },
    }),
  );
}
if (loginDemoAtivo) {
  providers.push(
    CredentialsProvider({
      id: "demo",
      name: "Demonstração",
      credentials: { perfil: { label: "Perfil", type: "text" } },
      async authorize(c) {
        const perfil = (["Administrador", "Editor", "Consulta"] as const).find((p) => p === c?.perfil) ?? "Editor";
        const email = { Administrador: "admin@demo.local", Editor: "editor@demo.local", Consulta: "consulta@demo.local" }[perfil];
        return { id: email, email, name: `${perfil} Demo` };
      },
    }),
  );
}

/** Perfil vem da lista "Usuário do Sistema" (igual à tela de login do Power Apps). */
async function perfilDoUsuario(email: string, accessToken?: string): Promise<Perfil> {
  try {
    const p = accessToken ? await obterProvedorComToken(accessToken, email) : await obterProvedor();
    const base = await p.carregar();
    return base.usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase())?.perfil ?? "Consulta";
  } catch (e) {
    console.error("Não foi possível ler a lista Usuário do Sistema:", e instanceof Error ? e.message : e);
    return "Consulta";
  }
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt", maxAge: 60 * 60 * 10 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, account }) {
      // Primeiro acesso: guarda os tokens do Microsoft (o cookie de sessão é criptografado).
      if (account?.provider === "azure-ad" && account.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at ?? Math.floor(Date.now() / 1000) + 3600;
      }
      if (user?.email) {
        const delegado = account?.provider === "azure-ad" && usaSharePoint() && modoSharePoint() === "delegado";
        token.perfil = await perfilDoUsuario(user.email, delegado ? account?.access_token : undefined);
        return token;
      }
      // Renova o token quando possível (rotas e ações conseguem regravar o cookie).
      const exp = token.expiresAt as number | undefined;
      if (token.refreshToken && exp && exp - 60 < Math.floor(Date.now() / 1000)) {
        try {
          const novo = await renovarTokenUsuario(token.refreshToken as string);
          Object.assign(token, novo);
        } catch {
          /* tokenDoUsuarioAtual() avisa o usuário para entrar de novo */
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.perfil = (token.perfil as Perfil) ?? "Consulta";
      return session;
    },
  },
};

export interface Sessao {
  nome: string;
  email: string;
  perfil: Perfil;
  podeEditar: boolean;
}

export async function sessaoAtual(): Promise<Sessao | null> {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) return null;
  const perfil = s.user.perfil ?? "Consulta";
  return { nome: s.user.name ?? s.user.email, email: s.user.email, perfil, podeEditar: perfil !== "Consulta" };
}

export async function exigirSessao(): Promise<Sessao> {
  const s = await sessaoAtual();
  if (!s) redirect("/login");
  return s;
}

export async function exigirEdicao(): Promise<Sessao> {
  const s = await exigirSessao();
  if (!s.podeEditar) throw new Error("Seu perfil é somente consulta.");
  return s;
}
