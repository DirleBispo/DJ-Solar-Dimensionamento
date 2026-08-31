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
  potenciaPvRecomendadaKw?: number;
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

export type RoofInput = {
  comprimentoM: number;
  larguraM: number;
  recuoM: number;
  obstaculosM2: number;
  espacamentoM: number;
  orientacaoModulo: "vertical" | "horizontal";
  modulo: ModuleSpec;
};

export type RoofResult = {
  comprimentoUtilM: number;
  larguraUtilM: number;
  areaBrutaM2: number;
  areaUtilM2: number;
  colunas: number;
  linhas: number;
  capacidadeGeometrica: number;
  capacidadePorArea: number;
  capacidadeFinal: number;
  potenciaMaximaKwp: number;
  comprimentoModuloM: number;
  larguraModuloM: number;
};

export type MaterialEstimate = {
  trilhosM: number;
  gramposFinais: number;
  gramposIntermediarios: number;
  conectoresMc4Pares: number;
  caboSolarPositivoM: number;
  caboSolarNegativoM: number;
  etiquetas: number;
};

export type FinancialInput = {
  geracaoMensalKwh: number;
  tarifaKwh: number;
  investimento: number;
  degradacaoAnualPct?: number;
};

export type FinancialResult = {
  economiaMensal: number;
  economiaAnual: number;
  paybackAnos: number | null;
  economia25AnosSemReajuste: number;
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
  const potenciaNecessariaKwp = energiaDiaria / (Math.max(input.horasSolPico, 0.1) * Math.max(performanceRatio, 0.01));
  const quantidadeModulos = Math.ceil((potenciaNecessariaKwp * 1000) / input.potenciaModuloWp);
  const potenciaInstaladaKwp = (quantidadeModulos * input.potenciaModuloWp) / 1000;
  const areaEstimadaM2 = quantidadeModulos * input.areaModuloM2;
  const geracaoMensalEstimadaKwh = potenciaInstaladaKwp * input.horasSolPico * diasMes * performanceRatio;

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

  if (modulosMaxString < modulosMinString) alertas.push({ nivel: "vermelho", texto: "Não há quantidade de módulos por string que atenda simultaneamente à faixa MPPT e à tensão CC máxima." });
  else alertas.push({ nivel: "verde", texto: `Faixa calculada por string: ${modulosMinString} a ${modulosMaxString} módulos.` });

  if (correntePorMpptA > inversor.correnteMaxMpptA) alertas.push({ nivel: "vermelho", texto: `Corrente calculada por MPPT (${correntePorMpptA.toFixed(1)} A) supera o limite do inversor (${inversor.correnteMaxMpptA.toFixed(1)} A).` });
  else alertas.push({ nivel: "verde", texto: `Corrente por MPPT dentro do limite informado (${correntePorMpptA.toFixed(1)} A).` });

  if (inversor.potenciaPvRecomendadaKw && potenciaDcKwp > inversor.potenciaPvRecomendadaKw) {
    alertas.push({ nivel: "vermelho", texto: `Potência CC (${potenciaDcKwp.toFixed(2)} kWp) supera a potência FV recomendada informada (${inversor.potenciaPvRecomendadaKw.toFixed(2)} kWp).` });
  } else if (relacaoCcCa < 0.8) {
    alertas.push({ nivel: "amarelo", texto: `Relação CC/CA baixa (${relacaoCcCa.toFixed(2)}). Verifique subdimensionamento do arranjo CC.` });
  } else if (relacaoCcCa > 1.5) {
    alertas.push({ nivel: "vermelho", texto: `Relação CC/CA elevada (${relacaoCcCa.toFixed(2)}). Confirme o oversizing permitido no datasheet.` });
  } else if (relacaoCcCa > 1.3) {
    alertas.push({ nivel: "amarelo", texto: `Oversizing CC/CA de ${relacaoCcCa.toFixed(2)}. Confirme o limite do fabricante.` });
  } else {
    alertas.push({ nivel: "verde", texto: `Relação CC/CA de ${relacaoCcCa.toFixed(2)} dentro da faixa preliminar.` });
  }

  const temVermelho = alertas.some((a) => a.nivel === "vermelho");
  const temAmarelo = alertas.some((a) => a.nivel === "amarelo");
  return { vocCorrigidaV, vmpQuenteV, modulosMinString, modulosMaxString, correntePorMpptA, relacaoCcCa, potenciaDcKwp, status: temVermelho ? "incompativel" : temAmarelo ? "atencao" : "ok", alertas };
}

