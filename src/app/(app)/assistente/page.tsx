import { Cabecalho } from "@/components/ui";
import { Chat } from "./chat";

export const metadata = { title: "Assistente IA" };

export default function Assistente() {
  return (
    <>
      <Cabecalho
        titulo="Assistente IA"
        subtitulo={`Pergunte em linguagem natural sobre terrenos, prazos, riscos e processos. ${process.env.ANTHROPIC_API_KEY ? "Respostas geradas pelo Claude com base nos dados atuais." : "Modo local ativo (configure ANTHROPIC_API_KEY para respostas livres com IA)."}`}
      />
      <Chat />
    </>
  );
}
