# 2 · Filtro de unidade, menu JOPE e entrada das telas novas

Todas as alterações são feitas no **Power Apps Studio**: selecione o controle na **Árvore** e troque a propriedade indicada. Onde estiver escrito **acrescente**, cole o trecho no fim da fórmula que já existe, depois de um `;`.

> Antes de começar: **Arquivo › Salvar como** uma cópia ("Central de Diligenciamento v2"). Assim o app atual continua funcionando até você publicar a nova versão.

---

## 2.1 · O filtro de concessionária define a paleta

**scrHome › cboConcessionaria › OnChange**: acrescente no fim:

```powerfx
;
Set(
    varUnidade,
    If(
        IsBlank(cboConcessionaria.Selected.Value), "",
        "INOVA" in Upper(cboConcessionaria.Selected.Value), "INOVA",
        "SAUDE"
    )
)
```

**scrHome › btnLimparFiltrosGlobal › OnSelect**: acrescente no fim:

```powerfx
;
Set(varUnidade, "")
```

**scrHome › OnVisible**: acrescente no **início** (antes de `Set(varMenuExpandido, true);`):

```powerfx
Set(varUnidadeTela, "");
```

**scrDetalheTerreno › OnVisible**: acrescente no fim. Ao abrir um terreno, a tela usa a paleta da unidade dele:

```powerfx
;
Set(
    varUnidadeTela,
    If(
        IsBlank(varTerrenoSelecionado.Concessionária.Value), "",
        "INOVA" in Upper(varTerrenoSelecionado.Concessionária.Value), "INOVA",
        "SAUDE"
    )
)
```

**App › OnStart**: acrescente no fim:

```powerfx
;
Set(varUnidade, "");
Set(varUnidadeTela, "");
Set(varMesAgenda, Date(Year(Today()), Month(Today()), 1))
```

## 2.2 · Menu e cabeçalho sempre na paleta JOPE

O menu e o cabeçalho são "geral/menu", então usam as cores `corJope*`, que não mudam com o filtro.

| Controle (em scrHome) | Propriedade | Novo valor |
|---|---|---|
| `galMenu › lblMenuFundo` | Fill | `If(ThisItem.Value = varMenuSelecionado, corJopeMenuAtivo, RGBA(0, 0, 0, 0))` |
| `galMenu › rectMenuAtivo` | Fill | `corJopeRoxoPreench` |
| `galMenu › Title6` | Color | `If(ThisItem.Value = varMenuSelecionado, corJopeRoxo, corTextoSecundario)` |
| `galMenu › hv_galMenu` | HoverFill | `corJopeHoverVeu` |
| `galMenu › hv_galMenu` | PressedFill | `corJopePressVeu` |
| `galMenu › hv_galMenu` | FocusedBorderColor | `corJopeRoxo` |
| `Grid3 › cabeçalho › Text3` | Color | `corJopeRoxo` |

## 2.3 · Novas opções no menu

**scrHome › galMenu › Items**:

```powerfx
["Início", "Terrenos", "Parcelamento do Solo", "Licenciamento", "Ambiental", "Baixa de Construção", "Fluxograma", "Agenda", "Risco"]
```

**scrHome › galMenu › Image5 › Image**: acrescente as duas opções antes do `)` final do `Switch`, usando imagens que já existem no app:

```powerfx
Switch(
    ThisItem.Value,
    "Início", Inicio,
    "Visão por unidade", visaopunidade,
    "Terrenos", Terrenos_1,
    "Parcelamento do Solo", 'parcelamento do solo',
    "Licenciamento", Licenciamento,
    "Ambiental", ambiental,
    "Baixa de Construção", 'baixa de construção',
    "Fluxograma", fluxograma,
    "Agenda", termo1,
    "Risco", visaopunidade
)
```

## 2.4 · Colar as telas novas

As "telas" do seu app são containers dentro de `scrHome` (`Tela_Inicio`, `Tela_Terrenos`…). As novas seguem o mesmo padrão:

1. Abra o arquivo `04-Tela_Agenda.yaml`, selecione tudo e copie.
2. No Studio, clique com o botão direito em **scrHome** na Árvore e escolha **Colar** (ou selecione scrHome e pressione Ctrl+V). O Studio reconhece o código YAML e cria o container `Tela_Agenda`.
3. Repita com `05-Tela_Risco.yaml`.
4. Na Árvore, arraste os dois containers para logo **acima** de `rectPainelFundo`. Assim os painéis de notificação, exportação e configuração continuam abrindo por cima deles.

Se o Studio mostrar algum erro de fórmula depois de colar, normalmente é por causa de um nome de coluna diferente na sua lista. O painel de erros indica a propriedade; me mande a mensagem que eu ajusto.

## 2.5 · Mostrar o risco no Início (opcional)

Na galeria de terrenos que você já tem no Início, dá para mostrar o índice de risco de cada um. Inclua um rótulo `ModernText` dentro do template com:

- **Text:** `With({r: LookUp(colRisco, Nome = ThisItem.Nome)}, r.Risco & " · " & r.Nivel)`
- **Fill:** `LookUp(tblRisco, Nivel = LookUp(colRisco, Nome = ThisItem.Nome).Nivel).Fundo`
- **Color:** `LookUp(tblRisco, Nivel = LookUp(colRisco, Nome = ThisItem.Nome).Nivel).Texto`

Troque `ThisItem.Nome` pelo campo que tem o nome do terreno na sua galeria.

## 2.6 · Desligar o envio de e-mail feito pelo app

Hoje o próprio app envia os alertas do dia quando alguém o abre (bloco **"// 7) Envio automático diário"** em `btnDashCarregar.OnSelect`). Quando o fluxo agendado do Power Automate estiver ativo (pasta `power-automate`), comente o `If(` desse bloco até o `)` final. Para isso, coloque `/*` antes do `If(` e `*/` depois do último `)`. Assim ninguém recebe e-mail em dobro. O botão manual **"Enviar por e-mail"** do painel de notificações continua funcionando.
