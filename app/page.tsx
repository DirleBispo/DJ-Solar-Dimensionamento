"use client";

import { useEffect, useMemo, useState } from "react";
import { INVERSORES_BRASIL, MODULOS_BRASIL } from "@/lib/equipment-catalog";

type Tab = "visao" | "projetos" | "diagrama" | "clientes" | "equipamentos";
type EquipmentTab = "modulo" | "inversor";
type Cliente = { id: string; nome: string; cidade: string; telefone: string };
type Projeto = { id: string; nome: string; cliente: string; potenciaKwp: number; modulos: number; status: string };

const fmt = (n: number, casas = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const num = (v: string, fallback = 0) => { const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) ? n : fallback; };
const unicos = (valores: string[]) => [...new Set(valores)].sort((a,b)=>a.localeCompare(b,"pt-BR"));

export default function Home() {
  const [tab, setTab] = useState<Tab>("visao");
  const [equipTab, setEquipTab] = useState<EquipmentTab>("modulo");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [nomeCliente, setNomeCliente] = useState("");
  const [cidadeCliente, setCidadeCliente] = useState("Sorocaba/SP");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [clienteProjeto, setClienteProjeto] = useState("");
  const [consumo, setConsumo] = useState("600");
  const [hsp, setHsp] = useState("5");
  const [perdas, setPerdas] = useState("20");
  const [potenciaModulo, setPotenciaModulo] = useState(String(MODULOS_BRASIL[0]?.potenciaWp ?? 550));
  const [modulosString, setModulosString] = useState("8");
  const [strings, setStrings] = useState("1");
  const [voc, setVoc] = useState(String(MODULOS_BRASIL[0]?.vocV ?? 49.9));
  const [vmp, setVmp] = useState(String(MODULOS_BRASIL[0]?.vmpV ?? 41.8));
  const [imp, setImp] = useState(String(MODULOS_BRASIL[0]?.impA ?? 13.16));
  const [coefVoc, setCoefVoc] = useState(String(MODULOS_BRASIL[0]?.coefVocPctC ?? -0.25));
  const [tempMin, setTempMin] = useState("5");
  const [tensaoRede, setTensaoRede] = useState("220");
  const [distribuidora, setDistribuidora] = useState("CPFL Piratininga");
  const [responsavel, setResponsavel] = useState("");
  const [busca, setBusca] = useState("");
  const [fabricanteModulo, setFabricanteModulo] = useState(MODULOS_BRASIL[0]?.fabricante ?? "");
  const [moduloId, setModuloId] = useState(MODULOS_BRASIL[0]?.id ?? "");
  const [fabricanteInversor, setFabricanteInversor] = useState(INVERSORES_BRASIL[0]?.fabricante ?? "");
  const [inversorId, setInversorId] = useState(INVERSORES_BRASIL[0]?.id ?? "");

  useEffect(() => {
    try {
      const c = localStorage.getItem("djsolar-clientes");
      const p = localStorage.getItem("djsolar-projetos");
      if (c) setClientes(JSON.parse(c));
      if (p) setProjetos(JSON.parse(p));
    } catch {}
  }, []);

  const moduloSelecionado = MODULOS_BRASIL.find(x=>x.id===moduloId) ?? MODULOS_BRASIL[0];
  const inversorSelecionado = INVERSORES_BRASIL.find(x=>x.id===inversorId) ?? INVERSORES_BRASIL[0];
  const fabricantesModulos = useMemo(()=>unicos(MODULOS_BRASIL.map(x=>x.fabricante)),[]);
  const fabricantesInversores = useMemo(()=>unicos(INVERSORES_BRASIL.map(x=>x.fabricante)),[]);
  const modelosModulo = MODULOS_BRASIL.filter(x=>x.fabricante===fabricanteModulo);
  const modelosInversor = INVERSORES_BRASIL.filter(x=>x.fabricante===fabricanteInversor);
  const termo = busca.trim().toLowerCase();
  const resultadosBusca = termo ? (equipTab === "modulo" ? MODULOS_BRASIL.filter(x=>`${x.fabricante} ${x.modelo} ${x.linha}`.toLowerCase().includes(termo)).length : INVERSORES_BRASIL.filter(x=>`${x.fabricante} ${x.modelo} ${x.linha} ${x.tipo}`.toLowerCase().includes(termo)).length) : (equipTab === "modulo" ? MODULOS_BRASIL.length : INVERSORES_BRASIL.length);

  const calculo = useMemo(() => {
    const consumoKwh = Math.max(1, num(consumo, 600));
    const sol = Math.max(0.1, num(hsp, 5));
    const pr = Math.max(0.4, 1 - Math.min(60, Math.max(0, num(perdas, 20))) / 100);
    const moduloW = Math.max(1, num(potenciaModulo, 550));
    const kwp = (consumoKwh / 30) / (sol * pr);
    const qtd = Math.ceil((kwp * 1000) / moduloW);
    const instalada = (qtd * moduloW) / 1000;
    const geracao = instalada * sol * 30 * pr;
    return { kwp, qtd, instalada, geracao };
  }, [consumo, hsp, perdas, potenciaModulo]);

  const validacao = useMemo(() => {
    const nString = Math.max(1, Math.round(num(modulosString, 8)));
    const nStrings = Math.max(1, Math.round(num(strings, 1)));
    const vocStc = Math.max(0, num(voc, 49.9));
    const vmpStc = Math.max(0, num(vmp, 41.8));
    const corrente = Math.max(0, num(imp, 13.16)) * nStrings;
    const beta = Math.abs(num(coefVoc, -0.25)) / 100;
    const frio = Math.max(0, 25 - num(tempMin, 5));
    const vocCorrigida = vocStc * (1 + beta * frio);
    const tensaoVocString = vocCorrigida * nString;
    const tensaoVmpString = vmpStc * nString;
    const potenciaDc = nString * nStrings * Math.max(0, num(potenciaModulo, 550)) / 1000;
    const inv = inversorSelecionado;
    const okTensao = !!inv && tensaoVocString < inv.tensaoDcMaxV && tensaoVmpString >= inv.mpptMinV && tensaoVmpString <= inv.mpptMaxV;
    const okCorrente = !!inv && corrente <= inv.correnteMaxMpptA;
    const okPotencia = !inv?.potenciaPvRecomendadaKw || potenciaDc <= inv.potenciaPvRecomendadaKw;
    return { nString, nStrings, vocCorrigida, tensaoVocString, tensaoVmpString, corrente, potenciaDc, ok: okTensao && okCorrente && okPotencia, okTensao, okCorrente, okPotencia };
  }, [modulosString, strings, voc, vmp, imp, coefVoc, tempMin, potenciaModulo, inversorSelecionado]);

  const aplicarModulo = () => {
    if (!moduloSelecionado) return;
    setPotenciaModulo(String(moduloSelecionado.potenciaWp));
    setVoc(String(moduloSelecionado.vocV));
    setVmp(String(moduloSelecionado.vmpV));
    setImp(String(moduloSelecionado.impA));
    setCoefVoc(String(moduloSelecionado.coefVocPctC));
    setTab("projetos");
  };
  const aplicarInversor = () => setTab("projetos");

  const trocarFabricanteModulo = (fabricante:string) => {
    setFabricanteModulo(fabricante);
    const primeiro = MODULOS_BRASIL.find(x=>x.fabricante===fabricante);
    if (primeiro) setModuloId(primeiro.id);
  };
  const trocarFabricanteInversor = (fabricante:string) => {
    setFabricanteInversor(fabricante);
    const primeiro = INVERSORES_BRASIL.find(x=>x.fabricante===fabricante);
    if (primeiro) setInversorId(primeiro.id);
  };

  const salvarCliente = () => {
    if (!nomeCliente.trim()) return;
    const novo = { id: crypto.randomUUID(), nome: nomeCliente.trim(), cidade: cidadeCliente.trim(), telefone: telefoneCliente.trim() };
    const lista = [novo, ...clientes];
    setClientes(lista);
    localStorage.setItem("djsolar-clientes", JSON.stringify(lista));
    setNomeCliente(""); setTelefoneCliente("");
  };

  const salvarProjeto = () => {
    const novo: Projeto = { id: crypto.randomUUID(), nome: `Projeto ${projetos.length + 1}`, cliente: clienteProjeto || "Sem cliente", potenciaKwp: calculo.instalada, modulos: calculo.qtd, status: validacao.ok ? "Compatível" : "Revisar" };
    const lista = [novo, ...projetos]; setProjetos(lista); localStorage.setItem("djsolar-projetos", JSON.stringify(lista));
  };

  return (
    <main className="app">
      <header className="header">
        <img className="logo" src="/logo-dj-solar.jpg" alt="DJ Solar Engenharia" />
        <h1>{tab === "visao" ? "Visão geral" : tab === "projetos" ? "Projetos" : tab === "diagrama" ? "Diagrama" : tab === "clientes" ? "Clientes" : "Equipamentos"}</h1>
        <div className="avatar">DB</div>
      </header>

      <section className="main-content">
        {tab === "visao" && <>
          <section className="hero-card"><span>ENERGIA QUE GERA RESULTADOS</span><h2>Dimensione com precisão.<br/><b>Venda com confiança.</b></h2><p>Projetos fotovoltaicos profissionais, da análise de consumo à proposta comercial.</p><button className="cta amber" onClick={() => setTab("projetos")}>＋ Novo dimensionamento</button><button className="cta light" onClick={() => setTab("clientes")}>Cadastrar cliente</button></section>
          <div className="stats-grid"><Stat label="Clientes" value={String(clientes.length)} detail="Cadastrados" icon="♙"/><Stat label="Projetos" value={String(projetos.length)} detail="Em andamento" icon="☀"/><Stat label="Potência" value={`${fmt(projetos.reduce((s,p)=>s+p.potenciaKwp,0),1)} kWp`} detail="Dimensionada" icon="ϟ"/><Stat label="Equipamentos" value={String(MODULOS_BRASIL.length + INVERSORES_BRASIL.length)} detail="No catálogo" icon="▤"/></div>
        </>}

        {tab === "equipamentos" && <>
          <input className="search" value={busca} onChange={(e)=>setBusca(e.target.value)} placeholder="⌕  Pesquisar fabricante, modelo ou linha..." />
          <div className="title-row"><div><span className="tag">CATÁLOGO TÉCNICO</span><h2>Buscar equipamento pelo modelo</h2><p>Escolha o componente para preencher automaticamente os dados técnicos.</p></div><span className="source-badge">FONTE DO<br/>FABRICANTE</span></div>
          <section className="card equipment-picker">
            <div className="segmented"><button className={equipTab === "modulo" ? "selected" : ""} onClick={()=>setEquipTab("modulo")}>▥ Placa solar</button><button className={equipTab === "inversor" ? "selected" : ""} onClick={()=>setEquipTab("inversor")}>⌁ Inversor</button></div>
            {equipTab === "modulo" ? <>
              <Field label="Fabricante"><select value={fabricanteModulo} onChange={e=>trocarFabricanteModulo(e.target.value)}>{fabricantesModulos.map(f=><option key={f}>{f}</option>)}</select></Field>
              <Field label="Modelo"><select value={moduloId} onChange={e=>setModuloId(e.target.value)}>{modelosModulo.map(m=><option value={m.id} key={m.id}>{m.modelo}</option>)}</select></Field>
            </> : <>
              <Field label="Fabricante"><select value={fabricanteInversor} onChange={e=>trocarFabricanteInversor(e.target.value)}>{fabricantesInversores.map(f=><option key={f}>{f}</option>)}</select></Field>
              <Field label="Modelo"><select value={inversorId} onChange={e=>setInversorId(e.target.value)}>{modelosInversor.map(i=><option value={i.id} key={i.id}>{i.modelo}</option>)}</select></Field>
            </>}
            <div className="soft-note">{resultadosBusca} equipamento(s) correspondente(s). Novos fabricantes e modelos podem ser adicionados sem mudar esta interface.</div>
          </section>

          {equipTab === "modulo" && moduloSelecionado ? <section className="card catalog-card accent">
            <div className="card-top"><span>MÓDULO</span><span className="tag">PRÉ-CADASTRADO</span></div><h2>{moduloSelecionado.fabricante}</h2><p className="model">{moduloSelecionado.modelo}</p>
            <div className="spec-grid"><Spec label="Potência" value={`${moduloSelecionado.potenciaWp} Wp`}/><Spec label="Tecnologia" value={moduloSelecionado.tecnologia}/><Spec label="Voc" value={`${moduloSelecionado.vocV} V`}/><Spec label="Vmp" value={`${moduloSelecionado.vmpV} V`}/><Spec label="Isc" value={`${moduloSelecionado.iscA} A`}/><Spec label="Imp" value={`${moduloSelecionado.impA} A`}/><Spec label="Dimensões" value={`${moduloSelecionado.alturaM} × ${moduloSelecionado.larguraM} m`}/><Spec label="Linha" value={moduloSelecionado.linha}/></div>
            <p className="official">Fonte: {moduloSelecionado.fonte}</p><button className="green-btn" onClick={aplicarModulo}>Usar este módulo no projeto →</button>
          </section> : null}

          {equipTab === "inversor" && inversorSelecionado ? <section className="card catalog-card accent">
            <div className="card-top"><span>INVERSOR</span><span className="tag">PRÉ-CADASTRADO</span></div><h2>{inversorSelecionado.fabricante}</h2><p className="model">{inversorSelecionado.modelo}</p>
            <div className="spec-grid"><Spec label="Potência CA" value={`${inversorSelecionado.potenciaAcKw} kW`}/><Spec label="Tipo" value={inversorSelecionado.tipo}/><Spec label="Fase" value={inversorSelecionado.fase}/><Spec label="Tensão CC máx." value={`${inversorSelecionado.tensaoDcMaxV} V`}/><Spec label="Faixa MPPT" value={`${inversorSelecionado.mpptMinV}–${inversorSelecionado.mpptMaxV} V`}/><Spec label="Corrente/MPPT" value={`${inversorSelecionado.correnteMaxMpptA} A`}/><Spec label="Rastreadores" value={`${inversorSelecionado.quantidadeMppt} MPPT`}/><Spec label="Linha" value={inversorSelecionado.linha}/></div>
            <p className="official">Fonte: {inversorSelecionado.fonte}</p><button className="green-btn" onClick={aplicarInversor}>Usar este inversor no projeto →</button>
          </section> : null}
        </>}

        {tab === "clientes" && <><div className="title-row"><div><span className="tag">RELACIONAMENTO</span><h2>Cadastro de clientes</h2><p>Organize os dados comerciais antes de iniciar o dimensionamento.</p></div></div><section className="card"><Field label="Nome / empresa"><input value={nomeCliente} onChange={(e)=>setNomeCliente(e.target.value)} placeholder="Nome do cliente" /></Field><div className="two"><Field label="Cidade / UF"><input value={cidadeCliente} onChange={(e)=>setCidadeCliente(e.target.value)} /></Field><Field label="Telefone"><input value={telefoneCliente} onChange={(e)=>setTelefoneCliente(e.target.value)} /></Field></div><button className="green-btn" onClick={salvarCliente}>Salvar cliente</button></section><section className="card"><h3>Clientes cadastrados</h3>{clientes.length===0?<p className="muted">Nenhum cliente cadastrado.</p>:clientes.map(c=><div className="list" key={c.id}><div><b>{c.nome}</b><span>{c.cidade}</span></div><span>{c.telefone}</span></div>)}</section></>}

        {tab === "projetos" && <><div className="title-row"><div><span className="tag">ETAPA 1 • DIMENSIONAMENTO</span><h2>Novo projeto fotovoltaico</h2><p>Informe o consumo e valide o sistema antes de avançar para o projeto elétrico.</p></div></div><section className="card"><Field label="Cliente"><select value={clienteProjeto} onChange={(e)=>setClienteProjeto(e.target.value)}><option value="">Sem cliente vinculado</option>{clientes.map(c=><option key={c.id}>{c.nome}</option>)}</select></Field><div className="two"><Field label="Consumo médio (kWh/mês)"><input value={consumo} onChange={(e)=>setConsumo(e.target.value)} /></Field><Field label="Horas de sol pico"><input value={hsp} onChange={(e)=>setHsp(e.target.value)} /></Field></div><div className="two"><Field label="Perdas do sistema (%)"><input value={perdas} onChange={(e)=>setPerdas(e.target.value)} /></Field><Field label="Potência do módulo (W)"><input value={potenciaModulo} onChange={(e)=>setPotenciaModulo(e.target.value)} /></Field></div><div className="result-grid"><Spec label="Potência necessária" value={`${fmt(calculo.kwp,2)} kWp`}/><Spec label="Módulos" value={String(calculo.qtd)}/><Spec label="Potência instalada" value={`${fmt(calculo.instalada,2)} kWp`}/><Spec label="Geração estimada" value={`${fmt(calculo.geracao,0)} kWh/mês`}/></div></section>
          <div className="title-row compatibility-title"><div><span className="tag">ETAPA 2 • VALIDAÇÃO ELÉTRICA</span><h2>Compatibilidade<br/>módulo × inversor</h2><p>{moduloSelecionado?.fabricante} {moduloSelecionado?.modelo} × {inversorSelecionado?.fabricante} {inversorSelecionado?.modelo}</p></div><span className={`compat-badge ${validacao.ok?"ok":"warn"}`}>{validacao.ok?"✓ CONFIGURAÇÃO COMPATÍVEL":"! REVISAR CONFIGURAÇÃO"}</span></div>
          <section className="card"><h3>▥ Dados do módulo e string</h3><Field label="Módulos/string"><input value={modulosString} onChange={(e)=>setModulosString(e.target.value)} /></Field><Field label="Nº de strings"><input value={strings} onChange={(e)=>setStrings(e.target.value)} /></Field><Field label="Potência (W)"><input value={potenciaModulo} onChange={(e)=>setPotenciaModulo(e.target.value)} /></Field><div className="two"><Field label="Voc (V)"><input value={voc} onChange={(e)=>setVoc(e.target.value)} /></Field><Field label="Vmp (V)"><input value={vmp} onChange={(e)=>setVmp(e.target.value)} /></Field></div><div className="two"><Field label="Imp (A)"><input value={imp} onChange={(e)=>setImp(e.target.value)} /></Field><Field label="Coef. Voc (%/°C)"><input value={coefVoc} onChange={(e)=>setCoefVoc(e.target.value)} /></Field></div><Field label="Temperatura mínima (°C)"><input value={tempMin} onChange={(e)=>setTempMin(e.target.value)} /></Field><div className="result-grid"><Spec label="Voc corrigida/módulo" value={`${fmt(validacao.vocCorrigida,1)} V`}/><Spec label="Voc/string" value={`${fmt(validacao.tensaoVocString,0)} V`}/><Spec label="Vmp/string" value={`${fmt(validacao.tensaoVmpString,0)} V`}/><Spec label="Corrente MPPT" value={`${fmt(validacao.corrente,1)} A`}/><Spec label="Potência CC" value={`${fmt(validacao.potenciaDc,2)} kWp`}/></div><div className={`validation ${validacao.ok?"good":"bad"}`}>{validacao.ok?"Configuração dentro dos limites informados do inversor selecionado.":`${!validacao.okTensao?"Verifique as tensões da string. ":""}${!validacao.okCorrente?`Corrente por MPPT acima de ${inversorSelecionado?.correnteMaxMpptA ?? "—"} A. `:""}${!validacao.okPotencia?"Potência CC acima da recomendada do fabricante.":""}`}</div><button className="green-btn" onClick={salvarProjeto}>Salvar projeto</button></section>{projetos.length>0 && <section className="card"><h3>Projetos salvos</h3>{projetos.map(p=><div className="list" key={p.id}><div><b>{p.nome}</b><span>{p.cliente} • {p.modulos} módulos</span></div><span>{fmt(p.potenciaKwp,2)} kWp • {p.status}</span></div>)}</section>}</>}

        {tab === "diagrama" && <><div className="title-row"><div><span className="tag">PROJETO ELÉTRICO</span><h2>Diagrama unifilar fotovoltaico</h2><p>Monte os dados básicos da conexão para a documentação técnica.</p></div></div><section className="card"><Field label="Distribuidora"><input value={distribuidora} onChange={(e)=>setDistribuidora(e.target.value)} /></Field><div className="two"><Field label="Tensão de conexão (V)"><input value={tensaoRede} onChange={(e)=>setTensaoRede(e.target.value)} /></Field><Field label="Responsável técnico"><input value={responsavel} onChange={(e)=>setResponsavel(e.target.value)} placeholder="Nome do responsável" /></Field></div></section><section className="diagram-card"><div className="diagram-line"><DiagramBox title="Módulos FV" detail={`${validacao.nString} módulos/string • ${validacao.nStrings} string(s)`}/><span>→</span><DiagramBox title="Inversor" detail={`${inversorSelecionado?.fabricante ?? ""} ${inversorSelecionado?.modelo ?? ""}`}/><span>→</span><DiagramBox title="Quadro CA" detail={`${tensaoRede} V`}/><span>→</span><DiagramBox title="Rede" detail={distribuidora}/></div><p>Diagrama preliminar. Proteções, seções de cabos, DPS, disjuntores e requisitos da distribuidora serão detalhados na etapa elétrica.</p></section></>}
      </section>

      <nav className="bottom-nav"><Nav active={tab==="visao"} icon="▦" label="Visão" onClick={()=>setTab("visao")}/><Nav active={tab==="projetos"} icon="☀" label="Projetos" onClick={()=>setTab("projetos")}/><Nav active={tab==="diagrama"} icon="⌁" label="Diagrama" onClick={()=>setTab("diagrama")}/><Nav active={tab==="clientes"} icon="♙" label="Clientes" onClick={()=>setTab("clientes")}/><Nav active={tab==="equipamentos"} icon="▤" label="Equipamentos" onClick={()=>setTab("equipamentos")}/></nav>
    </main>
  );
}

function Field({label, children}:{label:string;children:React.ReactNode}) { return <label className="field"><span>{label}</span>{children}</label>; }
function Stat({label,value,detail,icon}:{label:string;value:string;detail:string;icon:string}) { return <article className="stat"><div className="stat-icon">{icon}</div><div><span>{label}</span><b>{value}</b><small>{detail}</small></div></article>; }
function Spec({label,value}:{label:string;value:string}) { return <div className="spec"><span>{label}</span><b>{value}</b></div>; }
function Nav({active,icon,label,onClick}:{active:boolean;icon:string;label:string;onClick:()=>void}) { return <button className={active?"active":""} onClick={onClick}><span>{icon}</span><small>{label}</small></button>; }
function DiagramBox({title,detail}:{title:string;detail:string}) { return <div className="diagram-box"><b>{title}</b><span>{detail}</span></div>; }
