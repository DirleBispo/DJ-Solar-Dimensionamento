import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type BrasilApiCep = {
  cep?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  location?: {
    type?: string;
    coordinates?: {
      longitude?: string | number;
      latitude?: string | number;
    };
  };
};

type PvgisResponse = {
  outputs?: {
    totals?: {
      fixed?: {
        E_y?: number;
      };
    };
  };
};

export async function GET(request: NextRequest) {
  const cep = (request.nextUrl.searchParams.get("cep") ?? "").replace(/\D/g, "");

  if (cep.length !== 8) {
    return NextResponse.json({ error: "Informe um CEP com 8 dígitos." }, { status: 400 });
  }

  try {
    const cepResponse = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!cepResponse.ok) {
      return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 });
    }

    const endereco = (await cepResponse.json()) as BrasilApiCep;
    const latitude = Number(endereco.location?.coordinates?.latitude);
    const longitude = Number(endereco.location?.coordinates?.longitude);

    let hsp: number | null = null;

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const pvgisUrl = new URL("https://re.jrc.ec.europa.eu/api/v5_3/PVcalc");
      pvgisUrl.searchParams.set("lat", String(latitude));
      pvgisUrl.searchParams.set("lon", String(longitude));
      pvgisUrl.searchParams.set("peakpower", "1");
      pvgisUrl.searchParams.set("loss", "0");
      pvgisUrl.searchParams.set("outputformat", "json");

      const solarResponse = await fetch(pvgisUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (solarResponse.ok) {
        const solar = (await solarResponse.json()) as PvgisResponse;
        const energiaAnual = Number(solar.outputs?.totals?.fixed?.E_y);
        if (Number.isFinite(energiaAnual) && energiaAnual > 0) {
          hsp = Number((energiaAnual / 365).toFixed(2));
        }
      }
    }

    return NextResponse.json({
      cep: endereco.cep ?? cep,
      logradouro: endereco.street ?? "",
      bairro: endereco.neighborhood ?? "",
      cidade: endereco.city ?? "",
      uf: endereco.state ?? "",
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      hsp,
      fonteEndereco: "BrasilAPI",
      fonteSolar: hsp ? "PVGIS (JRC/Comissão Europeia)" : null,
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar o endereço agora." }, { status: 502 });
  }
}
