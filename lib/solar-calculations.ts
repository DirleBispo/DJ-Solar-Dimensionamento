export type ModuleSpec = {
  id: string;
  fabricante: string;
  modelo: string;
  potenciaWp: number;
  larguraM: number;
  alturaM: number;
  vocV: number;
  vmpV: number;
  iscA: number;
  impA: number;
  coefVocPctC: number;
  coefVmpPctC: number;
};

export type InverterSpec = {
  id: string;
  fabricante: string;
  modelo: string;
  potenciaAcKw: number;
  tensaoDcMaxV: number;
  mpptMinV: number;
  mpptMaxV: number;
  correnteMaxMpptA: number;
  quantidadeMppt: number;
};

export type SizingInput = {
  consumoMensalKwh: number;
  horasSolPico: number;
  perdasPct: number;
  compensacaoPct: number;
  potenciaModuloWp: number;
  areaModuloM2: number;
};

export type SizingResult = {
  consumoCompensadoKwh: number;
  performanceRatio: number;
  potenciaNecessariaKwp: number;
  quantidadeModulos: number;
  potenciaInstaladaKwp: number;
  areaEstimadaM2: number;
  geracaoMensalEstimadaKwh: number;
};

export type CompatibilityInput = {
  modulo: ModuleSpec;
  inversor: InverterSpec;
  quantidadeModulos: number;
  temperaturaMinC: number;
  temperaturaCelulaMaxC: number;
  stringsPorMppt?: number;
};

export type CompatibilityResult = {
  vocCorrigidaV: number;
  vmpQuenteV: number;
  modulosMinString: number;
  modulosMaxString: number;
  correntePorMpptA: number;
  relacaoCcCa: number;
  potenciaDcKwp: number;
  status: "ok" | "atencao" | "incompativel";
  alertas: Array<{ nivel: "verde" | "amarelo" | "vermelho"; texto: string }>;
};

export function mediaConsumo(meses: number[]): number {
  const validos = meses.filter((valor) => Number.isFinite(valor) && valor >= 0);
  if (!validos.length) return 0;
  return validos.reduce((soma, valor) => soma + valor, 0) / validos.length;
}

export function dimensionarSistema(input: SizingInput): SizingResult {
  const diasMes = 30;
  const perdas = Math.min(Math.max(input.perdasPct, 0), 60) / 100;
  const compensacao = Math.min(Math.max(input.compensacaoPct, 1), 150) / 100;
  const performanceRatio = 1 - perdas;
  const consumoCompensadoKwh = input.consumoMensalKwh * compensacao;
  const energiaDiaria = consumoCompensadoKwh / diasMes;
  const potenciaNecessariaKwp = energiaDiaria / (input.horasSolPico * performanceRatio);
  const quantidadeModulos = Math.ceil((potenciaNecessariaKwp * 1000) / input.potenciaModuloWp);
  const potenciaInstaladaKwp = (quantidadeModulos * input.potenciaModuloWp) / 1000;
  const areaEstimadaM2 = quantidadeModulos * input.areaModuloM2;
  const geracaoMensalEstimadaKwh =
    potenciaInstaladaKwp * input.horasSolPico * diasMes * performanceRatio;

  return {
    consumoCompensadoKwh,
    performanceRatio,
    potenciaNecessariaKwp,
    quantidadeModulos,
    potenciaInstaladaKwp,
    areaEstimadaM2,
    geracaoMensalEstimadaKwh,
  };
}

export function verificarCompatibilidade(input: CompatibilityInput): CompatibilityResult {
  const { modulo, inversor } = input;
  const deltaFrio = Math.max(0, 25 - input.temperaturaMinC);
  const vocCorrigidaV = modulo.vocV * (1 + (Math.abs(modulo.coefVocPctC) / 100) * deltaFrio);

  const deltaQuente = Math.max(0, input.temperaturaCelulaMaxC - 25);
  const vmpQuenteV = modulo.vmpV * (1 + (modulo.coefVmpPctC / 100) * deltaQuente);

  const modulosMinString = Math.max(1, Math.ceil(inversor.mpptMinV / vmpQuenteV));
  const maxPorTensao = Math.floor(inversor.tensaoDcMaxV / vocCorrigidaV);
  const maxPorMppt = Math.floor(inversor.mpptMaxV / vmpQuenteV);
  const modulosMaxString = Math.max(0, Math.min(maxPorTensao, maxPorMppt));

  const stringsPorMppt = Math.max(1, input.stringsPorMppt ?? 1);
  const correntePorMpptA = modulo.impA * stringsPorMppt;
  const potenciaDcKwp = (input.quantidadeModulos * modulo.potenciaWp) / 1000;
  const relacaoCcCa = potenciaDcKwp / inversor.potenciaAcKw;

  const alertas: CompatibilityResult["alertas"] = [];

  if (modulosMaxString < modulosMinString) {
    alertas.push({ nivel: "vermelho", texto: "Não existe quantidade de módulos por string que atenda simultaneamente à faixa MPPT e à tensão CC máxima." });
  } else {
    alertas.push({ nivel: "verde", texto: `Faixa calculada por string: ${modulosMinString} a ${modulosMaxString} módulos.` });
  }

  if (correntePorMpptA > inversor.correnteMaxMpptA) {
    alertas.push({ nivel: "vermelho", texto: `Corrente calculada por MPPT (${correntePorMpptA.toFixed(1)} A) supera o limite informado do inversor (${inversor.correnteMaxMpptA.toFixed(1)} A).` });
  } else {
    alertas.push({ nivel: "verde", texto: `Corrente por MPPT dentro do limite informado (${correntePorMpptA.toFixed(1)} A).` });
  }

  if (relacaoCcCa < 0.8) {
    alertas.push({ nivel: "amarelo", texto: `Relação CC/CA baixa (${relacaoCcCa.toFixed(2)}). Verifique subdimensionamento do arranjo CC.` });
  } else if (relacaoCcCa > 1.5) {
    alertas.push({ nivel: "vermelho", texto: `Relação CC/CA elevada (${relacaoCcCa.toFixed(2)}). Confirme o oversizing permitido no datasheet.` });
  } else if (relacaoCcCa > 1.3) {
    alertas.push({ nivel: "amarelo", texto: `Oversizing CC/CA de ${relacaoCcCa.toFixed(2)}. Confirme o limite do fabricante.` });
  } else {
    alertas.push({ nivel: "verde", texto: `Relação CC/CA de ${relacaoCcCa.toFixed(2)} dentro da faixa preliminar de análise.` });
  }

  const temVermelho = alertas.some((a) => a.nivel === "vermelho");
  const temAmarelo = alertas.some((a) => a.nivel === "amarelo");

  return {
    vocCorrigidaV,
    vmpQuenteV,
    modulosMinString,
    modulosMaxString,
    correntePorMpptA,
    relacaoCcCa,
    potenciaDcKwp,
    status: temVermelho ? "incompativel" : temAmarelo ? "atencao" : "ok",
    alertas,
  };
}
