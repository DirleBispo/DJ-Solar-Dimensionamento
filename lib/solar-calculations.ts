export type SolarInput = {
  consumoMensalKwh: number;
  horasSolPico: number;
  performanceRatio: number;
  potenciaModuloWp: number;
  areaModuloM2: number;
};

export type SolarResult = {
  potenciaNecessariaKwp: number;
  quantidadeModulos: number;
  potenciaInstaladaKwp: number;
  areaEstimadaM2: number;
  geracaoMensalEstimadaKwh: number;
};

export function dimensionarSistema(input: SolarInput): SolarResult {
  const diasMes = 30;
  const energiaDiaria = input.consumoMensalKwh / diasMes;
  const potenciaNecessariaKwp = energiaDiaria / (input.horasSolPico * input.performanceRatio);
  const quantidadeModulos = Math.ceil((potenciaNecessariaKwp * 1000) / input.potenciaModuloWp);
  const potenciaInstaladaKwp = (quantidadeModulos * input.potenciaModuloWp) / 1000;
  const areaEstimadaM2 = quantidadeModulos * input.areaModuloM2;
  const geracaoMensalEstimadaKwh =
    potenciaInstaladaKwp * input.horasSolPico * diasMes * input.performanceRatio;

  return {
    potenciaNecessariaKwp,
    quantidadeModulos,
    potenciaInstaladaKwp,
    areaEstimadaM2,
    geracaoMensalEstimadaKwh,
  };
}
