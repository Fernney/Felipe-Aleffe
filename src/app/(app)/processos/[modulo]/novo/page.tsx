import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FormularioProcesso } from "@/components/form-processo";
import { Cabecalho } from "@/components/ui";
import { exigirSessao } from "@/lib/auth";
import { carregarPainel } from "@/lib/data";
import { MODULOS, moduloValido } from "@/lib/domain/modulos";
import { opcoesVinculo } from "@/lib/vinculos";

export default async function NovoProcesso({ params, searchParams }: {
  params: Promise<{ modulo: string }>;
  searchParams: Promise<{ terreno?: string }>;
}) {
  const { modulo } = await params;
  if (!moduloValido(modulo)) notFound();
  const sessao = await exigirSessao();
  if (!sessao.podeEditar) redirect(`/processos/${modulo}`);
  const { terreno } = await searchParams;
  const { base } = await carregarPainel("todas");
  return (
    <>
      <Link href={`/processos/${modulo}`} className="btn-fantasma -ml-3 mb-2"><ArrowLeft className="h-4 w-4" /> {MODULOS[modulo].nome}</Link>
      <Cabecalho titulo={`Novo · ${MODULOS[modulo].nome}`} subtitulo={`Será gravado na lista “${MODULOS[modulo].lista}”.`} />
      <div className="cartao p-6">
        <FormularioProcesso
          modulo={modulo}
          terrenos={base.terrenos.map((t) => ({ id: t.id, nome: t.nome })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))}
          terrenoInicial={terreno ? Number(terreno) : null}
          vinculos={opcoesVinculo(base)}
          podeEditar
        />
      </div>
    </>
  );
}
