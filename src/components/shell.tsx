"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Bell, Bot, CalendarDays, FileBarChart2, GitBranch, Home, Layers, LogOut, MapPinned, Menu, Moon, Search, Sun, X,
} from "lucide-react";
import { definirFiltro, definirTema } from "@/app/(app)/acoes-gerais";
import type { FiltroUnidade } from "@/lib/domain/types";

const MENU = [
  { href: "/", rotulo: "Início", icone: Home },
  { href: "/terrenos", rotulo: "Terrenos", icone: MapPinned },
  { href: "/processos", rotulo: "Processos", icone: Layers },
  { href: "/fluxograma", rotulo: "Fluxograma", icone: GitBranch },
  { href: "/alertas", rotulo: "Alertas", icone: Bell },
  { href: "/agenda", rotulo: "Agenda de prazos", icone: CalendarDays },
  { href: "/relatorios", rotulo: "Relatórios & Power BI", icone: FileBarChart2 },
  { href: "/assistente", rotulo: "Assistente IA", icone: Bot },
];

export interface ItemBusca {
  titulo: string;
  sub: string;
  href: string;
  tipo: "Terreno" | "Processo" | "Página";
}

interface Props {
  usuario: { nome: string; perfil: string };
  filtro: FiltroUnidade;
  tema: "light" | "dark";
  alertasAltos: number;
  origem: "sharepoint" | "demo";
  indice: ItemBusca[];
  children: React.ReactNode;
}

