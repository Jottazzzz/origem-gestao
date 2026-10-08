import { z } from "zod";

export const contractStatuses = ["draft", "active", "expiring", "expired", "ended", "archived"] as const;
export type ContractStatus = typeof contractStatuses[number];
export type StoredContractStatus = "draft" | "active" | "ended" | "archived";

export type ContractEvent = {
  id: string;
  contractId: string;
  type: string;
  description: string;
  actor: string;
  createdAt: string;
};

export type Contract = {
  id: string;
  partyType: "company" | "person";
  legalName: string;
  tradeName: string | null;
  document: string;
  email: string;
  phone: string;
  cep: string;
  street: string;
  streetNumber: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  contractType: string;
  title: string;
  object: string;
  startDate: string;
  endDate: string;
  monthlyValueCents: number;
  paymentTerms: string;
  collectionFrequency: string;
  containerType: "Baldinho" | "Baldão";
  drumQuantity: number;
  responsible: string;
  notes: string | null;
  storedStatus: StoredContractStatus;
  status: ContractStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  events?: ContractEvent[];
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index);
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function isValidCnpj(value: string) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calculate = (base: string) => {
    let factor = base.length - 7;
    let sum = 0;
    for (const char of base) {
      sum += Number(char) * factor;
      factor = factor === 2 ? 9 : factor - 1;
    }
    const result = 11 - (sum % 11);
    return result > 9 ? 0 : result;
  };
  const first = calculate(cnpj.slice(0, 12));
  const second = calculate(`${cnpj.slice(0, 12)}${first}`);
  return first === Number(cnpj[12]) && second === Number(cnpj[13]);
}

const requiredText = (label: string, min = 2, max = 160) => z.string().trim().min(min, `${label} é obrigatório.`).max(max, `${label} excedeu o limite de ${max} caracteres.`);

export const contractInputSchema = z.object({
  partyType: z.enum(["company", "person"]),
  legalName: requiredText("Nome ou razão social", 3),
  tradeName: z.string().trim().max(160),
  document: z.string().trim(),
  email: z.string().trim().email("Informe um e-mail válido.").max(180),
  phone: z.string().trim().refine((value) => onlyDigits(value).length >= 10 && onlyDigits(value).length <= 13, "Informe um telefone válido com DDD."),
  cep: z.string().trim().refine((value) => onlyDigits(value).length === 8, "Informe um CEP com 8 dígitos."),
  street: requiredText("Logradouro", 3),
  streetNumber: requiredText("Número", 1, 20),
  complement: z.string().trim().max(120),
  neighborhood: requiredText("Bairro", 2, 100),
  city: requiredText("Cidade", 2, 100),
  state: z.string().trim().length(2, "Use a sigla do estado com 2 letras."),
  country: requiredText("País", 2, 80),
  contractType: requiredText("Tipo de contrato", 2, 80),
  title: requiredText("Título", 3, 180),
  object: requiredText("Objeto do contrato", 10, 2000),
  startDate: z.string().date("Informe uma data inicial válida."),
  endDate: z.string().date("Informe uma data final válida."),
  monthlyValue: z.number({ message: "Informe o valor mensal." }).positive("O valor mensal deve ser maior que zero.").max(10_000_000),
  paymentTerms: requiredText("Condição de pagamento", 3, 400),
  collectionFrequency: requiredText("Frequência de coleta", 2, 100),
  containerType: z.enum(["Baldinho", "Baldão"]),
  drumQuantity: z.number({ message: "Informe a quantidade de bombonas." }).int().min(1, "Informe ao menos uma bombona.").max(1000),
  responsible: requiredText("Responsável", 3, 160),
  notes: z.string().trim().max(2000),
  status: z.enum(["draft", "active"]),
  actor: z.string().trim().min(2).max(100),
}).superRefine((data, context) => {
  if (data.endDate <= data.startDate) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "A data final deve ser posterior à data inicial." });
  }
  const validDocument = data.partyType === "company" ? isValidCnpj(data.document) : isValidCpf(data.document);
  if (!validDocument) {
    context.addIssue({ code: "custom", path: ["document"], message: data.partyType === "company" ? "Informe um CNPJ válido." : "Informe um CPF válido." });
  }
});

export type ContractInput = z.infer<typeof contractInputSchema>;

export const contractStatusSchema = z.object({
  status: z.enum(["draft", "active", "ended"]),
  actor: z.string().trim().min(2).max(100),
  reason: z.string().trim().min(3, "Informe o motivo da alteração.").max(500),
});

export function effectiveStatus(storedStatus: StoredContractStatus, endDate: string, today = new Date()) : ContractStatus {
  if (storedStatus !== "active") return storedStatus;
  const days = daysUntilEndDate(endDate, today);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "active";
}

const BUSINESS_TIME_ZONE = "America/Cuiaba";

function businessDayTimestamp(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(value("year"), value("month") - 1, value("day"));
}

export function daysUntilEndDate(endDate: string, today = new Date()) {
  const [year, month, day] = endDate.split("-").map(Number);
  if (!year || !month || !day) return 0;
  return Math.round((Date.UTC(year, month - 1, day) - businessDayTimestamp(today)) / 86_400_000);
}

export function contractDeadlineLabel(status: ContractStatus, endDate: string, today = new Date()) {
  if (status === "expiring" || status === "expired") {
    const days = daysUntilEndDate(endDate, today);
    if (days === 0) return "Vence hoje";
    if (days === 1) return "Vence em 1 dia";
    if (days > 1) return `Vence em ${days} dias`;
    const overdueDays = Math.abs(days);
    return overdueDays === 1 ? "Vencido há 1 dia" : `Vencido há ${overdueDays} dias`;
  }
  return null;
}

export function maskCpfCnpj(value: string, type: "company" | "person") {
  const digits = onlyDigits(value).slice(0, type === "company" ? 14 : 11);
  if (type === "company") return digits.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  return digits.replace(/^(\d{3})(\d)/, "$1.$2").replace(/\.(\d{3})(\d)/, ".$1.$2").replace(/(\d{3})(\d)/, "$1-$2");
}

export const maskCep = (value: string) => onlyDigits(value).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
export const maskPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 13).replace(/^55/, "");
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function formatIsoDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}
