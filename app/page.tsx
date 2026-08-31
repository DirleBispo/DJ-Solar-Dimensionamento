"use client";

import { useEffect, useMemo, useState } from "react";
import ClientAddressSolar, { AddressSolarValue } from "@/components/ClientAddressSolar";
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

type Tab = "dashboard" | "projetos" | "diagrama" | "clientes" | "equipamentos";
type Cliente = { id: string; nome: string; cidade: string; telefone: string; endereco?: AddressSolarValue };
type ProjetoSalvo = { id: string; nome: string; cliente: string; consumo: number; potenciaKwp: number; modulos: number; telhado: number; status: string; atualizadoEm: string };

const MODULOS: ModuleSpec[] = [
  { id: "astronergy-n7-610", fabricante: "Astronergy", modelo: "ASTRO N7 610 W", potenciaWp: 610, larguraM: 1.134, alturaM: 2.382, vocV: 48.74, vmpV: 41.31, iscA: 15.94, impA: 14.77, coefVocPctC: -0.25, coefVmpPctC: -0.29 },
  { id: "jinko-585", fabricante: "Jinko Solar", modelo: "Tiger Neo 585 W", potenciaWp: 585, larguraM: 1.134, alturaM: 2.278, vocV: 52.7, vmpV: 44.3, iscA: 14.13, impA: 13.21, coefVocPctC: -0.25, coefVmpPctC: -0.29 },
];