export function dimensionarTelhado(input: RoofInput): RoofResult {
  const recuo = Math.max(0, input.recuoM);
  const comprimentoUtilM = Math.max(0, input.comprimentoM - 2 * recuo);
  const larguraUtilM = Math.max(0, input.larguraM - 2 * recuo);
  const comprimentoModuloM = input.orientacaoModulo === "vertical" ? input.modulo.alturaM : input.modulo.larguraM;
  const larguraModuloM = input.orientacaoModulo === "vertical" ? input.modulo.larguraM : input.modulo.alturaM;
  const passoX = comprimentoModuloM + Math.max(0, input.espacamentoM);
  const passoY = larguraModuloM + Math.max(0, input.espacamentoM);
  const colunas = passoX > 0 ? Math.floor((comprimentoUtilM + input.espacamentoM) / passoX) : 0;
  const linhas = passoY > 0 ? Math.floor((larguraUtilM + input.espacamentoM) / passoY) : 0;
  const capacidadeGeometrica = Math.max(0, colunas * linhas);
  const areaBrutaM2 = Math.max(0, input.comprimentoM * input.larguraM);
  const areaUtilM2 = Math.max(0, comprimentoUtilM * larguraUtilM - Math.max(0, input.obstaculosM2));
  const areaModulo = input.modulo.alturaM * input.modulo.larguraM;
  const capacidadePorArea = areaModulo > 0 ? Math.floor(areaUtilM2 / areaModulo) : 0;
  const capacidadeFinal = Math.max(0, Math.min(capacidadeGeometrica, capacidadePorArea));
  const potenciaMaximaKwp = (capacidadeFinal * input.modulo.potenciaWp) / 1000;
  return { comprimentoUtilM, larguraUtilM, areaBrutaM2, areaUtilM2, colunas, linhas, capacidadeGeometrica, capacidadePorArea, capacidadeFinal, potenciaMaximaKwp, comprimentoModuloM, larguraModuloM };
}

export function estimarMateriais(quantidadeModulos: number, colunas: number, linhas: number, distanciaInversorM: number): MaterialEstimate {
  const modulos = Math.max(0, Math.floor(quantidadeModulos));
  const c = Math.max(1, Math.floor(colunas || modulos || 1));
  const l = Math.max(1, Math.floor(linhas || 1));
  const porLinha = Math.max(1, Math.ceil(modulos / l));
  const trilhosM = modulos > 0 ? Math.ceil((porLinha * 1.15 * l * 2) * 10) / 10 : 0;
  const gramposFinais = modulos > 0 ? l * 4 : 0;
  const gramposIntermediarios = modulos > 0 ? Math.max(0, (porLinha - 1) * l * 2) : 0;
  const conectoresMc4Pares = modulos > 0 ? 2 : 0;
  const distancia = Math.max(0, distanciaInversorM);
  const caboSolarPositivoM = Math.ceil((distancia + 5) * 1.15);
  const caboSolarNegativoM = Math.ceil((distancia + 5) * 1.15);
  const etiquetas = modulos > 0 ? 1 : 0;
  return { trilhosM, gramposFinais, gramposIntermediarios, conectoresMc4Pares, caboSolarPositivoM, caboSolarNegativoM, etiquetas };
}

export function analisarFinanceiro(input: FinancialInput): FinancialResult {
  const economiaMensal = Math.max(0, input.geracaoMensalKwh) * Math.max(0, input.tarifaKwh);
  const economiaAnual = economiaMensal * 12;
  const paybackAnos = input.investimento > 0 && economiaAnual > 0 ? input.investimento / economiaAnual : null;
  const degradacao = Math.min(Math.max(input.degradacaoAnualPct ?? 0.5, 0), 5) / 100;
  let economia25AnosSemReajuste = 0;
  for (let ano = 0; ano < 25; ano += 1) economia25AnosSemReajuste += economiaAnual * Math.pow(1 - degradacao, ano);
  return { economiaMensal, economiaAnual, paybackAnos, economia25AnosSemReajuste };
}
