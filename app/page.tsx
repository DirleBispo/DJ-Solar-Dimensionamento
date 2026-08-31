"use client";

import { useEffect, useMemo, useState } from "react";
import {
  InverterSpec,
  ModuleSpec,
  analisarFinanceiro,
  dimensionarSistema,
  dimensionarTelhado,
  estimarMateriais,
  mediaConsumo,
  verificarCompatibilidade,
} from "@/lib/solar-calculations";

type Tab = "dashboard" | "projetos" | "clientes" | "equipamentos";
type Cliente = { id: string; nome: string; cidade: string; telefone: string };
type ProjetoSalvo = {
  id: string;
  nome: string;
  cliente: string;
  consumo: number;
  potenciaKwp: number;
  modulos: number;
  telhado: number;
  status: string;
  atualizadoEm: string;
};

const MODULOS: ModuleSpec[] = [
  {
    id: "astronergy-n7-610",
    fabricante: "Astronergy",
    modelo: "ASTRO N7 610 W",
    potenciaWp: 610,
    larguraM: 1.134,
    alturaM: 2.382,
    vocV: 48.74,
    vmpV: 41.31,
    iscA: 15.94,
    impA: 14.77,
    coefVocPctC: -0.25,
    coefVmpPctC: -0.29,
  },
];

const INVERSORES: InverterSpec[] = [
  {
    id: "huawei-sun2000-6ktl-l1",
    fabricante: "Huawei",
    modelo: "SUN2000-6KTL-L1",
    potenciaAcKw: 6,
    potenciaPvRecomendadaKw: 9,
    tensaoDcMaxV: 600,
    mpptMinV: 90,
    mpptMaxV: 530,
    correnteMaxMpptA: 13.5,
    quantidadeMppt: 2,
  },
];

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const n = (valor: string, fallback = 0) => {
  const x = Number(String(valor).replace(",", "."));
  return Number.isFinite(x) ? x : fallback;
};

