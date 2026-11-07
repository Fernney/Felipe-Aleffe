import { FileSpreadsheet, FileText } from "lucide-react";
import { Cabecalho, Secao } from "@/components/ui";
import { LISTA_MODULOS } from "@/lib/domain/modulos";
import { filtroAtual } from "@/lib/filtro";
import { RELATORIOS } from "@/lib/relatorios";
import { paleta } from "@/lib/tema";

export const metadata = { title: "Relatórios & Power BI" };

export default async function Relatorios() {
  const filtro = await filtroAtual();
  const m = `let
    Token = "COLE_AQUI_O_BI_API_TOKEN",
    Fonte = Json.Document(Web.Contents(
        "https://SEU-ENDERECO/api/bi/consolidado",
        [Query = [unidade = "todas"], Headers = [Authorization = "Bearer " & Token]]
    )),
    Tabela = Table.FromRecords(Fonte)
in
    Tabela`;

  return (
    <>
      <Cabecalho
        titulo="Relatórios & Power BI"
        subtitulo={<>Exportações já calculadas (status, risco, previsões e alertas) · recorte atual: <b>{paleta(filtro).nome}</b></>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {RELATORIOS.map((r) => (
          <div key={r.id} className="cartao flex flex-col p-5">
            <div className="font-bold">{r.titulo}</div>
            <p className="mt-1 flex-1 text-sm text-ink-soft">{r.descricao}</p>
            <div className="mt-4 flex gap-2">
              <a href={`/api/exportar/${r.id}?formato=xlsx`} className="btn-primario"><FileSpreadsheet className="h-4 w-4" /> Excel</a>
              <a href={`/api/exportar/${r.id}?formato=csv`} className="btn-contorno"><FileText className="h-4 w-4" /> CSV</a>
            </div>
          </div>
        ))}
      </div>

      <Secao titulo="Por módulo" className="mt-6">
        <div className="flex flex-wrap gap-2">
          {LISTA_MODULOS.map((d) => (
            <a key={d.id} href={`/api/exportar/modulo?modulo=${d.id}&formato=xlsx`} className="btn-contorno text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5" /> {d.nome}
            </a>
          ))}
        </div>
      </Secao>

      <Secao titulo="Conectar o Power BI" className="mt-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 text-sm">
            <p>Há duas formas de alimentar os relatórios automáticos:</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <b>Continuar lendo as listas do SharePoint</b> — nada muda: este sistema grava nas mesmas listas que o Power Apps usava.
              </li>
              <li>
                <b>Usar a API de dados deste sistema</b> (recomendado) — o Power BI recebe as tabelas já tratadas: status normalizado, índice de risco,
                previsão de conclusão, processos a abrir, conflitos do fluxograma e alertas. Isso elimina as fórmulas DAX/Power Query que repetiam essas regras.
              </li>
            </ol>
            <p className="font-semibold">Datasets disponíveis em <code className="rounded bg-bg px-1">/api/bi/&lt;dataset&gt;</code>:</p>
            <ul className="flex flex-wrap gap-1.5">
              {[...RELATORIOS.map((r) => r.id), "modulo?modulo=gelin"].map((d) => (
                <li key={d}><code className="rounded bg-brand/10 px-1.5 py-0.5 text-xs font-semibold text-brand">{d}</code></li>
              ))}
            </ul>
            <p className="text-xs text-ink-soft">
              Parâmetros: <code>unidade=todas|inova|saude</code> e <code>formato=json|csv</code>. A autenticação é pelo cabeçalho
              <code> Authorization: Bearer</code> com o valor de <code>BI_API_TOKEN</code>. No serviço do Power BI, a atualização agendada funciona com a fonte “Web” usando
              autenticação anônima + cabeçalho.
            </p>
          </div>
          <div>
            <div className="rotulo">Power Query (M) — Obter dados › Consulta nula › Editor avançado</div>
            <pre className="overflow-x-auto rounded-xl bg-[#1F1C24] p-4 text-xs leading-relaxed text-[#ECEAF1]">{m}</pre>
          </div>
        </div>
      </Secao>
    </>
  );
}
