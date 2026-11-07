"use client";
import { useEffect } from "react";
export function Imprimir() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <button onClick={() => window.print()} className="btn-primario nao-imprimir fixed right-6 top-6">
      Imprimir / salvar PDF
    </button>
  );
}