function salvarLocal<T>(chave: string, valor: T) {
  if (typeof window !== "undefined") localStorage.setItem(chave, JSON.stringify(valor));
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<ProjetoSalvo[]>([]);
  const [mensagem, setMensagem] = useState("");

  const [clienteNome, setClienteNome] = useState("");
  const [clienteCidade, setClienteCidade] = useState("Sorocaba/SP");
  const [clienteTelefone, setClienteTelefone] = useState("");

  const [nomeProjeto, setNomeProjeto] = useState("Projeto residencial");
  const [clienteProjeto, setClienteProjeto] = useState("");
  const [modoConsumo, setModoConsumo] = useState<"medio" | "12meses">("12meses");
  const [consumoMedio, setConsumoMedio] = useState("600");
  const [consumos, setConsumos] = useState<string[]>(Array(12).fill("600"));
  const [ligacao, setLigacao] = useState("monofasica");
  const [hsp, setHsp] = useState("5.0");
  const [perdas, setPerdas] = useState("20");
  const [compensacao, setCompensacao] = useState("100");
  const [moduloId, setModuloId] = useState(MODULOS[0].id);
  const [inversorId, setInversorId] = useState(INVERSORES[0].id);
  const [tempMin, setTempMin] = useState("5");
  const [tempCelulaMax, setTempCelulaMax] = useState("70");
  const [stringsMppt, setStringsMppt] = useState("1");

  const [telhadoComprimento, setTelhadoComprimento] = useState("7.5");
  const [telhadoLargura, setTelhadoLargura] = useState("3.5");
  const [recuo, setRecuo] = useState("0.15");
  const [obstaculos, setObstaculos] = useState("0");
  const [espacamento, setEspacamento] = useState("0.02");
  const [orientacao, setOrientacao] = useState<"vertical" | "horizontal">("vertical");
  const [azimute, setAzimute] = useState("0");
  const [inclinacao, setInclinacao] = useState("15");
  const [distanciaInversor, setDistanciaInversor] = useState("15");

  const [tarifa, setTarifa] = useState("0.95");
  const [investimento, setInvestimento] = useState("15000");

  useEffect(() => {
    try {
      const c = localStorage.getItem("djsolar-clientes");
      const p = localStorage.getItem("djsolar-projetos");
      if (c) setClientes(JSON.parse(c));
      if (p) setProjetos(JSON.parse(p));
    } catch {}
  }, []);

  const modulo = MODULOS.find((x) => x.id === moduloId) ?? MODULOS[0];
  const inversor = INVERSORES.find((x) => x.id === inversorId) ?? INVERSORES[0];
  const consumoCalculado = modoConsumo === "medio" ? Math.max(0, n(consumoMedio)) : mediaConsumo(consumos.map((x) => Math.max(0, n(x))));

  const resultado = useMemo(() => dimensionarSistema({
    consumoMensalKwh: consumoCalculado || 1,
    horasSolPico: Math.max(0.1, n(hsp, 5)),
    perdasPct: Math.max(0, n(perdas, 20)),
    compensacaoPct: Math.max(1, n(compensacao, 100)),
    potenciaModuloWp: modulo.potenciaWp,
    areaModuloM2: modulo.larguraM * modulo.alturaM,
  }), [consumoCalculado, hsp, perdas, compensacao, modulo]);

  const compatibilidade = useMemo(() => verificarCompatibilidade({
    modulo,
    inversor,
    quantidadeModulos: resultado.quantidadeModulos,
    temperaturaMinC: n(tempMin, 5),
    temperaturaCelulaMaxC: n(tempCelulaMax, 70),
    stringsPorMppt: Math.max(1, Math.round(n(stringsMppt, 1))),
  }), [modulo, inversor, resultado.quantidadeModulos, tempMin, tempCelulaMax, stringsMppt]);

  const telhado = useMemo(() => dimensionarTelhado({
    comprimentoM: Math.max(0, n(telhadoComprimento)),
    larguraM: Math.max(0, n(telhadoLargura)),
    recuoM: Math.max(0, n(recuo)),
    obstaculosM2: Math.max(0, n(obstaculos)),
    espacamentoM: Math.max(0, n(espacamento)),
    orientacaoModulo: orientacao,
    modulo,
  }), [telhadoComprimento, telhadoLargura, recuo, obstaculos, espacamento, orientacao, modulo]);

  const quantidadeAplicada = Math.min(resultado.quantidadeModulos, telhado.capacidadeFinal || 0);
  const materiais = useMemo(() => estimarMateriais(quantidadeAplicada, telhado.colunas, telhado.linhas, n(distanciaInversor, 15)), [quantidadeAplicada, telhado, distanciaInversor]);
  const financeiro = useMemo(() => analisarFinanceiro({ geracaoMensalKwh: resultado.geracaoMensalEstimadaKwh, tarifaKwh: n(tarifa, .95), investimento: n(investimento, 15000) }), [resultado.geracaoMensalEstimadaKwh, tarifa, investimento]);
  const cabeNoTelhado = telhado.capacidadeFinal >= resultado.quantidadeModulos;

  const adicionarCliente = () => {
    if (!clienteNome.trim()) return setMensagem("Informe o nome do cliente.");
    const novo = { id: crypto.randomUUID(), nome: clienteNome.trim(), cidade: clienteCidade.trim(), telefone: clienteTelefone.trim() };
    const lista = [novo, ...clientes];
    setClientes(lista); salvarLocal("djsolar-clientes", lista); setClienteNome(""); setClienteTelefone(""); setMensagem("Cliente salvo.");
  };

  const salvarProjeto = () => {
    const novo: ProjetoSalvo = {
      id: crypto.randomUUID(), nome: nomeProjeto.trim() || "Projeto sem nome", cliente: clienteProjeto || "Sem cliente",
      consumo: consumoCalculado, potenciaKwp: resultado.potenciaInstaladaKwp, modulos: resultado.quantidadeModulos,
      telhado: telhado.capacidadeFinal,
      status: !cabeNoTelhado ? "Telhado insuficiente" : compatibilidade.status === "ok" ? "Compatível" : compatibilidade.status === "atencao" ? "Revisar" : "Incompatível",
      atualizadoEm: new Date().toLocaleDateString("pt-BR"),
    };
    const lista = [novo, ...projetos]; setProjetos(lista); salvarLocal("djsolar-projetos", lista); setMensagem("Projeto salvo no navegador. A etapa seguinte é religar o Supabase.");
  };

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">DJ</div><div><strong>DJ Solar</strong><span>Engenharia</span></div></div>
      <nav>
        <button className={tab === "dashboard" ? "nav-active" : ""} onClick={() => setTab("dashboard")}>Dashboard</button>
        <button className={tab === "projetos" ? "nav-active" : ""} onClick={() => setTab("projetos")}>Projetos</button>
        <button className={tab === "clientes" ? "nav-active" : ""} onClick={() => setTab("clientes")}>Clientes</button>
        <button className={tab === "equipamentos" ? "nav-active" : ""} onClick={() => setTab("equipamentos")}>Equipamentos</button>
      </nav>
      <div className="side-note"><span className="dot" />Reconstrução avançada ativa</div>
    </aside>

    <section className="content">
      <header className="topbar"><div><span className="eyebrow">DJ SOLAR ENGENHARIA</span><h1>{tab === "dashboard" ? "Painel profissional" : tab === "projetos" ? "Projeto fotovoltaico" : tab === "clientes" ? "Clientes" : "Equipamentos"}</h1></div><span className="version-badge">Continuidade do projeto antigo</span></header>
      {mensagem && <div className="message" onClick={() => setMensagem("")}>{mensagem}<span>×</span></div>}

      {tab === "dashboard" && <>
        <div className="metric-grid">
          <Metric label="Projetos" value={String(projetos.length)} detail="salvos" />
          <Metric label="Clientes" value={String(clientes.length)} detail="cadastrados" />
          <Metric label="Módulos" value={String(MODULOS.length)} detail="catálogo técnico" />
          <Metric label="Inversores" value={String(INVERSORES.length)} detail="catálogo técnico" />
        </div>
        <section className="panel">
          <div className="section-heading"><div><span className="kicker">STATUS</span><h2>Fluxo restaurado</h2></div><span className="pill green">Avançado</span></div>
          <div className="timeline-grid">
            <Timeline titulo="Concluído" texto="Consumo e potência" />
            <Timeline titulo="Concluído" texto="Módulo × inversor" />
            <Timeline titulo="Restaurado" texto="Telhado e arranjo" />
            <Timeline titulo="Restaurado" texto="Materiais e financeiro" />
          </div>
          <button className="primary" onClick={() => setTab("projetos")}>Abrir projeto completo</button>
        </section>
        <section className="panel">
          <div className="section-heading"><div><span className="kicker">PRÓXIMAS INTEGRAÇÕES</span><h2>Faltas para voltar à versão em nuvem</h2></div></div>
          <div className="check-grid"><span>Supabase: clientes/projetos</span><span>Irradiação por localização</span><span>Proposta em PDF</span><span>Diagrama unifilar</span><span>Documentação CPFL</span><span>PWA/offline</span><span>Catálogo importável CSV/Excel</span><span>Gestão comercial</span></div>
        </section>
      </>}

      {tab === "clientes" && <div className="two-columns">
        <section className="panel"><div className="section-heading"><div><span className="kicker">CADASTRO</span><h2>Novo cliente</h2></div></div><div className="form-grid"><Field label="Nome"><input value={clienteNome} onChange={e => setClienteNome(e.target.value)} /></Field><Field label="Cidade / UF"><input value={clienteCidade} onChange={e => setClienteCidade(e.target.value)} /></Field><Field label="Telefone"><input value={clienteTelefone} onChange={e => setClienteTelefone(e.target.value)} /></Field></div><button className="primary" onClick={adicionarCliente}>Salvar cliente</button></section>
        <section className="panel"><div className="section-heading"><div><span className="kicker">BASE</span><h2>Clientes cadastrados</h2></div></div>{clientes.length === 0 ? <Empty texto="Nenhum cliente cadastrado." /> : clientes.map(c => <div className="list-row" key={c.id}><div><strong>{c.nome}</strong><span>{c.cidade}</span></div><span>{c.telefone}</span></div>)}</section>
      </div>}

      {tab === "equipamentos" && <div className="two-columns">
        <section className="panel"><div className="section-heading"><div><span className="kicker">MÓDULOS</span><h2>Catálogo</h2></div></div>{MODULOS.map(m => <div className="equipment-card" key={m.id}><strong>{m.fabricante}</strong><h3>{m.modelo}</h3><div className="spec-grid"><span>{m.potenciaWp} Wp</span><span>Voc {m.vocV} V</span><span>Vmp {m.vmpV} V</span><span>Isc {m.iscA} A</span><span>Imp {m.impA} A</span><span>{m.alturaM} × {m.larguraM} m</span></div></div>)}</section>
        <section className="panel"><div className="section-heading"><div><span className="kicker">INVERSORES</span><h2>Catálogo</h2></div></div>{INVERSORES.map(i => <div className="equipment-card" key={i.id}><strong>{i.fabricante}</strong><h3>{i.modelo}</h3><div className="spec-grid"><span>{i.potenciaAcKw} kW</span><span>PV rec. {i.potenciaPvRecomendadaKw} kWp</span><span>Máx. {i.tensaoDcMaxV} V</span><span>MPPT {i.mpptMinV}-{i.mpptMaxV} V</span><span>{i.quantidadeMppt} MPPT</span><span>{i.correnteMaxMpptA} A/MPPT</span></div></div>)}</section>
      </div>}

      {tab === "projetos" && <>
        <section className="panel"><div className="section-heading"><div><span className="kicker">1. PROJETO</span><h2>Identificação e consumo</h2></div></div>
          <div className="form-grid three"><Field label="Nome do projeto"><input value={nomeProjeto} onChange={e => setNomeProjeto(e.target.value)} /></Field><Field label="Cliente"><select value={clienteProjeto} onChange={e => setClienteProjeto(e.target.value)}><option value="">Sem cliente</option>{clientes.map(c => <option key={c.id}>{c.nome}</option>)}</select></Field><Field label="Ligação"><select value={ligacao} onChange={e => setLigacao(e.target.value)}><option value="monofasica">Monofásica</option><option value="bifasica">Bifásica</option><option value="trifasica">Trifásica</option></select></Field></div>
          <div className="segmented"><button className={modoConsumo === "medio" ? "selected" : ""} onClick={() => setModoConsumo("medio")}>Consumo médio</button><button className={modoConsumo === "12meses" ? "selected" : ""} onClick={() => setModoConsumo("12meses")}>Histórico 12 meses</button></div>
          {modoConsumo === "medio" ? <div className="form-grid"><Field label="Consumo médio (kWh/mês)"><input value={consumoMedio} onChange={e => setConsumoMedio(e.target.value)} /></Field></div> : <div className="local-scroll"><div className="months-grid">{MESES.map((mes, i) => <Field key={mes} label={`${mes} (kWh)`}><input value={consumos[i]} onChange={e => setConsumos(v => v.map((x, j) => j === i ? e.target.value : x))} /></Field>)}</div></div>}
          <div className="average-box"><span>Média usada no cálculo</span><strong>{consumoCalculado.toFixed(0)} kWh/mês</strong></div>
        </section>

        <section className="panel"><div className="section-heading"><div><span className="kicker">2. DIMENSIONAMENTO</span><h2>Produção necessária</h2></div></div>
          <div className="form-grid four"><Field label="HSP"><input value={hsp} onChange={e => setHsp(e.target.value)} /></Field><Field label="Perdas (%)"><input value={perdas} onChange={e => setPerdas(e.target.value)} /></Field><Field label="Compensação (%)"><input value={compensacao} onChange={e => setCompensacao(e.target.value)} /></Field><Field label="Módulo"><select value={moduloId} onChange={e => setModuloId(e.target.value)}>{MODULOS.map(m => <option key={m.id} value={m.id}>{m.fabricante} {m.potenciaWp} W</option>)}</select></Field></div>
          <div className="result-grid"><Result label="Potência necessária" value={`${resultado.potenciaNecessariaKwp.toFixed(2)} kWp`} /><Result label="Módulos" value={String(resultado.quantidadeModulos)} /><Result label="Potência instalada" value={`${resultado.potenciaInstaladaKwp.toFixed(2)} kWp`} /><Result label="Geração estimada" value={`${resultado.geracaoMensalEstimadaKwh.toFixed(0)} kWh/mês`} /><Result label="Área dos módulos" value={`${resultado.areaEstimadaM2.toFixed(1)} m²`} /></div>
          <details className="memory"><summary>Memória de cálculo</summary><div className="memory-content"><p>Consumo: {consumoCalculado.toFixed(1)} kWh/mês</p><p>PR: {(resultado.performanceRatio * 100).toFixed(0)}%</p><p>Compensado: {resultado.consumoCompensadoKwh.toFixed(1)} kWh</p><p>Módulo: {modulo.potenciaWp} Wp</p><p>Ligação: {ligacao}</p></div></details>
        </section>

        <section className="panel"><div className="section-heading"><div><span className="kicker">3. COMPATIBILIDADE</span><h2>Módulo × inversor</h2></div><span className={`pill ${compatibilidade.status === "ok" ? "green" : compatibilidade.status === "atencao" ? "yellow" : "red"}`}>{compatibilidade.status}</span></div>
          <div className="form-grid four"><Field label="Inversor"><select value={inversorId} onChange={e => setInversorId(e.target.value)}>{INVERSORES.map(i => <option key={i.id} value={i.id}>{i.fabricante} {i.modelo}</option>)}</select></Field><Field label="Temperatura mínima (°C)"><input value={tempMin} onChange={e => setTempMin(e.target.value)} /></Field><Field label="Temp. célula máx. (°C)"><input value={tempCelulaMax} onChange={e => setTempCelulaMax(e.target.value)} /></Field><Field label="Strings por MPPT"><input value={stringsMppt} onChange={e => setStringsMppt(e.target.value)} /></Field></div>
          <div className="local-scroll"><div className="compat-table"><Compat label="Voc corrigida" value={`${compatibilidade.vocCorrigidaV.toFixed(1)} V`} /><Compat label="Vmp quente" value={`${compatibilidade.vmpQuenteV.toFixed(1)} V`} /><Compat label="Mín. string" value={String(compatibilidade.modulosMinString)} /><Compat label="Máx. string" value={String(compatibilidade.modulosMaxString)} /><Compat label="Corrente/MPPT" value={`${compatibilidade.correntePorMpptA.toFixed(1)} A`} /><Compat label="Relação CC/CA" value={compatibilidade.relacaoCcCa.toFixed(2)} /></div></div>
          <div className="alerts">{compatibilidade.alertas.map((a, i) => <div className={`alert ${a.nivel}`} key={i}><span className="signal" />{a.texto}</div>)}</div>
        </section>

        <section className="panel"><div className="section-heading"><div><span className="kicker">4. TELHADO</span><h2>Dimensionamento físico e distribuição</h2></div><span className={`pill ${cabeNoTelhado ? "green" : "red"}`}>{cabeNoTelhado ? "Cabe no telhado" : "Área insuficiente"}</span></div>
          <div className="form-grid four"><Field label="Comprimento (m)"><input value={telhadoComprimento} onChange={e => setTelhadoComprimento(e.target.value)} /></Field><Field label="Largura (m)"><input value={telhadoLargura} onChange={e => setTelhadoLargura(e.target.value)} /></Field><Field label="Recuo perimetral (m)"><input value={recuo} onChange={e => setRecuo(e.target.value)} /></Field><Field label="Obstáculos (m²)"><input value={obstaculos} onChange={e => setObstaculos(e.target.value)} /></Field><Field label="Espaçamento módulos (m)"><input value={espacamento} onChange={e => setEspacamento(e.target.value)} /></Field><Field label="Orientação do módulo"><select value={orientacao} onChange={e => setOrientacao(e.target.value as "vertical" | "horizontal")}><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option></select></Field><Field label="Inclinação telhado (°)"><input value={inclinacao} onChange={e => setInclinacao(e.target.value)} /></Field><Field label="Azimute (°)"><input value={azimute} onChange={e => setAzimute(e.target.value)} /></Field></div>
          <div className="result-grid"><Result label="Área bruta" value={`${telhado.areaBrutaM2.toFixed(1)} m²`} /><Result label="Área útil" value={`${telhado.areaUtilM2.toFixed(1)} m²`} /><Result label="Arranjo geométrico" value={`${telhado.colunas} × ${telhado.linhas}`} /><Result label="Capacidade" value={`${telhado.capacidadeFinal} módulos`} /><Result label="Potência máxima" value={`${telhado.potenciaMaximaKwp.toFixed(2)} kWp`} /></div>
          <div className="roof-visual"><div className="roof-title">Representação preliminar — {orientacao} | inclinação {inclinacao}° | azimute {azimute}°</div><div className="modules-visual" style={{gridTemplateColumns:`repeat(${Math.max(1, Math.min(telhado.colunas, 12))}, minmax(28px, 1fr))`}}>{Array.from({length: Math.min(telhado.capacidadeFinal, 48)}).map((_, i) => <span key={i}>{i + 1}</span>)}</div></div>
          <p className="technical-note">A representação é geométrica e preliminar. Obstáculos complexos, sombreamento e afastamentos normativos devem ser conferidos no projeto executivo.</p>
        </section>

        <section className="panel"><div className="section-heading"><div><span className="kicker">5. MATERIAIS</span><h2>Pré-lista orientativa</h2></div></div>
          <div className="form-grid"><Field label="Distância arranjo → inversor (m)"><input value={distanciaInversor} onChange={e => setDistanciaInversor(e.target.value)} /></Field></div>
          <div className="local-scroll"><div className="materials-table"><Compat label="Módulos considerados" value={String(quantidadeAplicada)} /><Compat label="Trilhos estimados" value={`${materiais.trilhosM.toFixed(1)} m`} /><Compat label="Grampos finais" value={String(materiais.gramposFinais)} /><Compat label="Grampos intermediários" value={String(materiais.gramposIntermediarios)} /><Compat label="Cabo solar +" value={`${materiais.caboSolarPositivoM} m`} /><Compat label="Cabo solar -" value={`${materiais.caboSolarNegativoM} m`} /></div></div>
          <p className="technical-note">A lista é um pré-dimensionamento. Fixadores, ganchos, parafusos, aterramento, eletrodutos, quadros e proteções serão refinados conforme tipo de telha, estrutura, percurso e diagrama elétrico.</p>
        </section>

        <section className="panel"><div className="section-heading"><div><span className="kicker">6. FINANCEIRO</span><h2>Economia e payback preliminares</h2></div></div>
          <div className="form-grid"><Field label="Tarifa de energia (R$/kWh)"><input value={tarifa} onChange={e => setTarifa(e.target.value)} /></Field><Field label="Investimento estimado (R$)"><input value={investimento} onChange={e => setInvestimento(e.target.value)} /></Field></div>
          <div className="result-grid"><Result label="Economia mensal" value={`R$ ${financeiro.economiaMensal.toFixed(2)}`} /><Result label="Economia anual" value={`R$ ${financeiro.economiaAnual.toFixed(2)}`} /><Result label="Payback simples" value={financeiro.paybackAnos ? `${financeiro.paybackAnos.toFixed(1)} anos` : "—"} /><Result label="Economia 25 anos*" value={`R$ ${financeiro.economia25AnosSemReajuste.toFixed(0)}`} /><Result label="Geração anual" value={`${(resultado.geracaoMensalEstimadaKwh * 12).toFixed(0)} kWh`} /></div>
          <p className="technical-note">*Estimativa sem reajuste tarifário e com degradação anual simplificada. Não substitui estudo financeiro formal.</p>
        </section>

        <div className="actions"><span>Próximos módulos: proteções, queda de tensão, proposta PDF, unifilar e CPFL.</span><button className="primary" onClick={salvarProjeto}>Salvar projeto</button></div>

        <section className="panel"><div className="section-heading"><div><span className="kicker">HISTÓRICO</span><h2>Projetos salvos</h2></div></div>{projetos.length === 0 ? <Empty texto="Nenhum projeto salvo." /> : <div className="local-scroll"><div className="project-table"><div className="table-head"><span>Projeto</span><span>Cliente</span><span>Consumo</span><span>Potência</span><span>Módulos</span><span>Telhado</span><span>Status</span></div>{projetos.map(p => <div className="table-row" key={p.id}><span>{p.nome}</span><span>{p.cliente}</span><span>{p.consumo.toFixed(0)} kWh</span><span>{p.potenciaKwp.toFixed(2)} kWp</span><span>{p.modulos}</span><span>{p.telhado}</span><span>{p.status}</span></div>)}</div></div>}</section>
      </>}
    </section>
  </main>;
}

function Field({label, children}:{label:string; children:React.ReactNode}) { return <label className="field"><span>{label}</span>{children}</label>; }
function Metric({label,value,detail}:{label:string;value:string;detail:string}) { return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }
function Result({label,value}:{label:string;value:string}) { return <div className="result-card"><span>{label}</span><strong>{value}</strong></div>; }
function Compat({label,value}:{label:string;value:string}) { return <div className="compat-card"><span>{label}</span><strong>{value}</strong></div>; }
function Timeline({titulo,texto}:{titulo:string;texto:string}) { return <div className="timeline done"><strong>{titulo}</strong><span>{texto}</span></div>; }
function Empty({texto}:{texto:string}) { return <div className="empty">{texto}</div>; }
