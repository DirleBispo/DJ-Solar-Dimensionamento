import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CepResponse = {
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  location?: {
    type?: string;
    coordinates?: { longitude?: string; latitude?: string };
  };
};

export async function GET(request: NextRequest) {
  const cep = (request.nextUrl.searchParams.get("cep") || "").replace(/\D/g, "");
  if (cep.length !== 8) {
    return NextResponse.json({ error: "Informe um CEP válido com 8 dígitos." }, { status: 400 });
  }

  try {
    const cepResponse = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, { cache: "no-store" });
    if (!cepResponse.ok) {
      return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 });
    }

    const endereco = (await cepResponse.json()) as CepResponse;
    const latitude = Number(endereco.location?.coordinates?.latitude);
    const longitude = Number(endereco.location?.coordinates?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({
        endereco,
        error: "Endereço encontrado, mas sem coordenadas disponíveis para calcular sol pleno.",
      }, { status: 422 });
    }

    const pvgisUrl = new URL("https://re.jrc.ec.europa.eu/api/v5_3/MRcalc");
    pvgisUrl.searchParams.set("lat", String(latitude));
    pvgisUrl.searchParams.set("lon", String(longitude));
    pvgisUrl.searchParams.set("horirrad", "1");
    pvgisUrl.searchParams.set("optrad", "1");
    pvgisUrl.searchParams.set("outputformat", "json");

    const solarResponse = await fetch(pvgisUrl, { cache: "no-store" });
    if (!solarResponse.ok) {
      return NextResponse.json({
        endereco,
        latitude,
        longitude,
        error: "Não foi possível consultar a irradiação solar agora.",
      }, { status: 502 });
    }

    const solar = await solarResponse.json();
    const mensal = Array.isArray(solar?.outputs?.monthly) ? solar.outputs.monthly : [];
    const valores = mensal
      .map((item: any) => Number(item?.["H(h)_m"] ?? item?.["H(i_opt)_m"] ?? 0))
      .filter((valor: number) => Number.isFinite(valor) && valor > 0);

    // PVGIS retorna irradiação mensal em kWh/m². Dividindo pelo número médio de dias,
    // obtemos uma aproximação de Horas de Sol Pleno (kWh/m²/dia ≈ HSP).
    const diasMes = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const hspMensal = valores.map((valor: number, index: number) => valor / (diasMes[index] || 30.44));
    const hspMedio = hspMensal.length
      ? hspMensal.reduce((soma: number, valor: number) => soma + valor, 0) / hspMensal.length
      : 0;

    return NextResponse.json({
      endereco: {
        cep,
        uf: endereco.state || "",
        cidade: endereco.city || "",
        bairro: endereco.neighborhood || "",
        logradouro: endereco.street || "",
      },
      latitude,
      longitude,
      hspMedio: Number(hspMedio.toFixed(2)),
      fonte: "BrasilAPI + PVGIS/JRC",
    });
  } catch {
    return NextResponse.json({ error: "Falha temporária ao consultar endereço e sol pleno." }, { status: 500 });
  }
}
