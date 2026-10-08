"use client";

import { cloneElement, isValidElement, useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Archive, Building2, CalendarClock, Check, ChevronLeft, ChevronRight, CircleAlert,
  Download, Eye, FilePenLine, FilePlus2, FileSignature, Filter, History, LoaderCircle,
  MapPin, Pencil, Plus, RefreshCw, Search, ShieldCheck,
  UserRound, WalletCards,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ContractsStore } from "@/hooks/use-contracts";
import {
  contractDeadlineLabel, contractInputSchema, effectiveStatus, formatCurrency, formatIsoDate, maskCep, maskCpfCnpj, maskPhone,
  type Contract, type ContractInput, type ContractStatus,
} from "@/lib/contracts";

const STATUS: Record<ContractStatus, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-stone-100 text-stone-700 border-stone-200" },
  active: { label: "Ativo", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  expiring: { label: "Próximo do vencimento", className: "bg-amber-100 text-amber-900 border-amber-200" },
  expired: { label: "Vencido", className: "bg-red-100 text-red-800 border-red-200" },
  ended: { label: "Encerrado", className: "bg-slate-100 text-slate-700 border-slate-200" },
  archived: { label: "Arquivado", className: "bg-stone-100 text-stone-500 border-stone-200" },
};

const DEFAULTS: ContractInput = {
  partyType: "company", legalName: "", tradeName: "", document: "", email: "", phone: "",
  cep: "", street: "", streetNumber: "", complement: "", neighborhood: "", city: "Cuiabá",
  state: "MT", country: "Brasil",
  contractType: "Prestação de serviços de compostagem", title: "", object: "",
  startDate: "", endDate: "", monthlyValue: 0, paymentTerms: "Pagamento mensal via boleto",
  collectionFrequency: "Semanal", containerType: "Baldão", drumQuantity: 1, responsible: "Gestor", notes: "", status: "draft", actor: "Gestor",
};

function statusFor(contract: Contract, currentTime: Date) {
  return effectiveStatus(contract.storedStatus, contract.endDate, currentTime);
}

function labelFor(contract: Contract, currentTime: Date, status = statusFor(contract, currentTime)) {
  return contractDeadlineLabel(status, contract.endDate, currentTime) ?? STATUS[status].label;
}

function inputFromContract(contract: Contract, actor: string): ContractInput {
  return {
    partyType: contract.partyType, legalName: contract.legalName, tradeName: contract.tradeName ?? "",
    document: maskCpfCnpj(contract.document, contract.partyType), email: contract.email, phone: maskPhone(contract.phone),
    cep: maskCep(contract.cep), street: contract.street, streetNumber: contract.streetNumber,
    complement: contract.complement ?? "", neighborhood: contract.neighborhood, city: contract.city,
    state: contract.state, country: contract.country, contractType: contract.contractType, title: contract.title, object: contract.object,
    startDate: contract.startDate, endDate: contract.endDate, monthlyValue: contract.monthlyValueCents / 100,
    paymentTerms: contract.paymentTerms, collectionFrequency: contract.collectionFrequency, containerType: contract.containerType,
    drumQuantity: contract.drumQuantity, responsible: contract.responsible, notes: contract.notes ?? "",
    status: contract.storedStatus === "draft" ? "draft" : "active", actor,
  };
}

