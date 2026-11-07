import { Shell, type ItemBusca } from "@/components/shell";
import { exigirSessao } from "@/lib/auth";
import { carregarPainel } from "@/lib/data";
import { LISTA_MODULOS, MODULOS } from "@/lib/domain/modulos";
import { filtroAtual, temaAtual } from "@/lib/filtro";

export const dynamic = "force-dynamic";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();
  const [filtro, tema] = await Promise.all([filtroAtual(), temaAtual()]);
  const { base, alertas } = await carregarPainel(filtro);
  const nomeTerreno = new Map(base.terrenos.map((t) => [t.id, t.nome]));

  const indice: ItemBusca[] = [
    ...LISTA_MODULOS.map((m) => ({ tipo: "Página" as const, titulo: m.nome, sub: m.descricao, href: `/processos/${m.id}` })),
    { tipo: "Página", titulo: "Alertas e pendências", sub: "Central de alertas", href: "/alertas" },
    { tipo: "Página", titulo: "Agenda de prazos", sub: "Calendário de vencimentos", href: "/agenda" },
    { tipo: "Página", titulo: "Relatórios & Power BI", sub: "Exportações e API de dados", href: "/relatorios" },
    ...base.terrenos.map((t) => ({
      tipo: "Terreno" as const,
      titulo: t.nome,
      sub: [t.unidade, t.regional, t.endereco?.bairro].filter(Boolean).join(" · "),
      href: `/terrenos/${t.id}`,
    })),
    ...base.processos.map((p) => ({
      tipo: "Processo" as const,
      titulo: `${MODULOS[p.modulo].sigla} · ${p.titulo}`,
      sub: `${p.terrenoId ? nomeTerreno.get(p.terrenoId) ?? "" : "Sem terreno"} · ${p.situacao ?? "Sem situação"}`,
      href: `/processos/${p.modulo}/${p.id}`,
    })),
  ];

  return (
    <Shell
      usuario={{ nome: sessao.nome, perfil: sessao.perfil }}
      filtro={filtro}
      tema={tema}
      alertasAltos={alertas.filter((a) => a.alta).length}
      origem={base.origem}
      indice={indice}
    >
      {children}
    </Shell>
  );
}
