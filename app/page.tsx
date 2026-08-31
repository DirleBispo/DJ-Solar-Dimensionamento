"use client";

import { useMemo, useState } from "react";
import { dimensionarSistema } from "@/lib/solar-calculations";

const number = (value: string, fallback: number) => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default function Home() {
  const [consumo, setConsumo] = useState("600");
  const [hsp, setHsp] = useState("5.0");
  const [pr, setPr] = useState("0.80");
  const [modulo, setModulo] = useState("610");
  const [areaModulo, setAreaModulo] = useState("2.7");

  const resultado = useMemo(
    () =>
      dimensionarSistema({
        consumoMensalKwh: number(consumo, 600),
        horasSolPico: number(hsp, 5),
        performanceRatio: number(pr, 0.8),
        potenciaModuloWp: number(modulo, 610),
        areaModuloM2: number(areaModulo, 2.7),
      }),
    [consumo, hsp, pr, modulo, areaModulo]
  );

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <span className="eyebrow">DJ Solar Engenharia</span>
          <h1>Dimensionamento Fotovoltaico</h1>
          <p>
            Faça uma estimativa inicial do sistema a partir do consumo mensal e dos dados do módulo.
          </p>
        </div>
        <div className="status">Versão inicial</div>
      </section>

      <section className="workspace">
        <div className="panel form-panel">
          <h2>Dados do projeto</h2>
          <div className="grid">
            <label>
              Consumo mensal (kWh)
              <input value={consumo} onChange={(e) => setConsumo(e.target.value)} inputMode="decimal" />
            </label>
            <label>
              Horas de sol pico (h/dia)
              <input value={hsp} onChange={(e) => setHsp(e.target.value)} inputMode="decimal" />
            </label>
            <label>
              Performance do sistema (0 a 1)
              <input value={pr} onChange={(e) => setPr(e.target.value)} inputMode="decimal" />
            </label>
            <label>
              Potência do módulo (Wp)
              <input value={modulo} onChange={(e) => setModulo(e.target.value)} inputMode="decimal" />
            </label>
            <label>
              Área por módulo (m²)
              <input value={areaModulo} onChange={(e) => setAreaModulo(e.target.value)} inputMode="decimal" />
            </label>
          </div>
          <p className="note">
            Este cálculo é preliminar. A etapa técnica final deverá considerar irradiação local, orientação,
            inclinação, sombreamento, limites elétricos do inversor, concessionária e normas aplicáveis.
          </p>
        </div>

        <div className="panel result-panel">
          <h2>Resultado preliminar</h2>
          <div className="results">
            <article>
              <span>Potência necessária</span>
              <strong>{resultado.potenciaNecessariaKwp.toFixed(2)} kWp</strong>
            </article>
            <article>
              <span>Módulos</span>
              <strong>{resultado.quantidadeModulos}</strong>
            </article>
            <article>
              <span>Potência instalada</span>
              <strong>{resultado.potenciaInstaladaKwp.toFixed(2)} kWp</strong>
            </article>
            <article>
              <span>Área estimada</span>
              <strong>{resultado.areaEstimadaM2.toFixed(1)} m²</strong>
            </article>
            <article className="wide">
              <span>Geração mensal estimada</span>
              <strong>{resultado.geracaoMensalEstimadaKwh.toFixed(0)} kWh/mês</strong>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