export function ContractWorkspace({ store, actor, canArchive, onAudit }: { store: ContractsStore; actor: string; canArchive: boolean; onAudit: (action: string, detail: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ContractStatus>("all");
  const [formContract, setFormContract] = useState<Contract | "new" | null>(null);
  const [detail, setDetail] = useState<Contract | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ contract: Contract; status: "draft" | "active" | "ended" } | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<Contract | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const refreshClock = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(refreshClock);
  }, []);

  const visible = useMemo(() => store.contracts.filter((contract) => {
    const text = `${contract.legalName} ${contract.tradeName ?? ""} ${contract.document} ${contract.title}`.toLowerCase();
    const status = statusFor(contract, currentTime);
    const matchesStatus = filter === "all" ? status !== "archived" : status === filter;
    return text.includes(query.toLowerCase()) && matchesStatus;
  }), [store.contracts, query, filter, currentTime]);
  const active = store.contracts.filter((item) => ["active", "expiring", "expired"].includes(statusFor(item, currentTime)));
  const recurring = active.reduce((sum, item) => sum + item.monthlyValueCents, 0);

  const openDetail = async (contract: Contract) => {
    setDetail(contract); setDetailLoading(true);
    try { setDetail(await store.get(contract.id)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível abrir o contrato."); }
    finally { setDetailLoading(false); }
  };

  const exportCsv = () => {
    const rows = [["Cliente", "Documento", "Título", "Início", "Término", "Valor mensal", "Status"], ...visible.map((item) => [item.legalName, item.document, item.title, item.startDate, item.endDate, (item.monthlyValueCents / 100).toFixed(2), labelFor(item, currentTime)])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
    link.download = "contratos-origem.csv"; link.click(); URL.revokeObjectURL(link.href);
    toast.success("Arquivo de contratos gerado.");
  };

  const applyStatus = async () => {
    if (!statusTarget || statusReason.trim().length < 3) return toast.error("Informe o motivo da alteração.");
    setSaving(true);
    try {
      const updated = await store.changeStatus(statusTarget.contract.id, statusTarget.status, actor, statusReason);
      setDetail(await store.get(updated.id));
      onAudit("Status contratual alterado", `${updated.legalName} — ${STATUS[updated.status].label}`);
      toast.success("Status atualizado e registrado no histórico."); setStatusTarget(null); setStatusReason("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível alterar o status."); }
    finally { setSaving(false); }
  };

  const archive = async () => {
    if (!archiveTarget || archiveReason.trim().length < 3) return toast.error("Informe o motivo do arquivamento.");
    setSaving(true);
    try {
      await store.archive(archiveTarget.id, actor, archiveReason); onAudit("Contrato arquivado", archiveTarget.legalName);
      setArchiveTarget(null); setArchiveReason(""); setDetail(null); toast.success("Contrato arquivado.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível arquivar."); }
    finally { setSaving(false); }
  };

  return <>
    <div className="module-heading"><div><span>Relacionamento B2B</span><h1>Contratos e clientes</h1><p>Cadastre, acompanhe vigências e registre decisões contratuais em um único fluxo.</p></div></div>
    <div className="contract-summary">
      <div><FileSignature /><span>Contratos vigentes<strong>{active.length}</strong></span></div>
      <div><CalendarClock /><span>Decisão necessária<strong>{store.contracts.filter((item) => ["expiring", "expired"].includes(item.status)).length}</strong></span></div>
      <div><WalletCards /><span>Receita mensal<strong>{formatCurrency(recurring)}</strong></span></div>
    </div>
    <section className="panel mt-5">
      <div className="contract-toolbar"><div><h2 className="panel-title">Carteira contratual</h2><p className="panel-subtitle">Dados persistidos no banco e ordenados pelo vencimento</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={exportCsv} disabled={!visible.length}><Download />Exportar CSV</Button><Button onClick={() => setFormContract("new")}><FilePlus2 />Cadastrar</Button></div></div>
      <div className="contract-filters"><div className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-stone-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por cliente, documento ou título" className="pl-9" /></div><Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}><SelectTrigger className="w-full sm:w-[270px]"><Filter /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos, exceto arquivados</SelectItem>{Object.entries(STATUS).map(([key, item]) => <SelectItem key={key} value={key}>{item.label}</SelectItem>)}</SelectContent></Select></div>
      {store.loading ? <ContractLoading /> : store.error ? <ContractError message={store.error} retry={store.load} /> : visible.length === 0 ? <ContractEmpty filtered={Boolean(query || filter !== "all")} create={() => setFormContract("new")} /> : <div className="contract-table-wrap"><Table className="mobile-contract-table"><TableHeader><TableRow><TableHead className="pl-5">Cliente</TableHead><TableHead>Contrato</TableHead><TableHead>Vigência</TableHead><TableHead>Valor mensal</TableHead><TableHead>Status</TableHead><TableHead className="pr-5 text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{visible.map((contract) => { const status = statusFor(contract, currentTime); return <TableRow key={contract.id} className="mobile-contract-row"><TableCell className="mobile-contract-client pl-5"><div className="client-cell"><span>{contract.legalName.slice(0, 2).toUpperCase()}</span><div><strong>{contract.tradeName || contract.legalName}</strong><small>{contract.partyType === "company" ? "CNPJ" : "CPF"}: {maskCpfCnpj(contract.document, contract.partyType)}</small></div></div></TableCell><TableCell className="mobile-contract-title"><strong className="block max-w-[260px] truncate">{contract.title}</strong><small className="text-stone-500">{contract.collectionFrequency} • {contract.drumQuantity} {contract.containerType.toLowerCase()}(s)</small></TableCell><TableCell className="mobile-contract-date">{formatIsoDate(contract.endDate)}<small className="block text-stone-500">desde {formatIsoDate(contract.startDate)}</small></TableCell><TableCell className="mobile-contract-value font-semibold">{formatCurrency(contract.monthlyValueCents)}</TableCell><TableCell className="mobile-contract-status"><Badge variant="outline" className={STATUS[status].className}>{labelFor(contract, currentTime, status)}</Badge></TableCell><TableCell className="mobile-contract-actions pr-5"><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => void openDetail(contract)}><Eye />Ver</Button><Button variant="ghost" size="icon-sm" aria-label={`Editar ${contract.legalName}`} onClick={() => setFormContract(contract)}><Pencil /></Button></div></TableCell></TableRow>; })}</TableBody></Table></div>}
    </section>
    <ContractForm key={formContract === "new" ? "new" : formContract?.id ?? "closed"} open={formContract !== null} contract={formContract === "new" ? null : formContract} actor={actor} saving={saving} close={() => setFormContract(null)} save={async (input) => {
      setSaving(true);
      try {
        const saved = formContract && formContract !== "new" ? await store.update(formContract.id, input) : await store.create(input);
        onAudit(formContract === "new" ? "Contrato cadastrado" : "Contrato atualizado", saved.legalName);
        toast.success(formContract === "new" ? "Contrato cadastrado com sucesso." : "Contrato atualizado com sucesso.");
      } finally { setSaving(false); }
    }} />
    <ContractDetail contract={detail ? { ...detail, status: statusFor(detail, currentTime) } : null} deadlineLabel={detail ? labelFor(detail, currentTime) : ""} canArchive={canArchive && detail?.storedStatus !== "archived"} loading={detailLoading} open={detail !== null} close={() => setDetail(null)} edit={() => { if (detail) { setFormContract(detail); setDetail(null); } }} changeStatus={(status) => detail && setStatusTarget({ contract: detail, status })} archive={() => detail && setArchiveTarget(detail)} />
    <StatusDialog target={statusTarget} reason={statusReason} setReason={setStatusReason} saving={saving} close={() => setStatusTarget(null)} confirm={() => void applyStatus()} />
    <AlertDialog open={archiveTarget !== null} onOpenChange={(open) => !open && setArchiveTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Arquivar este contrato?</AlertDialogTitle><AlertDialogDescription>O registro deixará a carteira ativa, mas permanecerá preservado no banco. Esta ação exige justificativa.</AlertDialogDescription></AlertDialogHeader><Textarea value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} placeholder="Motivo do arquivamento" /><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={saving || archiveReason.trim().length < 3} onClick={() => void archive()}>{saving ? <LoaderCircle className="animate-spin" /> : <Archive />}Arquivar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}

function ContractForm({ open, contract, actor, saving, close, save }: { open: boolean; contract: Contract | null; actor: string; saving: boolean; close: () => void; save: (input: ContractInput) => Promise<void> }) {
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "found" | "error">("idle");
  const [cepMessage, setCepMessage] = useState("");
  const form = useForm<ContractInput>({ resolver: zodResolver(contractInputSchema), defaultValues: contract ? inputFromContract(contract, actor) : { ...DEFAULTS, actor, responsible: actor } });
  // eslint-disable-next-line react-hooks/incompatible-library -- API oficial do React Hook Form para campos condicionais
  const partyType = form.watch("partyType");
  const cep = form.watch("cep");
  // Mantém as etapas seguintes e a revisão sincronizadas com o formulário.
  const values = form.watch();
  const errors = form.formState.errors;
  const partyFields: (keyof ContractInput)[] = ["partyType", "legalName", "document", "email", "phone", "cep", "street", "streetNumber", "neighborhood", "city", "state", "country"];
  const contractFields: (keyof ContractInput)[] = ["contractType", "title", "object", "startDate", "endDate", "monthlyValue", "paymentTerms", "collectionFrequency", "containerType", "drumQuantity", "responsible", "status"];

  const next = async () => {
    const valid = await form.trigger(step === 0 ? partyFields : contractFields);
    if (valid) setStep((current) => Math.min(2, current + 1));
    else toast.error("Revise os campos destacados antes de continuar.");
  };
  const submit = async (input: ContractInput) => {
    if (saved) return;
    await save(input);
    setSaved(true);
  };
  useEffect(() => {
    const normalizedCep = cep.replace(/\D/g, "");
    if (normalizedCep.length !== 8) {
      setCepStatus("idle");
      setCepMessage("");
      return;
    }

    const controller = new AbortController();
    setCepStatus("loading");
    setCepMessage("Buscando endereço pelo CEP...");

    void fetch(`/api/cep/${normalizedCep}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { street?: string; neighborhood?: string; city?: string; state?: string; country?: string; error?: string };
        if (!response.ok) throw new Error(result.error ?? "CEP não encontrado.");
        if (result.street) form.setValue("street", result.street, { shouldValidate: true });
        if (result.neighborhood) form.setValue("neighborhood", result.neighborhood, { shouldValidate: true });
        if (result.city) form.setValue("city", result.city, { shouldValidate: true });
        if (result.state) form.setValue("state", result.state, { shouldValidate: true });
        if (result.country) form.setValue("country", result.country, { shouldValidate: true });
        setCepStatus("found");
        setCepMessage("Endereço preenchido. Informe o número e complemente se necessário.");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCepStatus("error");
        setCepMessage(error instanceof Error ? error.message : "Não foi possível consultar o CEP.");
      });

    return () => controller.abort();
  }, [cep, form]);

  return <Dialog open={open} onOpenChange={(value) => { if (!value && !saving) close(); }}><DialogContent className="contract-form-dialog"><DialogHeader><DialogTitle>{saved ? (contract ? "Contrato atualizado" : "Contrato cadastrado") : contract ? "Editar contrato" : "Novo contrato"}</DialogTitle><DialogDescription>{saved ? "As informações foram salvas no banco. Feche esta janela quando terminar a conferência." : step === 0 ? "Identifique o cliente e confirme a localização." : step === 1 ? "Defina a vigência e as condições operacionais." : "Revise antes de salvar no banco."}</DialogDescription></DialogHeader><div className="form-steps">{["Cliente", "Contrato", saved ? "Concluído" : "Revisão"].map((label, index) => <div key={label} className={index <= step ? "active" : ""}><span>{index < step || saved && index === 2 ? <Check /> : index + 1}</span><strong>{label}</strong></div>)}</div><form onSubmit={form.handleSubmit(submit)}>
    {step === 0 && <div className="contract-form-grid">
      <FormSelect label="Tipo de cliente" value={partyType} onChange={(value) => { form.setValue("partyType", value as "company" | "person"); form.setValue("document", ""); }} options={[{ value: "company", label: "Pessoa jurídica" }, { value: "person", label: "Pessoa física" }]} />
      <FormField label={partyType === "company" ? "CNPJ" : "CPF"} error={errors.document?.message}><Input value={form.watch("document")} onChange={(event) => form.setValue("document", maskCpfCnpj(event.target.value, partyType), { shouldValidate: form.formState.isSubmitted })} placeholder={partyType === "company" ? "00.000.000/0000-00" : "000.000.000-00"} /></FormField>
      <FormField label={partyType === "company" ? "Razão social" : "Nome completo"} error={errors.legalName?.message} wide><Input {...form.register("legalName")} /></FormField>
      {partyType === "company" && <FormField label="Nome fantasia" error={errors.tradeName?.message} wide><Input {...form.register("tradeName")} /></FormField>}
      <FormField label="E-mail" error={errors.email?.message}><Input type="email" {...form.register("email")} /></FormField>
      <FormField label="Telefone / WhatsApp" error={errors.phone?.message}><Input value={form.watch("phone")} onChange={(event) => form.setValue("phone", maskPhone(event.target.value), { shouldValidate: form.formState.isSubmitted })} placeholder="(65) 99999-9999" /></FormField>
      <FormField label="CEP" error={errors.cep?.message}><Input value={cep} onChange={(event) => form.setValue("cep", maskCep(event.target.value), { shouldValidate: form.formState.isSubmitted })} placeholder="00000-000" />{cepStatus !== "idle" && <p className={`cep-feedback ${cepStatus}`} aria-live="polite">{cepStatus === "loading" && <LoaderCircle className="animate-spin" />}{cepMessage}</p>}</FormField>
      <FormField label="Logradouro" error={errors.street?.message}><Input {...form.register("street")} /></FormField>
      <FormField label="Número" error={errors.streetNumber?.message}><Input {...form.register("streetNumber")} /></FormField>
      <FormField label="Complemento" error={errors.complement?.message}><Input {...form.register("complement")} /></FormField>
      <FormField label="Bairro" error={errors.neighborhood?.message}><Input {...form.register("neighborhood")} /></FormField>
      <FormField label="Cidade" error={errors.city?.message}><Input {...form.register("city")} /></FormField>
      <FormField label="UF" error={errors.state?.message}><Input maxLength={2} {...form.register("state")} /></FormField>
      <FormField label="País" error={errors.country?.message}><Input {...form.register("country")} /></FormField>
    </div>}
    {step === 1 && <div className="contract-form-grid">
      <FormSelect label="Tipo de contrato" value={values.contractType} onChange={(value) => form.setValue("contractType", value, { shouldValidate: true })} options={[{ value: "Prestação de serviços de compostagem", label: "Prestação de serviços" }, { value: "Contrato para evento", label: "Evento" }, { value: "Aditivo contratual", label: "Aditivo" }]} />
      {contract?.storedStatus === "ended" ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600"><strong className="block text-slate-800">Contrato encerrado</strong>Editar os dados não reativa o vínculo. Use “Reativar” na tela de detalhes para mudar o status.</div> : <FormSelect label={contract ? "Situação ao salvar" : "Situação inicial"} value={values.status} onChange={(value) => form.setValue("status", value as "draft" | "active")} options={[{ value: "draft", label: "Salvar como rascunho" }, { value: "active", label: "Ativar ao salvar" }]} />}
      <FormField label="Título do contrato" error={errors.title?.message} wide><Input {...form.register("title")} placeholder="Ex.: Gestão de resíduos orgânicos — Unidade Centro" /></FormField>
      <FormField label="Objeto do contrato" error={errors.object?.message} wide><Textarea rows={4} {...form.register("object")} placeholder="Descreva o serviço, escopo e finalidade do vínculo." /></FormField>
      <FormField label="Início" error={errors.startDate?.message}><Input type="date" {...form.register("startDate")} /></FormField>
      <FormField label="Término" error={errors.endDate?.message}><Input type="date" {...form.register("endDate")} /></FormField>
      <FormField label="Valor mensal (R$)" error={errors.monthlyValue?.message}><Input type="number" min="0.01" step="0.01" {...form.register("monthlyValue", { valueAsNumber: true })} /></FormField>
      <FormSelect label="Recipiente cedido" value={values.containerType} onChange={(value) => form.setValue("containerType", value as "Baldinho" | "Baldão", { shouldValidate: true })} options={[{ value: "Baldinho", label: "Baldinho" }, { value: "Baldão", label: "Baldão" }]} />
      <FormField label="Quantidade cedida" error={errors.drumQuantity?.message}><Input type="number" min="1" {...form.register("drumQuantity", { valueAsNumber: true })} /></FormField>
      <FormSelect label="Frequência de coleta" value={values.collectionFrequency} onChange={(value) => form.setValue("collectionFrequency", value, { shouldValidate: true })} options={["Semanal", "2x por semana", "3x por semana", "Quinzenal", "Mensal", "Sob demanda"].map((value) => ({ value, label: value }))} />
      <FormField label="Responsável interno" error={errors.responsible?.message}><Input {...form.register("responsible")} /></FormField>
      <FormField label="Condições de pagamento" error={errors.paymentTerms?.message} wide><Textarea {...form.register("paymentTerms")} /></FormField>
      <FormField label="Observações" error={errors.notes?.message} wide><Textarea {...form.register("notes")} placeholder="Condições ou informações complementares" /></FormField>
    </div>}
    {step === 2 && <ContractReview values={values} saved={saved} />}
    <DialogFooter className="contract-form-footer">{saved ? <Button type="button" onClick={close}><Check />Fechar janela</Button> : <><Button type="button" variant="outline" onClick={() => step === 0 ? close() : setStep((current) => current - 1)} disabled={saving}><ChevronLeft />{step === 0 ? "Cancelar" : "Voltar"}</Button>{step < 2 ? <Button type="button" onClick={() => void next()}>Continuar<ChevronRight /></Button> : <Button type="submit" disabled={saving}>{saving ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}{contract ? "Salvar alterações" : "Salvar contrato"}</Button>}</>}</DialogFooter>
  </form></DialogContent></Dialog>;
}

function ContractReview({ values, saved }: { values: ContractInput; saved: boolean }) {
  return <div className="contract-review"><div className={`review-callout ${saved ? "saved" : ""}`}><ShieldCheck /><div><strong>{saved ? "Contrato salvo com sucesso" : "Pronto para salvar"}</strong><p>{saved ? "Os dados abaixo já estão persistidos e o histórico da operação foi atualizado." : "Confira os dados abaixo. O contrato será persistido no banco e toda mudança posterior ficará registrada no histórico."}</p></div></div><div className="review-grid"><ReviewSection icon={values.partyType === "company" ? Building2 : UserRound} title="Cliente"><p><strong>{values.tradeName || values.legalName}</strong></p><p>{values.legalName}</p><p>{values.document}</p><p>{values.email} • {values.phone}</p></ReviewSection><ReviewSection icon={FileSignature} title="Contrato"><p><strong>{values.title}</strong></p><p>{values.contractType}</p><p>{formatIsoDate(values.startDate)} a {formatIsoDate(values.endDate)}</p><p>{formatCurrency(Math.round(values.monthlyValue * 100))} por mês</p></ReviewSection><ReviewSection icon={MapPin} title="Endereço"><p>{values.street}, {values.streetNumber}{values.complement ? ` — ${values.complement}` : ""}</p><p>{values.neighborhood}, {values.city}/{values.state}</p><p>CEP {values.cep}</p></ReviewSection><ReviewSection icon={RefreshCw} title="Operação"><p>{values.collectionFrequency}</p><p>{values.drumQuantity} {values.containerType.toLowerCase()}(s)</p><p>Responsável: {values.responsible}</p><p>{saved ? (values.status === "active" ? "Contrato ativo" : "Contrato em rascunho") : values.status === "active" ? "Será ativado" : "Será salvo como rascunho"}</p></ReviewSection></div></div>;
}

function ReviewSection({ icon: Icon, title, children }: { icon: typeof Building2; title: string; children: ReactNode }) { return <section><div><Icon /><strong>{title}</strong></div>{children}</section>; }

function ContractDetail({ contract, deadlineLabel, canArchive, loading, open, close, edit, changeStatus, archive }: { contract: Contract | null; deadlineLabel: string; canArchive: boolean; loading: boolean; open: boolean; close: () => void; edit: () => void; changeStatus: (status: "draft" | "active" | "ended") => void; archive: () => void }) {
  return <Sheet open={open} onOpenChange={(value) => !value && close()}><SheetContent className="contract-detail-sheet"><SheetHeader>{contract && <><div className="flex items-center gap-2"><Badge variant="outline" className={STATUS[contract.status].className}>{deadlineLabel}</Badge><span className="text-xs text-stone-500">Atualizado em {new Date(contract.updatedAt).toLocaleDateString("pt-BR")}</span></div><SheetTitle>{contract.title}</SheetTitle><SheetDescription>{contract.tradeName || contract.legalName}</SheetDescription></>}</SheetHeader>{loading || !contract ? <div className="p-6"><Skeleton className="h-8 w-2/3" /><Skeleton className="mt-4 h-40 w-full" /></div> : <div className="contract-detail-body"><Tabs defaultValue="overview"><TabsList><TabsTrigger value="overview">Resumo</TabsTrigger><TabsTrigger value="client">Cliente</TabsTrigger><TabsTrigger value="history">Histórico</TabsTrigger></TabsList><TabsContent value="overview" className="detail-sections"><DetailSection title="Vigência e valor"><DetailRow label="Período" value={`${formatIsoDate(contract.startDate)} a ${formatIsoDate(contract.endDate)}`} /><DetailRow label="Prazo" value={deadlineLabel} /><DetailRow label="Mensalidade" value={formatCurrency(contract.monthlyValueCents)} /><DetailRow label="Pagamento" value={contract.paymentTerms} /></DetailSection><DetailSection title="Operação"><DetailRow label="Coletas" value={contract.collectionFrequency} /><DetailRow label="Recipientes" value={`${contract.drumQuantity} ${contract.containerType.toLowerCase()}(s)`} /><DetailRow label="Responsável" value={contract.responsible} /></DetailSection><DetailSection title="Objeto"><p>{contract.object}</p></DetailSection>{contract.notes && <DetailSection title="Observações"><p>{contract.notes}</p></DetailSection>}</TabsContent><TabsContent value="client" className="detail-sections"><DetailSection title="Identificação"><DetailRow label={contract.partyType === "company" ? "Razão social" : "Nome"} value={contract.legalName} /><DetailRow label={contract.partyType === "company" ? "CNPJ" : "CPF"} value={maskCpfCnpj(contract.document, contract.partyType)} /><DetailRow label="E-mail" value={contract.email} /><DetailRow label="Telefone" value={maskPhone(contract.phone)} /></DetailSection><DetailSection title="Endereço"><p>{contract.street}, {contract.streetNumber}{contract.complement ? ` — ${contract.complement}` : ""}</p><p>{contract.neighborhood}, {contract.city}/{contract.state} — CEP {maskCep(contract.cep)}</p></DetailSection></TabsContent><TabsContent value="history"><div className="contract-history">{contract.events?.length ? contract.events.map((event) => <div key={event.id}><span><History /></span><div><strong>{event.description}</strong><p>{event.actor} • {new Date(event.createdAt).toLocaleString("pt-BR")}</p></div></div>) : <p className="p-6 text-sm text-stone-500">Nenhum evento registrado.</p>}</div></TabsContent></Tabs></div>}<SheetFooter><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={edit}><FilePenLine />Editar</Button>{contract?.status === "draft" && <Button onClick={() => changeStatus("active")}><Check />Ativar</Button>}{contract && ["active", "expiring", "expired"].includes(contract.status) && <Button variant="outline" className="text-red-700" onClick={() => changeStatus("ended")}><CircleAlert />Encerrar</Button>}{contract?.status === "ended" && <Button onClick={() => changeStatus("active")}><RefreshCw />Reativar</Button>}{canArchive && <Button variant="ghost" className="col-span-2 text-stone-500" onClick={archive}><Archive />Arquivar registro</Button>}</div></SheetFooter></SheetContent></Sheet>;
}

function StatusDialog({ target, reason, setReason, saving, close, confirm }: { target: { contract: Contract; status: "draft" | "active" | "ended" } | null; reason: string; setReason: (value: string) => void; saving: boolean; close: () => void; confirm: () => void }) {
  const label = target?.status === "active" ? "ativar" : target?.status === "ended" ? "encerrar" : "voltar para rascunho";
  return <Dialog open={target !== null} onOpenChange={(open) => !open && close()}><DialogContent><DialogHeader><DialogTitle>Confirmar alteração de status</DialogTitle><DialogDescription>Informe por que deseja {label} este contrato. A justificativa ficará no histórico.</DialogDescription></DialogHeader><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo da alteração" /><DialogFooter><Button variant="outline" onClick={close}>Cancelar</Button><Button onClick={confirm} disabled={saving || reason.trim().length < 3}>{saving ? <LoaderCircle className="animate-spin" /> : <Check />}Confirmar</Button></DialogFooter></DialogContent></Dialog>;
}

function ContractLoading() { return <div className="space-y-3 p-5">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div>; }
function ContractError({ message, retry }: { message: string; retry: () => Promise<void> }) { return <Empty className="m-5 border"><EmptyHeader><EmptyMedia variant="icon"><CircleAlert /></EmptyMedia><EmptyTitle>Não foi possível carregar os contratos</EmptyTitle><EmptyDescription>{message}</EmptyDescription></EmptyHeader><EmptyContent><Button onClick={() => void retry()}><RefreshCw />Tentar novamente</Button></EmptyContent></Empty>; }
function ContractEmpty({ filtered, create }: { filtered: boolean; create: () => void }) { return <Empty className="m-5 border"><EmptyHeader><EmptyMedia variant="icon"><FileSignature /></EmptyMedia><EmptyTitle>{filtered ? "Nenhum contrato encontrado" : "Nenhum contrato cadastrado"}</EmptyTitle><EmptyDescription>{filtered ? "Altere a busca ou o filtro para encontrar outro registro." : "Cadastre o primeiro contrato para iniciar o controle de vigências e alertas."}</EmptyDescription></EmptyHeader>{!filtered && <EmptyContent><Button onClick={create}><Plus />Cadastrar primeiro contrato</Button></EmptyContent>}</Empty>; }
function FormField({ label, error, wide, children }: { label: string; error?: string; wide?: boolean; children: ReactNode }) {
  const control = isValidElement(children) ? cloneElement(children as ReactElement<Record<string, unknown>>, { "aria-label": label, "aria-invalid": Boolean(error) }) : children;
  return <div className={wide ? "sm:col-span-2" : ""}><Label>{label}</Label><div className="mt-2">{control}</div>{error && <p className="form-error" role="alert">{error}</p>}</div>;
}
function FormSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) { return <div><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="mt-2 w-full"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>; }
function DetailSection({ title, children }: { title: string; children: ReactNode }) { return <section><h3>{title}</h3><div>{children}</div></section>; }
function DetailRow({ label, value }: { label: string; value: string }) { return <p className="detail-row"><span>{label}</span><strong>{value}</strong></p>; }