export function Shell({ usuario, filtro, tema, alertasAltos, origem, indice, children }: Props) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);

  useEffect(() => setMenuAberto(false), [pathname]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscaAberta((v) => !v);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen">
      {/* Menu lateral — sempre na paleta JOPE */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-card transition-transform lg:translate-x-0 ${menuAberto ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/jope-logo.png" alt="JOPE ISB" className="h-10 w-auto dark:brightness-150" />
          </Link>
          <button className="lg:hidden" onClick={() => setMenuAberto(false)} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 pb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-jope-cinza">Central de Diligenciamento</div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {MENU.map(({ href, rotulo, icone: Icone }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                ativo(href) ? "bg-jope-roxo text-white shadow-sm" : "text-ink-soft hover:bg-jope-roxo/10 hover:text-jope-roxo"
              }`}
            >
              <Icone className="h-[18px] w-[18px]" />
              <span className="flex-1">{rotulo}</span>
              {href === "/alertas" && alertasAltos > 0 && (
                <span className={`rounded-full px-1.5 text-[11px] font-bold ${ativo(href) ? "bg-white text-jope-roxo" : "bg-[#B3261E] text-white"}`}>
                  {alertasAltos}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="m-3 rounded-xl bg-gradient-to-br from-jope-roxo via-jope-azul to-jope-agua p-[1px]">
          <div className="rounded-[11px] bg-card p-3">
            <div className="truncate text-sm font-bold">{usuario.nome}</div>
            <div className="text-xs text-ink-soft">Perfil: {usuario.perfil}</div>
            <div className="mt-1 text-[11px] text-ink-soft">
              Dados: {origem === "sharepoint" ? "SharePoint (ao vivo)" : "base de demonstração"}
            </div>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-fantasma mt-2 w-full justify-center px-2 py-1.5 text-xs">
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
      </aside>
      {menuAberto && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMenuAberto(false)} />}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-line bg-card/85 px-4 py-3 backdrop-blur md:px-8">
          <button className="lg:hidden" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => setBuscaAberta(true)}
            className="order-last flex w-full min-w-0 items-center gap-2 rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink-soft hover:border-jope-roxo sm:order-none sm:w-auto sm:flex-1 md:max-w-md"
          >
            <Search className="h-4 w-4" />
            <span className="truncate">Buscar terreno, processo, protocolo…</span>
            <kbd className="ml-auto hidden rounded border border-line px-1.5 text-[10px] md:inline">Ctrl K</kbd>
          </button>
          <FiltroUnidadeSeletor filtro={filtro} />
          <BotaoTema tema={tema} />
          <Link href="/alertas" className="relative rounded-xl p-2 text-ink-soft hover:bg-jope-roxo/10 hover:text-jope-roxo" aria-label="Alertas">
            <Bell className="h-5 w-5" />
            {alertasAltos > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#B3261E]" />}
          </Link>
        </header>

        {/* A área de conteúdo assume a paleta da unidade filtrada */}
        <main data-brand={filtro === "todas" ? undefined : filtro} className="flex-1 px-4 py-6 md:px-8">
          {filtro !== "todas" && (
            <div className="mb-5 h-1.5 rounded-full bg-gradient-to-r from-brand via-brand-2 to-brand-muted" />
          )}
          {children}
        </main>
      </div>

      {buscaAberta && <Busca indice={indice} onFechar={() => setBuscaAberta(false)} />}
    </div>
  );
}

function FiltroUnidadeSeletor({ filtro }: { filtro: FiltroUnidade }) {
  const [pendente, iniciar] = useTransition();
  const opcoes: { v: FiltroUnidade; rotulo: string; ativo: string }[] = [
    { v: "todas", rotulo: "Todas", ativo: "bg-jope-roxo text-white" },
    { v: "inova", rotulo: "INOVA BH", ativo: "bg-inova-escuro text-white" },
    { v: "saude", rotulo: "SAÚDE BH", ativo: "bg-saude-roxo text-white" },
  ];
  return (
    <div className={`ml-auto flex rounded-xl border border-line bg-bg p-1 text-xs font-bold sm:ml-0 ${pendente ? "opacity-60" : ""}`} role="radiogroup" aria-label="Unidade">
      {opcoes.map((o) => (
        <button
          key={o.v}
          role="radio"
          aria-checked={filtro === o.v}
          onClick={() => iniciar(() => definirFiltro(o.v))}
          className={`whitespace-nowrap rounded-lg px-2 py-1.5 transition sm:px-3 ${filtro === o.v ? o.ativo : "text-ink-soft hover:text-ink"}`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

function BotaoTema({ tema }: { tema: "light" | "dark" }) {
  const [, iniciar] = useTransition();
  const escuro = tema === "dark";
  return (
    <button
      onClick={() => {
        document.documentElement.dataset.theme = escuro ? "light" : "dark";
        iniciar(() => definirTema(escuro ? "light" : "dark"));
      }}
      className="rounded-xl p-2 text-ink-soft hover:bg-jope-roxo/10 hover:text-jope-roxo"
      aria-label={escuro ? "Tema claro" : "Tema escuro"}
    >
      {escuro ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

function semAcento(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function Busca({ indice, onFechar }: { indice: ItemBusca[]; onFechar: () => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const resultados = useMemo(() => {
    const termos = semAcento(q).split(/\s+/).filter(Boolean);
    const base = termos.length
      ? indice.filter((i) => {
          const alvo = semAcento(`${i.titulo} ${i.sub}`);
          return termos.every((t) => alvo.includes(t));
        })
      : indice.filter((i) => i.tipo === "Página");
    return base.slice(0, 12);
  }, [q, indice]);

  const abrir = (i: ItemBusca) => {
    onFechar();
    router.push(i.href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onClick={onFechar}>
      <div className="cartao w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="h-4 w-4 text-ink-soft" />
          <input
            ref={ref}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onFechar();
              if (e.key === "ArrowDown") setSel((s) => Math.min(s + 1, resultados.length - 1));
              if (e.key === "ArrowUp") setSel((s) => Math.max(s - 1, 0));
              if (e.key === "Enter" && resultados[sel]) abrir(resultados[sel]);
            }}
            placeholder="Digite nome do terreno, protocolo, módulo…"
            className="w-full bg-transparent py-3.5 text-sm outline-none"
          />
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {resultados.length === 0 && <li className="p-4 text-center text-sm text-ink-soft">Nada encontrado.</li>}
          {resultados.map((r, i) => (
            <li key={r.href + i}>
              <button
                onMouseEnter={() => setSel(i)}
                onClick={() => abrir(r)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${i === sel ? "bg-jope-roxo/10" : ""}`}
              >
                <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wide text-jope-roxo">{r.tipo}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{r.titulo}</span>
                  <span className="block truncate text-xs text-ink-soft">{r.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
