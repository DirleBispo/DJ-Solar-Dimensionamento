"use client";

import { useEffect, useMemo, useState } from "react";
import {
  InverterSpec,
  ModuleSpec,
  dimensionarSistema,
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
  status: string;
  atualizadoEm: string;
};

const MODULOS: ModuleSpec[] = [
  {
    id: "astronergy-n7-610",
    fabricante: "Astronergy",
    modelo: "ASTRO N7 CHSM66RN(DG)/F-BH 610 W",
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
    tensaoDcMaxV: 600,
    mpptMinV: 90,
    mpptMaxV: 530,
    correnteMaxMpptA: 13.5,
    quantidadeMppt: 2,
  },
];

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const parseNumero = (valor: string, fallback = 0) => {
  const n = Number(String(valor).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

function salvarLocal<T>(chave: string, valor: T) {
  if (typeof window !== "undefined") localStorage.setItem(chave, JSON.stringify(valor));
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<ProjetoSalvo[]>([]);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteCidade, setClienteCidade] = useState("Sorocaba/SP");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [nomeProjeto, setNomeProjeto] = useState("Projeto residencial");
  const [clienteProjeto, setClienteProjeto] = useState("");
  const [modoConsumo, setModoConsumo] = useState<"medio" | "12meses">("medio");
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
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    try {
      const c = localStorage.getItem("djsolar-clientes");
      const p = localStorage.getItem("djsolar-projetos");
      if (c) setClientes(JSON.parse(c));
      if (p) setProjetos(JSON.parse(p));
    } catch {
      // Se houver dado antigo inválido, a interface continua utilizável.
    }
  }, []);

  const modulo = MODULOS.find((item) => item.id === moduloId) ?? MODULOS[0];
  const inversor = INVERSORES.find((item) => item.id === inversorId) ?? INVERSORES[0];
  const valores12 = consumos.map((v) => Math.max(0, parseNumero(v, 0)));
  const consumoCalculado = modoConsumo === "medio" ? Math.max(0, parseNumero(consumoMedio, 0)) : mediaConsumo(valores12);
  const areaModulo = modulo.larguraM * modulo.alturaM;

  const resultado = useMemo(
    () =>
      dimensionarSistema({
        consumoMensalKwh: consumoCalculado || 1,
        horasSolPico: Math.max(0.1, parseNumero(hsp, 5)),
        perdasPct: Math.max(0, parseNumero(perdas, 20)),
        compensacaoPct: Math.max(1, parseNumero(compensacao, 100)),
        potenciaModuloWp: modulo.potenciaWp,
        areaModuloM2: areaModulo,
      }),
    [consumoCalculado, hsp, perdas, compensacao, modulo, areaModulo]
  );

  const compatibilidade = useMemo(
    () =>
      verificarCompatibilidade({
        modulo,
        inversor,
        quantidadeModulos: resultado.quantidadeModulos,
        temperaturaMinC: parseNumero(tempMin, 5),
        temperaturaCelulaMaxC: parseNumero(tempCelulaMax, 70),
        stringsPorMppt: Math.max(1, Math.round(parseNumero(stringsMppt, 1))),
      }),
    [modulo, inversor, resultado.quantidadeModulos, tempMin, tempCelulaMax, stringsMppt]
  );

  const adicionarCliente = () => {
    const nome = clienteNome.trim();
    if (!nome) return setMensagem("Informe o nome do cliente.");
    const novo = { id: crypto.randomUUID(), nome, cidade: clienteCidade.trim(), telefone: clienteTelefone.trim() };
    const lista = [novo, ...clientes];
    setClientes(lista);
    salvarLocal("djsolar-clientes", lista);
    setClienteNome("");
    setClienteTelefone("");
    setMensagem("Cliente salvo neste navegador. A sincronização com Supabase será religada na etapa de nuvem.");
  };

  const salvarProjeto = () => {
    const novo: ProjetoSalvo = {
      id: crypto.randomUUID(),
      nome: nomeProjeto.trim() || "Projeto sem nome",
      cliente: clienteProjeto || "Sem cliente vinculado",
      consumo: consumoCalculado,
      potenciaKwp: resultado.potenciaInstaladaKwp,
      modulos: resultado.quantidadeModulos,
      status: compatibilidade.status === "ok" ? "Compatível" : compatibilidade.status === "atencao" ? "Revisar" : "Incompatível",
      atualizadoEm: new Date().toLocaleDateString("pt-BR"),
    };
    const lista = [novo, ...projetos.filter((p) => p.nome !== novo.nome || p.cliente !== novo.cliente)];
    setProjetos(lista);
    salvarLocal("djsolar-projetos", lista);
    setMensagem("Projeto salvo. A versão GitHub já preserva o código; dados de clientes/projetos serão migrados para Supabase.");
  };

  const atualizarMes = (index: number, valor: string) => {
    setConsumos((atual) => atual.map((item, i) => (i === index ? valor : item)));
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">DJ</div>
          <div><strong>DJ Solar</strong><span>Engenharia</span></div>
        </div>
        <nav>
          <button className={tab === "dashboard" ? "nav-active" : ""} onClick={() => setTab("dashboard")}>Dashboard</button>
          <button className={tab === "projetos" ? "nav-active" : ""} onClick={() => setTab("projetos")}>Projetos</button>
          <button className={tab === "clientes" ? "nav-active" : ""} onClick={() => setTab("clientes")}>Clientes</button>
          <button className={tab === "equipamentos" ? "nav-active" : ""} onClick={() => setTab("equipamentos")}>Equipamentos</button>
        </nav>
        <div className="side-note"><span className="dot online" />Versão profissional recuperada</div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">DJ SOLAR ENGENHARIA</span>
            <h1>{tab === "dashboard" ? "Painel do projeto" : tab === "projetos" ? "Projetos fotovoltaicos" : tab === "clientes" ? "Clientes" : "Catálogo de equipamentos"}</h1>
          </div>
          <span className="version-badge">Reconstrução 21/08/2026</span>
        </header>

        {mensagem && <div className="message" onClick={() => setMensagem("")}>{mensagem}<span>×</span></div>}

        {tab === "dashboard" && (
          <>
            <div className="metric-grid">
              <Metric label="Projetos salvos" value={String(projetos.length)} detail="neste navegador" />
              <Metric label="Clientes" value={String(clientes.length)} detail="cadastrados" />
              <Metric label="Módulos no catálogo" value={String(MODULOS.length)} detail="com dados técnicos" />
              <Metric label="Inversores" value={String(INVERSORES.length)} detail="com dados técnicos" />
            </div>
            <section className="panel">
              <div className="section-heading"><div><span className="kicker">CONTINUIDADE</span><h2>Ponto recuperado do projeto original</h2></div><span className="pill green">~50% planejado</span></div>
              <div className="timeline-grid">
                <div className="timeline done"><strong>Concluído</strong><span>Dimensionamento por consumo</span></div>
                <div className="timeline done"><strong>Concluído</strong><span>Catálogo básico</span></div>
                <div className="timeline done"><strong>Concluído</strong><span>Compatibilidade módulo × inversor</span></div>
                <div className="timeline next"><strong>Próxima etapa</strong><span>Telhado e distribuição física</span></div>
              </div>
              <button className="primary" onClick={() => setTab("projetos")}>Abrir dimensionamento</button>
            </section>
          </>
        )}

        {tab === "clientes" && (
          <div className="two-columns">
            <section className="panel">
              <div className="section-heading"><div><span className="kicker">CADASTRO</span><h2>Novo cliente</h2></div></div>
              <div className="form-grid">
                <Field label="Nome"><input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Nome ou empresa" /></Field>
                <Field label="Cidade / UF"><input value={clienteCidade} onChange={(e) => setClienteCidade(e.target.value)} /></Field>
                <Field label="Telefone"><input value={clienteTelefone} onChange={(e) => setClienteTelefone(e.target.value)} placeholder="(15) ..." /></Field>
              </div>
              <button className="primary" onClick={adicionarCliente}>Salvar cliente</button>
            </section>
            <section className="panel">
              <div className="section-heading"><div><span className="kicker">BASE</span><h2>Clientes cadastrados</h2></div></div>
              {clientes.length === 0 ? <Empty texto="Nenhum cliente cadastrado neste navegador." /> : clientes.map((c) => <div className="list-row" key={c.id}><div><strong>{c.nome}</strong><span>{c.cidade || "Cidade não informada"}</span></div><span>{c.telefone}</span></div>)}
            </section>
          </div>
        )}

        {tab === "equipamentos" && (
          <div className="two-columns">
            <section className="panel">
              <div className="section-heading"><div><span className="kicker">MÓDULOS</span><h2>Catálogo fotovoltaico</h2></div></div>
              {MODULOS.map((m) => <div className="equipment-card" key={m.id}><strong>{m.fabricante}</strong><h3>{m.modelo}</h3><div className="spec-grid"><span>{m.potenciaWp} Wp</span><span>Voc {m.vocV} V</span><span>Vmp {m.vmpV} V</span><span>Imp {m.impA} A</span><span>{m.alturaM} × {m.larguraM} m</span><span>βVoc {m.coefVocPctC}%/°C</span></div></div>)}
            </section>
            <section className="panel">
              <div className="section-heading"><div><span className="kicker">INVERSORES</span><h2>Catálogo de inversores</h2></div></div>
              {INVERSORES.map((i) => <div className="equipment-card" key={i.id}><strong>{i.fabricante}</strong><h3>{i.modelo}</h3><div className="spec-grid"><span>{i.potenciaAcKw} kW AC</span><span>CC máx. {i.tensaoDcMaxV} V</span><span>MPPT {i.mpptMinV}–{i.mpptMaxV} V</span><span>{i.quantidadeMppt} MPPT</span><span>{i.correnteMaxMpptA} A / MPPT</span></div></div>)}
            </section>
          </div>
        )}

        {tab === "projetos" && (
          <>
            <section className="panel">
              <div className="section-heading"><div><span className="kicker">PROJETO</span><h2>Identificação e consumo</h2></div><span className="pill">Etapa 1</span></div>
              <div className="form-grid three">
                <Field label="Nome do projeto"><input value={nomeProjeto} onChange={(e) => setNomeProjeto(e.target.value)} /></Field>
                <Field label="Cliente"><select value={clienteProjeto} onChange={(e) => setClienteProjeto(e.target.value)}><option value="">Sem cliente vinculado</option>{clientes.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}</select></Field>
                <Field label="Tipo de ligação"><select value={ligacao} onChange={(e) => setLigacao(e.target.value)}><option value="monofasica">Monofásica</option><option value="bifasica">Bifásica</option><option value="trifasica">Trifásica</option></select></Field>
              </div>

              <div className="segmented"><button className={modoConsumo === "medio" ? "selected" : ""} onClick={() => setModoConsumo("medio")}>Consumo médio</button><button className={modoConsumo === "12meses" ? "selected" : ""} onClick={() => setModoConsumo("12meses")}>Histórico de 12 meses</button></div>

              {modoConsumo === "medio" ? (
                <div className="form-grid three"><Field label="Consumo médio mensal (kWh)"><input inputMode="decimal" value={consumoMedio} onChange={(e) => setConsumoMedio(e.target.value)} /></Field></div>
              ) : (
                <div className="local-scroll"><div className="months-grid">{MESES.map((mes, i) => <Field key={mes} label={`${mes} (kWh)`}><input inputMode="decimal" value={consumos[i]} onChange={(e) => atualizarMes(i, e.target.value)} /></Field>)}</div></div>
              )}

              <div className="form-grid four top-gap">
                <Field label="HSP (h/dia)"><input value={hsp} onChange={(e) => setHsp(e.target.value)} inputMode="decimal" /></Field>
                <Field label="Perdas (%)"><input value={perdas} onChange={(e) => setPerdas(e.target.value)} inputMode="decimal" /></Field>
                <Field label="Compensação (%)"><input value={compensacao} onChange={(e) => setCompensacao(e.target.value)} inputMode="decimal" /></Field>
                <Field label="Módulo"><select value={moduloId} onChange={(e) => setModuloId(e.target.value)}>{MODULOS.map((m) => <option key={m.id} value={m.id}>{m.fabricante} {m.potenciaWp} W</option>)}</select></Field>
              </div>
              {modoConsumo === "12meses" && <div className="average-box"><span>Média automática dos 12 meses</span><strong>{consumoCalculado.toFixed(1)} kWh/mês</strong></div>}
            </section>

            <section className="panel">
              <div className="section-heading"><div><span className="kicker">DIMENSIONAMENTO</span><h2>Resultado por consumo</h2></div><span className="pill green">Cálculo ativo</span></div>
              <div className="result-grid">
                <Result label="Potência necessária" value={`${resultado.potenciaNecessariaKwp.toFixed(2)} kWp`} />
                <Result label="Quantidade de módulos" value={String(resultado.quantidadeModulos)} />
                <Result label="Potência instalada" value={`${resultado.potenciaInstaladaKwp.toFixed(2)} kWp`} />
                <Result label="Geração estimada" value={`${resultado.geracaoMensalEstimadaKwh.toFixed(0)} kWh/mês`} />
                <Result label="Área dos módulos" value={`${resultado.areaEstimadaM2.toFixed(1)} m²`} />
              </div>
              <details className="memory"><summary>Ver memória de cálculo</summary><div className="memory-content"><p>Consumo considerado: <strong>{consumoCalculado.toFixed(1)} kWh/mês</strong></p><p>Compensação: <strong>{compensacao}%</strong> → {resultado.consumoCompensadoKwh.toFixed(1)} kWh/mês</p><p>Performance após perdas: <strong>{(resultado.performanceRatio * 100).toFixed(0)}%</strong></p><p>HSP: <strong>{hsp} h/dia</strong></p><p>Módulo selecionado: <strong>{modulo.potenciaWp} Wp</strong></p></div></details>
            </section>

            <section className="panel">
              <div className="section-heading"><div><span className="kicker">COMPATIBILIDADE ELÉTRICA</span><h2>Módulo × inversor</h2></div><span className={`pill ${compatibilidade.status === "ok" ? "green" : compatibilidade.status === "atencao" ? "yellow" : "red"}`}>{compatibilidade.status === "ok" ? "Compatível" : compatibilidade.status === "atencao" ? "Revisar" : "Incompatível"}</span></div>
              <div className="form-grid four">
                <Field label="Inversor"><select value={inversorId} onChange={(e) => setInversorId(e.target.value)}>{INVERSORES.map((i) => <option key={i.id} value={i.id}>{i.fabricante} {i.modelo}</option>)}</select></Field>
                <Field label="Temperatura mínima (°C)"><input value={tempMin} onChange={(e) => setTempMin(e.target.value)} /></Field>
                <Field label="Temp. máx. célula (°C)"><input value={tempCelulaMax} onChange={(e) => setTempCelulaMax(e.target.value)} /></Field>
                <Field label="Strings por MPPT"><input value={stringsMppt} onChange={(e) => setStringsMppt(e.target.value)} /></Field>
              </div>
              <div className="local-scroll"><div className="compat-table">
                <Compat label="Voc corrigida no frio" value={`${compatibilidade.vocCorrigidaV.toFixed(2)} V / módulo`} />
                <Compat label="Vmp em temperatura elevada" value={`${compatibilidade.vmpQuenteV.toFixed(2)} V / módulo`} />
                <Compat label="Mínimo por string" value={`${compatibilidade.modulosMinString} módulos`} />
                <Compat label="Máximo por string" value={`${compatibilidade.modulosMaxString} módulos`} />
                <Compat label="Corrente calculada / MPPT" value={`${compatibilidade.correntePorMpptA.toFixed(2)} A`} />
                <Compat label="Relação CC/CA" value={`${compatibilidade.relacaoCcCa.toFixed(2)} (${(compatibilidade.relacaoCcCa * 100).toFixed(0)}%)`} />
              </div></div>
              <div className="alerts">{compatibilidade.alertas.map((a, i) => <div key={i} className={`alert ${a.nivel}`}><span className="signal" />{a.texto}</div>)}</div>
              <p className="technical-note">A validação elétrica usa os dados técnicos cadastrados. Para projeto executivo, confirme sempre o datasheet da revisão exata do equipamento e os critérios normativos aplicáveis.</p>
            </section>

            <section className="panel next-stage">
              <div className="section-heading"><div><span className="kicker">PONTO EXATO DA CONTINUAÇÃO</span><h2>Telhado e distribuição física dos módulos</h2></div><span className="pill yellow">Próxima etapa</span></div>
              <div className="check-grid"><span>Comprimento e largura</span><span>Inclinação e orientação</span><span>Obstáculos e recuos</span><span>Vertical / horizontal</span><span>Espaçamento entre módulos</span><span>Quantidade máxima</span><span>Comparação de dimensões</span><span>Representação visual</span></div>
              <p>Esta é a etapa onde o desenvolvimento original havia parado. Ela será construída sobre o dimensionamento e a compatibilidade já restaurados acima.</p>
            </section>

            <div className="actions"><button className="primary" onClick={salvarProjeto}>Salvar projeto</button><span>Ligação selecionada: <strong>{ligacao}</strong></span></div>

            <section className="panel">
              <div className="section-heading"><div><span className="kicker">HISTÓRICO</span><h2>Projetos salvos</h2></div></div>
              {projetos.length === 0 ? <Empty texto="Salve o primeiro dimensionamento para criar o histórico." /> : <div className="local-scroll"><div className="project-table"><div className="table-head"><span>Projeto</span><span>Cliente</span><span>Consumo</span><span>Sistema</span><span>Módulos</span><span>Status</span><span>Atualizado</span></div>{projetos.map((p) => <div className="table-row" key={p.id}><strong>{p.nome}</strong><span>{p.cliente}</span><span>{p.consumo.toFixed(0)} kWh</span><span>{p.potenciaKwp.toFixed(2)} kWp</span><span>{p.modulos}</span><span>{p.status}</span><span>{p.atualizadoEm}</span></div>)}</div></div>}
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}
function Result({ label, value }: { label: string; value: string }) {
  return <article className="result-card"><span>{label}</span><strong>{value}</strong></article>;
}
function Compat({ label, value }: { label: string; value: string }) {
  return <article className="compat-card"><span>{label}</span><strong>{value}</strong></article>;
}
function Empty({ texto }: { texto: string }) {
  return <div className="empty">{texto}</div>;
}
