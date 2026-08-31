"use client";

import { useState } from "react";

export type AddressSolarValue = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  latitude?: number;
  longitude?: number;
  hsp?: number;
};

type Props = {
  value: AddressSolarValue;
  onChange: (value: AddressSolarValue) => void;
  onHspFound?: (hsp: number) => void;
};

export default function ClientAddressSolar({ value, onChange, onHspFound }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const set = (key: keyof AddressSolarValue, next: string | number | undefined) => {
    onChange({ ...value, [key]: next });
  };

  const buscar = async () => {
    const cep = value.cep.replace(/\D/g, "");
    if (cep.length !== 8) {
      setStatus("Informe um CEP válido com 8 dígitos.");
      return;
    }

    setLoading(true);
    setStatus("Buscando endereço e recurso solar...");
    try {
      const response = await fetch(`/api/solar-resource?cep=${cep}`);
      const data = await response.json();

      if (!response.ok) {
        setStatus(data?.error || "Não foi possível consultar o endereço.");
        return;
      }

      const atualizado: AddressSolarValue = {
        ...value,
        cep,
        logradouro: data.endereco?.logradouro || value.logradouro,
        bairro: data.endereco?.bairro || value.bairro,
        cidade: data.endereco?.cidade || value.cidade,
        uf: data.endereco?.uf || value.uf,
        latitude: data.latitude,
        longitude: data.longitude,
        hsp: data.hspMedio,
      };
      onChange(atualizado);
      if (data.hspMedio && onHspFound) onHspFound(Number(data.hspMedio));
      setStatus(data.hspMedio ? `Sol pleno médio estimado: ${Number(data.hspMedio).toFixed(2)} h/dia.` : "Endereço localizado.");
    } catch {
      setStatus("Falha temporária ao consultar endereço e sol pleno.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="address-solar-block">
      <div className="form-grid three">
        <label className="field"><span>CEP</span><input value={value.cep} onChange={(e) => set("cep", e.target.value)} placeholder="18000-000" inputMode="numeric" /></label>
        <label className="field"><span>Logradouro</span><input value={value.logradouro} onChange={(e) => set("logradouro", e.target.value)} /></label>
        <label className="field"><span>Número</span><input value={value.numero} onChange={(e) => set("numero", e.target.value)} /></label>
        <label className="field"><span>Complemento</span><input value={value.complemento} onChange={(e) => set("complemento", e.target.value)} /></label>
        <label className="field"><span>Bairro</span><input value={value.bairro} onChange={(e) => set("bairro", e.target.value)} /></label>
        <label className="field"><span>Cidade</span><input value={value.cidade} onChange={(e) => set("cidade", e.target.value)} /></label>
        <label className="field"><span>UF</span><input value={value.uf} onChange={(e) => set("uf", e.target.value.toUpperCase())} maxLength={2} /></label>
        <label className="field"><span>Sol pleno (HSP)</span><input value={value.hsp ? value.hsp.toFixed(2) : ""} readOnly placeholder="Buscar pelo CEP" /></label>
      </div>
      <div className="address-actions">
        <button type="button" className="secondary" onClick={buscar} disabled={loading}>{loading ? "Buscando..." : "Buscar endereço + sol pleno"}</button>
        {status && <span className="lookup-status">{status}</span>}
      </div>
    </div>
  );
}