const INVERSORES: InverterSpec[] = [
  { id: "huawei-sun2000-6ktl-l1", fabricante: "Huawei", modelo: "SUN2000-6KTL-L1", potenciaAcKw: 6, potenciaPvRecomendadaKw: 9, tensaoDcMaxV: 600, mpptMinV: 90, mpptMaxV: 530, correnteMaxMpptA: 13.5, quantidadeMppt: 2 },
  { id: "huawei-sun2000-5ktl-l1", fabricante: "Huawei", modelo: "SUN2000-5KTL-L1", potenciaAcKw: 5, potenciaPvRecomendadaKw: 7.5, tensaoDcMaxV: 600, mpptMinV: 90, mpptMaxV: 530, correnteMaxMpptA: 13.5, quantidadeMppt: 2 },
];

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const vazioEndereco: AddressSolarValue = { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" };
const n = (valor: string, fallback = 0) => { const x = Number(String(valor).replace(",", ".")); return Number.isFinite(x) ? x : fallback; };
function salvarLocal<T>(chave: string, valor: T) { if (typeof window !== "undefined") localStorage.setItem(chave, JSON.stringify(valor)); }

export default function Home() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<ProjetoSalvo[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [clienteEndereco, setClienteEndereco] = useState<AddressSolarValue>(vazioEndereco);
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
  const [distanciaInversor, setDistanciaInversor] = useState("15");
  const [tarifa, setTarifa] = useState("0.95");
  const [investimento, setInvestimento] = useState("15000");

  useEffect(() => { try { const c = localStorage.getItem("djsolar-clientes"); const p = localStorage.getItem("djsolar-projetos"); if (c) setClientes(JSON.parse(c)); if (p) setProjetos(JSON.parse(p)); } catch {} }, []);

  const modulo = MODULOS.find((x) => x.id === moduloId) ?? MODULOS[0];
  const inversor = INVERSORES.find((x) => x.id === inversorId) ?? INVERSORES[0];
  const consumoCalculado = modoConsumo === "medio" ? Math.max(0, n(consumoMedio)) : mediaConsumo(consumos.map((x) => Math.max(0, n(x))));
  const resultado = useMemo(() => dimensionarSistema({ consumoMensalKwh: consumoCalculado || 1, horasSolPico: Math.max(0.1, n(hsp, 5)), perdasPct: Math.max(0, n(perdas, 20)), compensacaoPct: Math.max(1, n(compensacao, 100)), potenciaModuloWp: modulo.potenciaWp, areaModuloM2: modulo.larguraM * modulo.alturaM }), [consumoCalculado, hsp, perdas, compensacao, modulo]);
  const compatibilidade = useMemo(() => verificarCompatibilidade({ modulo, inversor, quantidadeModulos: resultado.quantidadeModulos, temperaturaMinC: n(tempMin, 5), temperaturaCelulaMaxC: n(tempCelulaMax, 70), stringsPorMppt: Math.max(1, Math.round(n(stringsMppt, 1))) }), [modulo, inversor, resultado.quantidadeModulos, tempMin, tempCelulaMax, stringsMppt]);
  const telhado = useMemo(() => dimensionarTelhado({ comprimentoM: Math.max(0, n(telhadoComprimento)), larguraM: Math.max(0, n(telhadoLargura)), recuoM: Math.max(0, n(recuo)), obstaculosM2: Math.max(0, n(obstaculos)), espacamentoM: Math.max(0, n(espacamento)), orientacaoModulo: orientacao, modulo }), [telhadoComprimento, telhadoLargura, recuo, obstaculos, espacamento, orientacao, modulo]);
  const quantidadeAplicada = Math.min(resultado.quantidadeModulos, telhado.capacidadeFinal || 0);
  const materiais = useMemo(() => estimarMateriais(quantidadeAplicada, telhado.colunas, telhado.linhas, n(distanciaInversor, 15)), [quantidadeAplicada, telhado, distanciaInversor]);
  const financeiro = useMemo(() => analisarFinanceiro({ geracaoMensalKwh: resultado.geracaoMensalEstimadaKwh, tarifaKwh: n(tarifa, .95), investimento: n(investimento, 15000) }), [resultado.geracaoMensalEstimadaKwh, tarifa, investimento]);
  const cabeNoTelhado = telhado.capacidadeFinal >= resultado.quantidadeModulos;

  const adicionarCliente = () => {
    if (!clienteNome.trim()) return setMensagem("Informe o nome do cliente.");
    const novo: Cliente = { id: crypto.randomUUID(), nome: clienteNome.trim(), cidade: [clienteEndereco.cidade, clienteEndereco.uf].filter(Boolean).join("/"), telefone: clienteTelefone.trim(), endereco: clienteEndereco };
    const lista = [novo, ...clientes]; setClientes(lista); salvarLocal("djsolar-clientes", lista); setClienteNome(""); setClienteTelefone(""); setClienteEndereco(vazioEndereco); if (novo.endereco?.hsp) setHsp(String(novo.endereco.hsp)); setMensagem("Cliente salvo com endereço e recurso solar.");
  };

  const selecionarClienteProjeto = (nome: string) => { setClienteProjeto(nome); const cliente = clientes.find((c) => c.nome === nome); if (cliente?.endereco?.hsp) setHsp(String(cliente.endereco.hsp)); };
  const salvarProjeto = () => { const novo: ProjetoSalvo = { id: crypto.randomUUID(), nome: nomeProjeto.trim() || "Projeto sem nome", cliente: clienteProjeto || "Sem cliente", consumo: consumoCalculado, potenciaKwp: resultado.potenciaInstaladaKwp, modulos: resultado.quantidadeModulos, telhado: telhado.capacidadeFinal, status: !cabeNoTelhado ? "Telhado insuficiente" : compatibilidade.status === "ok" ? "Compatível" : compatibilidade.status === "atencao" ? "Revisar" : "Incompatível", atualizadoEm: new Date().toLocaleDateString("pt-BR") }; const lista = [novo, ...projetos]; setProjetos(lista); salvarLocal("djsolar-projetos", lista); setMensagem("Projeto salvo."); };

  return <main className="app-shell"><section className="content">
    <header className="topbar"><div><span className="eyebrow">DJ SOLAR ENGENHARIA</span><h1>{tab === "dashboard" ? "Dimensione com precisão. Venda com confiança." : tab === "projetos" ? "Projeto fotovoltaico" : tab === "diagrama" ? "Diagrama unifilar" : tab === "clientes" ? "Clientes" : "Equipamentos"}</h1></div><span className="version-badge">Projeto profissional</span></header>
    {mensagem && <div className="message" onClick={() => setMensagem("")}>{mensagem}<span>×</span></div>}

    {tab === "dashboard" && <><div className="metric-grid"><Metric label="Projetos" value={String(projetos.length)} detail="salvos" /><Metric label="Clientes" value={String(clientes.length)} detail="cadastrados" /><Metric label="Módulos" value={String(MODULOS.length)} detail="catálogo técnico" /><Metric label="Inversores" value={String(INVERSORES.length)} detail="catálogo técnico" /></div><section className="panel"><div className="section-heading"><div><span className="kicker">VISÃO GERAL</span><h2>Resumo técnico do sistema</h2></div></div><div className="result-grid"><Result label="Consumo" value={`${consumoCalculado.toFixed(0)} kWh/mês`} /><Result label="Sol pleno" value={`${n(hsp,5).toFixed(2)} h/dia`} /><Result label="Potência" value={`${resultado.potenciaInstaladaKwp.toFixed(2)} kWp`} /><Result label="Módulos" value={String(resultado.quantidadeModulos)} /><Result label="Geração" value={`${resultado.geracaoMensalEstimadaKwh.toFixed(0)} kWh/mês`} /></div></section></>}

    {tab === "clientes" && <div className="two-columns"><section className="panel"><div className="section-heading"><div><span className="kicker">CADASTRO</span><h2>Novo cliente / unidade consumidora</h2></div></div><div className="form-grid"><Field label="Nome / empresa"><input value={clienteNome} onChange={e => setClienteNome(e.target.value)} /></Field><Field label="Telefone"><input value={clienteTelefone} onChange={e => setClienteTelefone(e.target.value)} /></Field></div><ClientAddressSolar value={clienteEndereco} onChange={setClienteEndereco} onHspFound={(valor) => setHsp(String(valor))} /><button className="primary top-gap" onClick={adicionarCliente}>Salvar cliente</button></section><section className="panel"><div className="section-heading"><div><span className="kicker">BASE</span><h2>Clientes cadastrados</h2></div></div>{clientes.length === 0 ? <Empty texto="Nenhum cliente cadastrado." /> : clientes.map(c => <div className="list-row" key={c.id}><div><strong>{c.nome}</strong><span>{c.endereco ? `${c.endereco.logradouro}${c.endereco.numero ? `, ${c.endereco.numero}` : ""} • ${c.endereco.bairro} • ${c.cidade}` : c.cidade}</span><span>{c.endereco?.hsp ? `Sol pleno: ${c.endereco.hsp.toFixed(2)} h/dia` : "Sol pleno não consultado"}</span></div><span>{c.telefone}</span></div>)}</section></div>}

    {tab === "projetos" && <><section className="panel"><div className="section-heading"><div><span className="kicker">PROJETO</span><h2>Identificação e consumo</h2></div></div><div className="form-grid three"><Field label="Nome do projeto"><input value={nomeProjeto} onChange={e => setNomeProjeto(e.target.value)} /></Field><Field label="Cliente"><select value={clienteProjeto} onChange={e => selecionarClienteProjeto(e.target.value)}><option value="">Sem cliente</option>{clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}</select></Field><Field label="Tipo de ligação"><select value={ligacao} onChange={e => setLigacao(e.target.value)}><option value="monofasica">Monofásica</option><option value="bifasica">Bifásica</option><option value="trifasica">Trifásica</option></select></Field></div><div className="form-grid four"><Field label="Sol pleno (HSP)"><input value={hsp} onChange={e => setHsp(e.target.value)} /></Field><Field label="Perdas (%)"><input value={perdas} onChange={e => setPerdas(e.target.value)} /></Field><Field label="Compensação (%)"><input value={compensacao} onChange={e => setCompensacao(e.target.value)} /></Field><Field label="Consumo médio"><input value={consumoMedio} onChange={e => setConsumoMedio(e.target.value)} /></Field></div><div className="segmented"><button className={modoConsumo === "medio" ? "selected" : ""} onClick={() => setModoConsumo("medio")}>Média</button><button className={modoConsumo === "12meses" ? "selected" : ""} onClick={() => setModoConsumo("12meses")}>12 meses</button></div>{modoConsumo === "12meses" && <div className="local-scroll"><div className="months-grid">{MESES.map((mes, i) => <Field key={mes} label={mes}><input value={consumos[i]} onChange={e => setConsumos(consumos.map((v, idx) => idx === i ? e.target.value : v))} /></Field>)}</div></div>}</section><section className="panel"><div className="section-heading"><div><span className="kicker">DIMENSIONAMENTO</span><h2>Resultado</h2></div></div><div className="result-grid"><Result label="Potência" value={`${resultado.potenciaInstaladaKwp.toFixed(2)} kWp`} /><Result label="Módulos" value={String(resultado.quantidadeModulos)} /><Result label="Geração" value={`${resultado.geracaoMensalEstimadaKwh.toFixed(0)} kWh/mês`} /><Result label="Área" value={`${resultado.areaEstimadaM2.toFixed(1)} m²`} /><Result label="Sol pleno" value={`${n(hsp,5).toFixed(2)} h/dia`} /></div></section><section className="panel"><div className="section-heading"><div><span className="kicker">EQUIPAMENTOS</span><h2>Módulo e inversor</h2></div></div><div className="form-grid"><Field label="Módulo"><select value={moduloId} onChange={e => setModuloId(e.target.value)}>{MODULOS.map(m => <option key={m.id} value={m.id}>{m.fabricante} {m.modelo}</option>)}</select></Field><Field label="Inversor"><select value={inversorId} onChange={e => setInversorId(e.target.value)}>{INVERSORES.map(i => <option key={i.id} value={i.id}>{i.fabricante} {i.modelo}</option>)}</select></Field><Field label="Temperatura mínima (°C)"><input value={tempMin} onChange={e => setTempMin(e.target.value)} /></Field><Field label="Temperatura célula máx. (°C)"><input value={tempCelulaMax} onChange={e => setTempCelulaMax(e.target.value)} /></Field><Field label="Strings por MPPT"><input value={stringsMppt} onChange={e => setStringsMppt(e.target.value)} /></Field></div><div className="alerts">{compatibilidade.alertas.map((a, i) => <div className={`alert ${a.nivel}`} key={i}><span className="signal" />{a.texto}</div>)}</div></section><section className="panel"><div className="section-heading"><div><span className="kicker">TELHADO</span><h2>Distribuição física</h2></div></div><div className="form-grid four"><Field label="Comprimento (m)"><input value={telhadoComprimento} onChange={e => setTelhadoComprimento(e.target.value)} /></Field><Field label="Largura (m)"><input value={telhadoLargura} onChange={e => setTelhadoLargura(e.target.value)} /></Field><Field label="Recuo (m)"><input value={recuo} onChange={e => setRecuo(e.target.value)} /></Field><Field label="Obstáculos (m²)"><input value={obstaculos} onChange={e => setObstaculos(e.target.value)} /></Field><Field label="Espaçamento (m)"><input value={espacamento} onChange={e => setEspacamento(e.target.value)} /></Field><Field label="Orientação"><select value={orientacao} onChange={e => setOrientacao(e.target.value as "vertical"|"horizontal")}><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option></select></Field></div><div className="result-grid"><Result label="Capacidade" value={`${telhado.capacidadeFinal} módulos`} /><Result label="Linhas" value={String(telhado.linhas)} /><Result label="Colunas" value={String(telhado.colunas)} /><Result label="Necessário" value={String(resultado.quantidadeModulos)} /><Result label="Situação" value={cabeNoTelhado ? "Cabe" : "Insuficiente"} /></div></section><section className="panel"><div className="section-heading"><div><span className="kicker">MATERIAIS / FINANCEIRO</span><h2>Pré-dimensionamento</h2></div></div><div className="result-grid"><Result label="Trilhos" value={`${materiais.trilhosM.toFixed(1)} m`} /><Result label="Grampos finais" value={String(materiais.gramposFinais)} /><Result label="Grampos intermediários" value={String(materiais.gramposIntermediarios)} /><Result label="Cabo solar" value={`${materiais.caboSolarM.toFixed(0)} m`} /><Result label="Payback" value={`${financeiro.paybackAnos.toFixed(1)} anos`} /></div><div className="actions"><span>Economia estimada: R$ {financeiro.economiaMensal.toFixed(2)}/mês</span><button className="primary" onClick={salvarProjeto}>Salvar projeto</button></div></section></>}

    {tab === "diagrama" && <section className="panel"><div className="section-heading"><div><span className="kicker">DIAGRAMA</span><h2>Diagrama unifilar fotovoltaico</h2></div></div><div className="check-grid"><span>Arranjo FV: {resultado.quantidadeModulos} × {modulo.potenciaWp} W</span><span>Inversor: {inversor.modelo}</span><span>Ligação: {ligacao}</span><span>Potência: {resultado.potenciaInstaladaKwp.toFixed(2)} kWp</span></div><p className="technical-note">Próxima etapa: representação elétrica completa com proteções CC/CA, DPS, seccionamento, medição, aterramento e dados da concessionária.</p></section>}

    {tab === "equipamentos" && <div className="two-columns"><section className="panel"><div className="section-heading"><div><span className="kicker">MÓDULOS</span><h2>Catálogo técnico</h2></div></div>{MODULOS.map(m => <div className="equipment-card" key={m.id}><strong>{m.fabricante}</strong><h3>{m.modelo}</h3><div className="spec-grid"><span>{m.potenciaWp} Wp</span><span>Voc {m.vocV} V</span><span>Vmp {m.vmpV} V</span><span>Imp {m.impA} A</span><span>{m.alturaM} × {m.larguraM} m</span></div><button className="secondary top-gap" onClick={() => { setModuloId(m.id); setTab("projetos"); }}>Usar este módulo no projeto</button></div>)}</section><section className="panel"><div className="section-heading"><div><span className="kicker">INVERSORES</span><h2>Catálogo técnico</h2></div></div>{INVERSORES.map(i => <div className="equipment-card" key={i.id}><strong>{i.fabricante}</strong><h3>{i.modelo}</h3><div className="spec-grid"><span>{i.potenciaAcKw} kW</span><span>PV rec. {i.potenciaPvRecomendadaKw} kWp</span><span>MPPT {i.mpptMinV}–{i.mpptMaxV} V</span><span>{i.quantidadeMppt} MPPT</span></div><button className="secondary top-gap" onClick={() => { setInversorId(i.id); setTab("projetos"); }}>Usar este inversor no projeto</button></div>)}</section></div>}
  </section><nav className="bottom-nav"><button className={tab === "dashboard" ? "nav-active" : ""} onClick={() => setTab("dashboard")}>Visão</button><button className={tab === "projetos" ? "nav-active" : ""} onClick={() => setTab("projetos")}>Projetos</button><button className={tab === "diagrama" ? "nav-active" : ""} onClick={() => setTab("diagrama")}>Diagrama</button><button className={tab === "clientes" ? "nav-active" : ""} onClick={() => setTab("clientes")}>Clientes</button><button className={tab === "equipamentos" ? "nav-active" : ""} onClick={() => setTab("equipamentos")}>Equipamentos</button></nav></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
function Result({ label, value }: { label: string; value: string }) { return <article className="result-card"><span>{label}</span><strong>{value}</strong></article>; }
function Empty({ texto }: { texto: string }) { return <div className="empty">{texto}</div>; }
