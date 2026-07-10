// ViaCEP address lookup (free, no API key). Runs from the browser.
// https://viacep.com.br/

export type CepAddress = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export async function fetchAddressByCep(rawCep: string): Promise<CepAddress> {
  const cep = rawCep.replace(/\D/g, "");
  if (cep.length !== 8) {
    throw new Error("CEP deve ter 8 dígitos");
  }

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!response.ok) {
    throw new Error("Não foi possível consultar o CEP");
  }

  const data = await response.json();
  if (data?.erro) {
    throw new Error("CEP não encontrado");
  }

  return {
    cep,
    street: data.logradouro ?? "",
    neighborhood: data.bairro ?? "",
    city: data.localidade ?? "",
    state: data.uf ?? "",
  };
}
