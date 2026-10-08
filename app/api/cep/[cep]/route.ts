type RouteContext = { params: Promise<{ cep: string }> };

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export async function GET(_request: Request, context: RouteContext) {
  const { cep: rawCep } = await context.params;
  const cep = rawCep.replace(/\D/g, "");

  if (cep.length !== 8) {
    return Response.json({ error: "Informe um CEP com 8 dígitos." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) {
      return Response.json({ error: "Não foi possível consultar este CEP agora." }, { status: 502 });
    }

    const address = await response.json() as ViaCepResponse;
    if (address.erro) return Response.json({ error: "CEP não encontrado." }, { status: 404 });

    return Response.json({
      street: address.logradouro ?? "",
      neighborhood: address.bairro ?? "",
      city: address.localidade ?? "",
      state: address.uf ?? "",
      country: "Brasil",
    }, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch {
    return Response.json({ error: "Não foi possível consultar este CEP agora." }, { status: 502 });
  }
}
