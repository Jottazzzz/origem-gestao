"use client"

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import Image from "next/image"
import origemLogoUrl from "../public/favicon-orange-hd.png?inline"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle, Bell, CalendarClock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Building2, CircleAlert, ClipboardCheck, Clock3, ExternalLink,
  Download, Eye, EyeOff, FileSignature, Gauge, History, LayoutDashboard, ListFilter, LockKeyhole, LogOut, MapPin,
  MapPinned, MessageCircle, PackageOpen, Pencil, Plus, Recycle, RefreshCw, Repeat2,
  RotateCcw, Scale, Search, Settings2, ShieldCheck, Sprout, Thermometer, TrendingUp,
  Trash2, Truck, Users, Waves,
} from "lucide-react"
import { toast } from "sonner"

import { ContractWorkspace } from "@/components/contracts/contract-workspace"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toaster } from "@/components/ui/sonner"
import { useContracts } from "@/hooks/use-contracts"
import { effectiveStatus, formatIsoDate, type Contract } from "@/lib/contracts"

type View = "dashboard" | "alertas" | "leiras" | "coletas" | "contratos" | "impacto" | "auditoria"
type Role = "Gestor" | "Administrativo"
type AuthUser = { id: string; username: string; displayName: string; role: Role; mustChangePassword: boolean }
type AuditCategory = "Geral" | "Coletas" | "Rotas" | "Leiras" | "Contratos" | "Configuração"
type Pile = {
  id: number; temperature: number; humidity: number; measuredAt: string; turnedAt: string
}
type Collection = {
  id: number; client: string; when: string; route: string; weight: number | null;
  status: "Planejada" | "Realizada" | "Pendente" | "Reagendada"; note: string;
  date: string; time: string; bombs: number; bombType: string; address: string;
  contactName: string; whatsapp: string; accessInstructions: string;
  recurrence: "Não repetir" | "Semanal" | "2x por semana" | "Quinzenal" | "Mensal"
}
type Route = { id: number; name: string; area: string; day: string }
type AuditEntry = { id: number; action: string; detail: string; user: string; at: string; category: AuditCategory }
type DeleteTarget = { kind: "coleta" | "rota" | "leira"; id: number; label: string }

const PILES: Pile[] = [
  { id: 1, temperature: 38.6, humidity: 62, measuredAt: "Hoje, 08:40", turnedAt: "24/08" },
  { id: 2, temperature: 41.2, humidity: 58, measuredAt: "Hoje, 08:32", turnedAt: "25/08" },
  { id: 3, temperature: 45.8, humidity: 55, measuredAt: "Ontem, 16:15", turnedAt: "28/08" },
  { id: 4, temperature: 39.4, humidity: 66, measuredAt: "Hoje, 08:18", turnedAt: "23/08" },
  { id: 5, temperature: 43.1, humidity: 59, measuredAt: "Ontem, 16:08", turnedAt: "27/08" },
  { id: 6, temperature: 40, humidity: 61, measuredAt: "Hoje, 08:05", turnedAt: "22/08" },
  { id: 7, temperature: 47.3, humidity: 53, measuredAt: "Ontem, 15:52", turnedAt: "29/08" },
  { id: 8, temperature: 42, humidity: 57, measuredAt: "Hoje, 07:55", turnedAt: "26/08" },
]

const COLLECTIONS: Collection[] = [
  { id: 1, client: "[DEMO] Cliente A", when: "02/09/2026, 09:00", date: "2026-09-02", time: "09:00", route: "Rota Norte", bombs: 4, bombType: "bombonas médias", address: "Endereço fictício A", contactName: "Contato fictício", whatsapp: "", accessInstructions: "Exemplo de instrução de acesso.", recurrence: "2x por semana", weight: null, status: "Planejada", note: "" },
  { id: 2, client: "[DEMO] Cliente B", when: "02/09/2026, 10:30", date: "2026-09-02", time: "10:30", route: "Rota Norte", bombs: 3, bombType: "bombonas", address: "Endereço fictício B", contactName: "Contato fictício", whatsapp: "", accessInstructions: "Exemplo de orientação de chegada.", recurrence: "Semanal", weight: null, status: "Pendente", note: "Cliente não estava no local" },
  { id: 3, client: "[DEMO] Cliente C", when: "02/09/2026, 13:30", date: "2026-09-02", time: "13:30", route: "Rota Centro", bombs: 6, bombType: "bombonas", address: "Endereço fictício C", contactName: "Contato fictício", whatsapp: "", accessInstructions: "Exemplo de acesso alternativo.", recurrence: "2x por semana", weight: 84, status: "Realizada", note: "Sem ocorrências" },
  { id: 4, client: "[DEMO] Cliente D", when: "03/09/2026, 08:30", date: "2026-09-03", time: "08:30", route: "Rota Sul", bombs: 2, bombType: "bombonas pequenas", address: "Endereço fictício D", contactName: "Contato fictício", whatsapp: "", accessInstructions: "Exemplo de acesso aos fundos.", recurrence: "Semanal", weight: null, status: "Planejada", note: "" },
]

const ROUTES: Route[] = [
  { id: 1, name: "Rota Norte", area: "Zona Norte e bairros próximos", day: "Segunda e quinta" },
  { id: 2, name: "Rota Centro", area: "Centro e região comercial", day: "Terça e sexta" },
  { id: 3, name: "Rota Sul", area: "Zona Sul e bairros próximos", day: "Quarta" },
]

const INITIAL_AUDIT: AuditEntry[] = [
  { id: 1, action: "Regra de temperatura atualizada", detail: "Limite 40°C e margem preventiva 2°C", user: "Gestor", at: "01/09/2026, 08:12", category: "Configuração" },
  { id: 2, action: "Contrato renovado", detail: "[DEMO] Cliente C — aditivo registrado", user: "Administrativo", at: "31/08/2026, 16:40", category: "Contratos" },
  { id: 3, action: "Coleta reagendada", detail: "[DEMO] Cliente B — cliente ausente", user: "Administrativo", at: "31/08/2026, 10:46", category: "Coletas" },
]

const NAV: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Visão geral", icon: LayoutDashboard },
  { id: "alertas", label: "Central de alertas", icon: Bell },
  { id: "leiras", label: "Pátio e leiras", icon: Thermometer },
  { id: "coletas", label: "Rotas e coletas", icon: Truck },
  { id: "contratos", label: "Contratos e clientes", icon: FileSignature },
  { id: "auditoria", label: "Auditoria", icon: History },
]

const collectionTone = (s: Collection["status"]) => s === "Realizada"
  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
  : s === "Pendente" ? "bg-red-100 text-red-800 border-red-200"
  : s === "Reagendada" ? "bg-blue-100 text-blue-800 border-blue-200"
  : "bg-stone-100 text-stone-700 border-stone-200"

function normalizeCollection(item: Partial<Collection>, index: number): Collection {
  const time = item.time ?? item.when?.match(/\d{2}:\d{2}/)?.[0] ?? "09:00"
  const today = businessDateKey()
  const date = item.date ?? (item.when?.includes("Amanhã") ? addDays(today, 1) : today)
  return {
    id: item.id ?? Date.now() + index, client: item.client ?? "Cliente", when: item.when ?? `${date}, ${time}`,
    route: item.route ?? "Rota Norte", weight: item.weight ?? null, status: item.status ?? "Planejada", note: item.note ?? "",
    date, time, bombs: item.bombs ?? 2, bombType: item.bombType ?? "bombonas", address: item.address ?? "Endereço não informado",
    contactName: item.contactName ?? "", whatsapp: item.whatsapp ?? "",
    accessInstructions: item.accessInstructions ?? "", recurrence: item.recurrence ?? "Semanal",
  }
}

function syncLegacyDemoCollections(items: Collection[], today = businessDateKey()) {
  const legacyDates = new Map<number, { date: string; offset: number }>([
    [1, { date: "2026-09-02", offset: 0 }],
    [2, { date: "2026-09-02", offset: 0 }],
    [3, { date: "2026-09-02", offset: 0 }],
    [4, { date: "2026-09-03", offset: 1 }],
  ])
  return items.map((item) => {
    const legacy = legacyDates.get(item.id)
    if (!legacy || item.date !== legacy.date) return item
    const date = addDays(today, legacy.offset)
    return { ...item, date, when: `${formatDate(date)}, ${item.time}` }
  })
}

function normalizePileDates(items: Pile[], today = businessDateKey()) {
  return items.map((item) => {
    const relative = item.measuredAt.match(/^(Hoje|Ontem),\s*(\d{2}:\d{2})$/)
    if (!relative) return item
    const date = relative[1] === "Ontem" ? addDays(today, -1) : today
    return { ...item, measuredAt: `${formatDate(date)}, ${relative[2]}` }
  })
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-")
  return `${day}/${month}/${year}`
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return value.toISOString().slice(0, 10)
}

function recurrenceDates(date: string, recurrence: Collection["recurrence"]) {
  if (recurrence === "Não repetir") return [date]
  const offsets = recurrence === "2x por semana" ? [0, 3, 7, 10, 14, 17]
    : recurrence === "Semanal" ? [0, 7, 14, 21]
    : recurrence === "Quinzenal" ? [0, 14, 28, 42]
    : [0, 30, 60, 90]
  return offsets.map((offset) => addDays(date, offset))
}

function longDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`))
}

function alertKey(scope: string, id: string | number, state: string) {
  return `${scope}:${id}:${state}`
}

const BUSINESS_TIME_ZONE = "America/Cuiaba"

function businessDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ""
  return `${value("year")}-${value("month")}-${value("day")}`
}

function businessDateTime(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BUSINESS_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(date)
}

function headerDate(date = new Date()) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: BUSINESS_TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function weekdayName(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", { timeZone: BUSINESS_TIME_ZONE, weekday: "long" }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function greeting(date: Date) {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: BUSINESS_TIME_ZONE, hour: "2-digit", hour12: false }).format(date))
  if (hour < 12) return "Bom dia."
  if (hour < 18) return "Boa tarde."
  return "Boa noite."
}

function normalizeAuditEntry(entry: AuditEntry): AuditEntry {
  const migratedTime = entry.at.toLowerCase() === "agora" && entry.id > 1_000_000_000_000
    ? new Date(entry.id).toISOString()
    : entry.at
  return { ...entry, at: migratedTime, category: entry.category ?? "Geral" }
}

function auditEntryDate(entry: AuditEntry) {
  const isoDate = new Date(entry.at)
  if (!Number.isNaN(isoDate.getTime())) return isoDate
  const match = entry.at.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2})/)
  if (!match) return null
  return new Date(`${match[3]}-${match[2]}-${match[1]}T${match[4]}:${match[5]}:00-04:00`)
}

function auditDateParts(entry: AuditEntry) {
  const date = auditEntryDate(entry)
  if (!date) return { date: entry.at, time: "" }
  return {
    date: new Intl.DateTimeFormat("pt-BR", { timeZone: BUSINESS_TIME_ZONE }).format(date),
    time: new Intl.DateTimeFormat("pt-BR", { timeZone: BUSINESS_TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(date),
  }
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard")
  const [role, setRole] = useState<Role>("Administrativo")
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const contractStore = useContracts(authChecked && authUser !== null)
  const contracts = contractStore.contracts
  const [threshold, setThreshold] = useState(40)
  const [margin, setMargin] = useState(2)
  const [piles, setPiles] = useState(() => normalizePileDates(PILES))
  const [collections, setCollections] = useState(() => syncLegacyDemoCollections(COLLECTIONS.map(normalizeCollection)))
  const [routes, setRoutes] = useState(ROUTES)
  const [configOpen, setConfigOpen] = useState(false)
  const [measureOpen, setMeasureOpen] = useState(false)
  const [collectionOpen, setCollectionOpen] = useState(false)
  const [collectionEditing, setCollectionEditing] = useState<Collection | "new" | null>(null)
  const [routeOpen, setRouteOpen] = useState(false)
  const [routeEditing, setRouteEditing] = useState<Route | "new" | null>(null)
  const [audit, setAudit] = useState(INITIAL_AUDIT)
  const [selectedPile, setSelectedPile] = useState(1)
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    void fetch("/api/auth/session")
      .then(async (response) => {
        if (!response.ok) return null
        return response.json() as Promise<{ user: AuthUser }>
      })
      .then((result) => {
        if (result?.user) {
          setAuthUser(result.user)
          setRole(result.user.role)
        }
      })
      .finally(() => setAuthChecked(true))
  }, [])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("origem-mvp")
      if (saved) {
        const data = JSON.parse(saved)
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratação explícita do estado operacional local
        setThreshold(data.threshold ?? 40); setMargin(data.margin ?? 2)
        setPiles(normalizePileDates(data.piles ?? PILES))
        setCollections(syncLegacyDemoCollections((data.collections ?? COLLECTIONS).map(normalizeCollection)))
        setRoutes(data.routes ?? ROUTES)
        setAudit((data.audit ?? INITIAL_AUDIT).map(normalizeAuditEntry))
        setAcknowledgedAlerts(data.acknowledgedAlerts ?? [])
      }
    } catch {
      window.localStorage.removeItem("origem-mvp")
    } finally {
      setHydrated(true)
    }
  }, [])
  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem("origem-mvp", JSON.stringify({ threshold, margin, piles, collections, routes, audit, acknowledgedAlerts }))
  }, [hydrated, threshold, margin, piles, collections, routes, audit, acknowledgedAlerts])
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  if (!hydrated || !authChecked) {
    return <main className="app-boot" aria-busy="true" aria-label="Carregando Origem Gestão"><div className="app-boot-brand"><Image src={origemLogoUrl} alt="" width={76} height={76} unoptimized /><div><strong>Origem Gestão</strong><span>Sincronizando a operação</span></div></div><div className="app-boot-progress"><span /></div></main>
  }

  if (!authUser) {
    return <><LoginScreen onAuthenticated={(user) => { setAuthUser(user); setRole(user.role); setView("dashboard") }} /><Toaster richColors position="top-right" /></>
  }

  const isMaster = authUser.role === "Administrativo" && role === "Administrativo"

  const classify = (temp: number) => temp <= threshold ? "Revolver" : temp <= threshold + margin ? "Atenção" : "Estável"
  const todayKey = businessDateKey(currentTime)
  const critical = piles.filter((p) => classify(p.temperature) === "Revolver")
  const warning = piles.filter((p) => classify(p.temperature) === "Atenção")
  const monitoredContracts = contracts.map((contract) => ({ ...contract, status: effectiveStatus(contract.storedStatus, contract.endDate, currentTime) }))
  const expiring = monitoredContracts.filter((c) => c.status === "expiring" || c.status === "expired")
  const pending = collections.filter((c) => c.status === "Pendente")
  const alertPiles = [...critical, ...warning]
  const alertKeys = {
    contratos: expiring.map((contract) => alertKey("contrato", contract.id, `${contract.status}-${contract.endDate}`)),
    leiras: alertPiles.map((pile) => alertKey("leira", pile.id, `${pile.temperature}-${threshold}`)),
    coletas: pending.map((collection) => alertKey("coleta", collection.id, `${collection.status}-${collection.note}`)),
  }
  const acknowledged = new Set(acknowledgedAlerts)
  const contractAttentionCount = expiring.reduce((count, contract, index) => count + (contract.status === "expired" || !acknowledged.has(alertKeys.contratos[index]) ? 1 : 0), 0)
  const pileAttentionCount = alertKeys.leiras.filter((key) => !acknowledged.has(key)).length
  const collectionAttentionCount = alertKeys.coletas.filter((key) => !acknowledged.has(key)).length
  const badge: Partial<Record<View, number>> = {
    contratos: contractAttentionCount, leiras: pileAttentionCount,
    coletas: collectionAttentionCount, alertas: contractAttentionCount + pileAttentionCount + collectionAttentionCount,
  }

  const registerAudit = (action: string, detail: string, category: AuditCategory = "Geral") => setAudit((items) => [{ id: Date.now(), action, detail, user: `${authUser.displayName} (${role})`, at: new Date().toISOString(), category }, ...items])
  const markAlertsRead = (keys: string[]) => setAcknowledgedAlerts((current) => Array.from(new Set([...current, ...keys])))
  const navigate = (nextView: View) => {
    if (nextView === "auditoria" && !isMaster) return
    const expiringReminderKeys = expiring.flatMap((contract, index) => contract.status === "expiring" ? [alertKeys.contratos[index]] : [])
    if (nextView === "alertas") markAlertsRead([...expiringReminderKeys, ...alertKeys.leiras, ...alertKeys.coletas])
    if (nextView === "contratos") markAlertsRead(expiringReminderKeys)
    if (nextView === "leiras") markAlertsRead(alertKeys.leiras)
    if (nextView === "coletas") markAlertsRead(alertKeys.coletas)
    setView(nextView)
  }

  const changeRoleView = (nextRole: Role) => {
    if (authUser.role !== "Administrativo" && nextRole === "Administrativo") return
    setRole(nextRole)
    if (nextRole === "Gestor" && view === "auditoria") setView("dashboard")
  }
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null)
    setAuthUser(null)
    setRole("Administrativo")
    setView("dashboard")
    toast.success("Sessão encerrada.")
  }

  const openMeasure = (id: number) => { setSelectedPile(id); setMeasureOpen(true) }
  const saveConfig = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    if (!isMaster) return toast.error("Somente o Administrativo pode alterar a regra de temperatura.")
    const limit = Number(form.get("threshold")); const proximity = Number(form.get("margin"))
    const reason = String(form.get("reason")).trim()
    if (limit < 20 || limit > 80 || proximity < 0 || proximity > 15) return toast.error("Revise os valores informados.")
    if (!reason) return toast.error("Informe a justificativa da alteração.")
    setThreshold(limit); setMargin(proximity); setConfigOpen(false); registerAudit("Regra de temperatura atualizada", `${limit}°C, margem ${proximity}°C — ${reason}`, "Configuração"); toast.success("Regra de temperatura atualizada.")
  }
  const addMeasurement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const temperature = Number(form.get("temperature")); const humidity = Number(form.get("humidity"))
    setPiles((all) => all.map((p) => p.id === selectedPile ? { ...p, temperature, humidity, measuredAt: businessDateTime() } : p))
    setMeasureOpen(false); registerAudit("Medição registrada", `Leira ${selectedPile}: ${temperature}°C e ${humidity}% de umidade`, "Leiras"); toast.success(`Medição da leira ${selectedPile} registrada.`)
  }
  const saveCollection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const client = String(form.get("collectionClient")).trim()
    const date = String(form.get("collectionDate")).trim()
    const time = String(form.get("collectionTime")).trim()
    const route = String(form.get("collectionRoute")).trim()
    const rawWeight = String(form.get("collectionWeight")).trim()
    const weight = rawWeight ? Number(rawWeight) : null
    const status = String(form.get("collectionStatus")) as Collection["status"]
    const note = String(form.get("collectionNote")).trim()
    const bombs = Number(form.get("collectionBombs"))
    const bombType = String(form.get("collectionBombType")).trim()
    const address = String(form.get("collectionAddress")).trim()
    const contactName = String(form.get("collectionContact")).trim()
    const whatsapp = String(form.get("collectionWhatsapp")).replace(/\D/g, "")
    const accessInstructions = String(form.get("collectionAccess")).trim()
    const recurrence = String(form.get("collectionRecurrence")) as Collection["recurrence"]
    if (!client || !date || !time || !route || !status || !bombs || !bombType || !address) return toast.error("Preencha os dados obrigatórios da coleta.")
    if (status === "Realizada" && (!weight || weight <= 0)) return toast.error("Informe o peso para concluir a coleta como realizada.")
    if (status === "Pendente" && !note) return toast.error("Informe na observação por que a coleta ficou pendente.")
    const updated: Collection = { id: collectionEditing === "new" || !collectionEditing ? Date.now() : collectionEditing.id, client, when: `${formatDate(date)}, ${time}`, date, time, route, bombs, bombType, address, contactName, whatsapp, accessInstructions, recurrence, weight, status, note }
    if (collectionEditing === "new") {
      const dates = recurrenceDates(date, recurrence)
      const generated = dates.map((generatedDate, index) => ({ ...updated, id: updated.id + index, date: generatedDate, when: `${formatDate(generatedDate)}, ${time}` }))
      setCollections((all) => [...all, ...generated]); registerAudit("Coleta programada", `${client} — ${recurrence}`, "Coletas"); toast.success(dates.length > 1 ? `${dates.length} coletas programadas pela recorrência.` : "Nova coleta adicionada.")
    } else {
      setCollections((all) => all.map((collection) => collection.id === updated.id ? updated : collection)); registerAudit("Coleta atualizada", `${client} — ${status}`, "Coletas"); toast.success("Coleta atualizada.")
    }
    setCollectionOpen(false); setCollectionEditing(null)
  }
  const turn = (id: number) => {
    setPiles((all) => all.map((p) => p.id === id ? { ...p, turnedAt: formatDate(businessDateKey()).slice(0, 5) } : p))
    registerAudit("Revolvimento registrado", `Leira ${id}`, "Leiras"); toast.success(`Revolvimento da leira ${id} registrado.`)
  }
  const saveRoute = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const name = String(form.get("routeName")).trim()
    const area = String(form.get("routeArea")).trim()
    const day = String(form.get("routeDay")).trim()
    if (!name || !area || !day) return toast.error("Preencha todos os dados da rota.")
    if (routeEditing === "new") {
      setRoutes((all) => [...all, { id: Date.now(), name, area, day }])
      registerAudit("Rota criada", name, "Rotas")
      toast.success("Nova rota adicionada.")
    } else if (routeEditing) {
      const oldName = routeEditing.name
      setRoutes((all) => all.map((route) => route.id === routeEditing.id ? { ...route, name, area, day } : route))
      setCollections((all) => all.map((collection) => collection.route === oldName ? { ...collection, route: name } : collection))
      registerAudit("Rota atualizada", `${oldName} → ${name}`, "Rotas")
      toast.success("Rota atualizada nas coletas vinculadas.")
    }
    setRouteEditing(null)
  }
  const confirmDeletion = () => {
    if (!deleteTarget || !isMaster) return
    if (deleteTarget.kind === "coleta") {
      setCollections((all) => all.filter((collection) => collection.id !== deleteTarget.id))
      registerAudit("Coleta excluída", deleteTarget.label, "Coletas")
    }
    if (deleteTarget.kind === "rota") {
      setRoutes((all) => all.filter((route) => route.id !== deleteTarget.id))
      setCollections((all) => all.map((collection) => collection.route === deleteTarget.label ? { ...collection, route: "Sem rota definida" } : collection))
      registerAudit("Rota excluída", `${deleteTarget.label} — coletas vinculadas ficaram sem rota`, "Rotas")
    }
    if (deleteTarget.kind === "leira") {
      setPiles((all) => all.filter((pile) => pile.id !== deleteTarget.id))
      registerAudit("Leira excluída", `Leira ${deleteTarget.label}`, "Leiras")
    }
    toast.success(`${deleteTarget.kind === "leira" ? "Leira" : deleteTarget.kind === "rota" ? "Rota" : "Coleta"} excluída.`)
    setDeleteTarget(null)
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r-0">
        <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
          <div className="brand-box">
            <Image src={origemLogoUrl} alt="Logo da Origem Compostagem" width={76} height={76} className="brand-logo" unoptimized />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="font-display text-xl font-bold leading-none text-[#2F241D]">Origem Gestão</p>
              <p className="mt-1 text-xs font-medium text-[#7A6255]">Central operacional</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-[#8A7568]">Operação</SidebarGroupLabel>
            <SidebarGroupContent><SidebarMenu>
              {NAV.filter((item) => isMaster || item.id !== "auditoria").map(({ id, label, icon: Icon }) => <SidebarMenuItem key={id}>
                <SidebarMenuButton tooltip={label} isActive={view === id} onClick={() => navigate(id)} className="nav-button">
                  <Icon /><span>{label}</span>
                </SidebarMenuButton>
                {badge[id] ? <SidebarMenuBadge className="nav-badge">{badge[id]}</SidebarMenuBadge> : null}
              </SidebarMenuItem>)}
            </SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-2">
          <div className="sidebar-status group-data-[collapsible=icon]:hidden">
            <span className="status-live" />
            <div><strong>Sessão protegida</strong><small>{authUser.displayName} • {authUser.role}</small></div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#FFFAF2]">
        <header className="app-header">
          <div className="app-header-title flex min-w-0 items-center gap-3"><SidebarTrigger className="md:hidden" /><div className="min-w-0">
            <p className="font-display text-lg font-bold text-[#2F241D]">{NAV.find((item) => item.id === view)?.label}</p>
            <p className="hidden text-xs text-[#806F64] sm:block">{headerDate(currentTime)}</p>
          </div></div>
          <div className="app-header-actions flex items-center gap-3">
            <Select value={role} onValueChange={(v) => changeRoleView(v as Role)}>
              <SelectTrigger className="w-[190px] border-[#E8DCCB] bg-white" aria-label="Visualizar perfil"><Users className="size-4 text-[#D7662C]" /><SelectValue /></SelectTrigger>
              <SelectContent position="popper" align="end"><SelectItem value="Gestor">Visão Gestor</SelectItem>{authUser.role === "Administrativo" && <SelectItem value="Administrativo">Visão Administrativo</SelectItem>}</SelectContent>
            </Select>
            <div className="account-chip"><span>{authUser.displayName.slice(0, 2).toUpperCase()}</span><div><strong>{authUser.displayName}</strong><small>@{authUser.username}</small></div></div>
            <Button size="icon" variant="outline" aria-label="Sair do sistema" title="Sair do sistema" onClick={() => void logout()}><LogOut /></Button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1440px] p-4 md:p-8">
          {view === "dashboard" && <Dashboard contracts={monitoredContracts} piles={piles} collections={collections} today={todayKey} currentTime={currentTime} threshold={threshold} classify={classify} expiring={expiring} pending={pending} critical={critical} go={navigate} measure={openMeasure} />}
          {authUser.mustChangePassword && <div className="password-notice"><LockKeyhole /><div><strong>Senha inicial em uso</strong><p>Altere a credencial padrão antes de liberar o sistema para o cliente.</p></div></div>}
          {view === "contratos" && <ContractWorkspace store={contractStore} actor={authUser.displayName} canArchive={isMaster} onAudit={(action, detail) => registerAudit(action, detail, "Contratos")} />}
          {view === "leiras" && <PilesView piles={piles} threshold={threshold} margin={margin} canManage={isMaster} classify={classify} config={() => setConfigOpen(true)} measure={openMeasure} turn={turn} remove={(pile) => setDeleteTarget({ kind: "leira", id: pile.id, label: String(pile.id) })} />}
          {view === "coletas" && <CollectionsView key={todayKey} today={todayKey} collections={collections} routes={routes} canManage={isMaster} manageRoutes={() => { setRouteEditing(null); setRouteOpen(true) }} addCollection={() => { setCollectionEditing("new"); setCollectionOpen(true) }} editCollection={(collection) => { setCollectionEditing(collection); setCollectionOpen(true) }} removeCollection={(collection) => setDeleteTarget({ kind: "coleta", id: collection.id, label: collection.client })} />}
          {view === "alertas" && <AlertsView expiring={expiring} piles={alertPiles} pending={pending} acknowledged={acknowledged} keys={alertKeys} classify={classify} go={navigate} />}
          {view === "impacto" && <ImpactView />}
          {view === "auditoria" && <AuditView entries={audit} />}
        </div>
      </SidebarInset>

      <ConfigDialog open={configOpen} close={setConfigOpen} threshold={threshold} margin={margin} save={saveConfig} />
      <MeasureDialog open={measureOpen} close={setMeasureOpen} pile={selectedPile} save={addMeasurement} />
      {collectionOpen && <CollectionDialog open={collectionOpen} close={(value) => { setCollectionOpen(value); if (!value) setCollectionEditing(null) }} collection={collectionEditing} routes={routes} contracts={contracts} defaultDate={todayKey} save={saveCollection} />}
      <RouteDialog open={routeOpen} close={setRouteOpen} routes={routes} collections={collections} canManage={isMaster} editing={routeEditing} setEditing={setRouteEditing} save={saveRoute} remove={(route) => setDeleteTarget({ kind: "rota", id: route.id, label: route.name })} />
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir {deleteTarget?.kind === "leira" ? "esta leira" : deleteTarget?.kind === "rota" ? "esta rota" : "esta coleta"}?</AlertDialogTitle><AlertDialogDescription>{deleteTarget?.kind === "rota" ? "As coletas vinculadas permanecerão registradas, mas ficarão sem rota definida." : "Esta ação remove o registro operacional e não poderá ser desfeita."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={confirmDeletion}><Trash2 />Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  )
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const usernameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const viewport = window.visualViewport
    const updateViewport = () => {
      document.documentElement.style.setProperty("--login-viewport-height", `${viewport?.height ?? window.innerHeight}px`)
    }
    updateViewport()
    viewport?.addEventListener("resize", updateViewport)
    viewport?.addEventListener("scroll", updateViewport)
    window.addEventListener("orientationchange", updateViewport)
    return () => {
      viewport?.removeEventListener("resize", updateViewport)
      viewport?.removeEventListener("scroll", updateViewport)
      window.removeEventListener("orientationchange", updateViewport)
      document.documentElement.style.removeProperty("--login-viewport-height")
    }
  }, [])

  useEffect(() => {
    if (window.matchMedia("(min-width: 801px)").matches) usernameRef.current?.focus()
  }, [])

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: String(form.get("username") ?? ""), password: String(form.get("password") ?? "") }),
      })
      const result = await response.json() as { user?: AuthUser; error?: string }
      if (!response.ok || !result.user) throw new Error(result.error ?? "Não foi possível entrar.")
      onAuthenticated(result.user)
      toast.success(`Bem-vindo, ${result.user.displayName}.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível entrar.")
    } finally {
      setLoading(false)
    }
  }

  return <main className="login-page"><section className="login-brand"><div className="login-brand-mark"><Image src={origemLogoUrl} alt="Logo da Origem Gestão" width={96} height={96} unoptimized /></div><div><span>Operação conectada</span><h1>Origem Gestão</h1><p>Contratos, coletas, leiras e decisões operacionais em um ambiente seguro.</p></div><div className="login-trust"><ShieldCheck /><span><strong>Acesso controlado</strong><small>Perfis e permissões por usuário</small></span></div></section><section className="login-panel"><form onSubmit={login} onFocusCapture={(event) => { if (window.matchMedia("(max-width: 800px)").matches && event.target instanceof HTMLElement) window.setTimeout(() => event.target.scrollIntoView({ block: "center", behavior: "smooth" }), 220) }}><div className="login-heading"><div className="login-lock"><LockKeyhole /></div><span>Área restrita</span><h2>Entrar no sistema</h2><p>Use suas credenciais para acessar a central operacional.</p></div><div className="login-fields"><div><Label htmlFor="username">Usuário</Label><Input ref={usernameRef} id="username" name="username" autoComplete="username" enterKeyHint="next" placeholder="Digite seu usuário" required /></div><div><Label htmlFor="password">Senha</Label><div className="password-field"><Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" enterKeyHint="go" placeholder="Digite sua senha" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff /> : <Eye />}</button></div></div>{error && <div className="login-error" role="alert"><CircleAlert />{error}</div>}<Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? <><RefreshCw className="animate-spin" />Entrando...</> : <>Entrar<ChevronRight /></>}</Button></div><p className="login-help">Acesso destinado à equipe autorizada da Origem Compostagem.</p></form></section></main>
}

function Heading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>
    <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-forest-700">{eyebrow}</p>
    <h1 className="font-display text-3xl font-bold tracking-tight text-forest-950 md:text-4xl">{title}</h1>
    <p className="mt-2 max-w-2xl text-base text-stone-600">{description}</p>
  </div>{action}</div>
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: LucideIcon; label: string; value: number; detail: string; tone: string }) {
  return <article className="metric"><div className={`metric-icon ${tone}`}><Icon /></div><div>
    <p className="text-sm font-medium text-stone-500">{label}</p><p className="mt-1 font-display text-3xl font-bold text-forest-950">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p>
  </div></article>
}

function Dashboard({ contracts, piles, collections, today: todayKey, currentTime, threshold, classify, expiring, pending, critical, go, measure }: {
  contracts: Contract[]; piles: Pile[]; collections: Collection[]; today: string; currentTime: Date; threshold: number; classify: (n: number) => string;
  expiring: Contract[]; pending: Collection[]; critical: Pile[];
  go: (v: View) => void; measure: (id: number) => void
}) {
  const today = collections.filter((collection) => collection.date === todayKey)
  const done = today.filter((collection) => collection.status === "Realizada").length
  const progress = today.length ? Math.round((done / today.length) * 100) : 0
  return <>
    <section className="overview-hero"><div className="relative z-10"><Badge className="mb-5 border-white/20 bg-white/10 text-white">{weekdayName(currentTime)} • Operação de hoje</Badge><h1>{greeting(currentTime)}<br /><span>A operação começa aqui.</span></h1><p>Prioridades, coletas, contratos e pátio em uma visão clara para decidir rápido.</p><div className="mt-6 flex flex-wrap gap-2"><Button className="bg-white text-[#B94E20] hover:bg-[#FFF4DF]" onClick={() => go("coletas")}><Truck />Abrir agenda</Button><Button className="border border-white/25 bg-white/10 text-white hover:bg-white/20" onClick={() => go("alertas")}><Bell />Ver prioridades</Button></div></div><div className="operation-score"><div className="score-ring" style={{ "--score": `${progress * 3.6}deg` } as React.CSSProperties}><span><strong>{progress}%</strong><small>concluído</small></span></div><div><strong>{done} de {today.length}</strong><small>coletas realizadas hoje</small></div></div></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Truck} label="Coletas de hoje" value={today.length} detail={`${done} já concluída(s)`} tone="orange" />
      <Metric icon={Thermometer} label="Leiras monitoradas" value={piles.length} detail={`${critical.length} exigem ação`} tone="green" />
      <Metric icon={FileSignature} label="Contratos ativos" value={contracts.filter((c) => ["active", "expiring", "expired"].includes(c.status)).length} detail={`${expiring.length} exigem decisão`} tone="brown" />
      <Metric icon={Recycle} label="Resíduo desviado" value={658} detail="toneladas acumuladas" tone="cream" />
    </section>
    <section className="priority"><div className="flex items-start gap-3"><div className="priority-icon"><AlertTriangle /></div><div>
      <p className="font-semibold text-clay-950">Há ações prioritárias</p>
      <p className="mt-1 text-sm text-clay-800">{critical.length} leira(s) precisam de revolvimento e {pending.length} coleta(s) precisam de reagendamento.</p>
    </div></div><Button onClick={() => go("alertas")} className="bg-clay-700 hover:bg-clay-800">Ver alertas</Button></section>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Panel title="Roteiro de hoje" subtitle="Próximas paradas da operação" action={<Button variant="outline" size="sm" onClick={() => go("coletas")}>Agenda completa</Button>}><div className="route-timeline">{today.slice(0,4).map((collection,index) => <div key={collection.id} className="route-stop"><div className="stop-time">{collection.time}</div><div className="stop-line"><span>{index + 1}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{collection.client}</strong><Badge variant="outline" className={collectionTone(collection.status)}>{collection.status}</Badge></div><small>{collection.route} • {collection.bombs} {collection.bombType}</small></div></div>)}</div></Panel>
      <Panel title="Saúde do pátio" subtitle={`Regra ativa: revolver em ≤ ${threshold}°C`} action={<Button variant="outline" size="sm" onClick={() => go("leiras")}>Abrir pátio</Button>}><div className="yard-overview">{piles.map((pile) => { const state = classify(pile.temperature); return <button key={pile.id} className={`yard-dot ${state === "Revolver" ? "critical" : state === "Atenção" ? "warning" : "stable"}`} onClick={() => measure(pile.id)}><span>L{pile.id}</span><strong>{pile.temperature.toFixed(1)}°</strong></button>})}</div><div className="yard-legend"><span><i className="stable" />Normal</span><span><i className="warning" />Próxima do limite</span><span><i className="critical" />Revolver</span></div></Panel>
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-2"><Panel title="Contratos em decisão" subtitle="Prazo de 30 dias para agir" action={<Button variant="outline" size="sm" onClick={() => go("contratos")}>Ver contratos</Button>}><div className="divide-y divide-[#F0E6D8]">{expiring.map((contract) => <div key={contract.id} className="decision-row"><div><strong>{contract.tradeName || contract.legalName}</strong><small>Vencimento em {formatIsoDate(contract.endDate)}</small></div><Badge className="bg-[#FFF0E6] text-[#B94E20]">Ação necessária</Badge></div>)}{expiring.length === 0 && <div className="p-6 text-center text-sm text-stone-500">Nenhum contrato exige decisão agora.</div>}</div></Panel><Panel title="Indicadores ambientais" subtitle="Dados demonstrativos da operação"><div className="impact-inline"><div><Recycle /><strong>658 t</strong><small>fora do aterro</small></div><div><Sprout /><strong>312 t</strong><small>adubo produzido</small></div><div><TrendingUp /><strong>26</strong><small>clientes demonstrativos</small></div></div></Panel></div>
  </>
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  return <section className="panel"><div className="panel-header"><div><h2 className="panel-title">{title}</h2><p className="panel-subtitle">{subtitle}</p></div>{action}</div>{children}</section>
}

function PilesView({ piles, threshold, margin, canManage, classify, config, measure, turn, remove }: {
  piles: Pile[]; threshold: number; margin: number; canManage: boolean; classify: (n: number) => string;
  config: () => void; measure: (id: number) => void; turn: (id: number) => void; remove: (pile: Pile) => void
}) {
  return <><Heading eyebrow="Pátio de compostagem" title="Leiras" description={`Revolvimento em ${threshold}°C ou menos e atenção até ${threshold + margin}°C.`} action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={config} disabled={!canManage}><Settings2 />Configurar regra</Button><Button onClick={() => measure(1)}><Plus />Nova medição</Button></div>} />
    {!canManage && <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">No perfil Gestor, a regra de temperatura fica somente para consulta.</div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{piles.map((p) => {
      const status = classify(p.temperature); const tone = status === "Revolver" ? "critical" : status === "Atenção" ? "warning" : "stable"
      return <article key={p.id} className={`pile-card ${tone}`}><div className="flex items-start justify-between"><div><p className="text-sm font-bold uppercase tracking-wider opacity-70">Leira {p.id}</p><p className="mt-3 font-display text-4xl font-bold">{p.temperature.toFixed(1)}°C</p></div><div className="flex items-center gap-2"><Badge variant="outline" className="border-current bg-white/60">{status}</Badge>{canManage && <Button size="icon-sm" variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800" aria-label={`Excluir leira ${p.id}`} onClick={() => remove(p)}><Trash2 /></Button>}</div></div><div className="mt-6 grid grid-cols-2 gap-3"><Detail icon={Waves} label="Umidade" value={`${p.humidity}%`} /><Detail icon={RotateCcw} label="Revolvida" value={p.turnedAt} /></div><p className="mt-4 text-xs opacity-70">Medição: {p.measuredAt}</p><div className="mt-5 flex gap-2"><Button size="sm" variant="outline" className="flex-1 border-current/20 bg-white/60" onClick={() => measure(p.id)}><Gauge />Medir</Button>{status === "Revolver" && <Button size="sm" className="flex-1 bg-clay-700 hover:bg-clay-800" onClick={() => turn(p.id)}><RotateCcw />Revolver</Button>}</div></article>
    })}</section>
  </>
}

function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="pile-detail"><Icon /><span>{label}<strong>{value}</strong></span></div>
}

function CollectionsView({ today, collections, canManage, manageRoutes, addCollection, editCollection, removeCollection }: { today: string; collections: Collection[]; routes: Route[]; canManage: boolean; manageRoutes: () => void; addCollection: () => void; editCollection: (collection: Collection) => void; removeCollection: (collection: Collection) => void }) {
  const [selectedDate, setSelectedDate] = useState(today)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("Todos")
  const selected = new Date(`${selectedDate}T12:00:00`)
  const monday = addDays(selectedDate, -((selected.getDay() + 6) % 7))
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index); const value = new Date(`${date}T12:00:00`)
    return { date, day: String(value.getDate()), label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(value).replace(".", "").slice(0, 3) }
  })
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(selected)
  const selectedMonth = String(selected.getMonth())
  const selectedYear = String(selected.getFullYear())
  const currentYear = Number(today.slice(0, 4))
  const years = Array.from(new Set([selected.getFullYear(), ...collections.map((collection) => Number(collection.date.slice(0, 4))), ...Array.from({ length: 8 }, (_, index) => currentYear - 2 + index)])).sort((a, b) => a - b)
  const changeMonth = (month: number, year = selected.getFullYear()) => {
    const day = Math.min(selected.getDate(), new Date(year, month + 1, 0).getDate())
    setSelectedDate(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
  }
  const changeYear = (year: number) => changeMonth(selected.getMonth(), year)
  const filtered = collections.filter((collection) => collection.date === selectedDate && (status === "Todos" || collection.status === status) && collection.client.toLowerCase().includes(query.toLowerCase()))
  const planned = collections.filter((c) => c.date === selectedDate && c.status === "Planejada").length
  const completed = collections.filter((c) => c.date === selectedDate && c.status === "Realizada").length
  const pending = collections.filter((c) => c.date === selectedDate && c.status === "Pendente").length
  return <>
    <Heading eyebrow="Logística" title="Agenda de coletas" description="Planeje o dia, acesse os dados do cliente e atualize cada coleta durante a operação." action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={manageRoutes}><MapPinned />Rotas</Button><Button onClick={addCollection}><Plus />Nova coleta</Button></div>} />
    <section className="agenda-hero">
      <div className="agenda-month"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-forest-700">Programação</p><h2 className="font-display text-2xl font-bold capitalize text-forest-950">{monthLabel}</h2></div><div className="flex flex-wrap items-center justify-end gap-2"><Button variant="outline" size="sm" className="bg-white" onClick={() => setSelectedDate(today)}>Hoje</Button><Select value={selectedMonth} onValueChange={(value) => changeMonth(Number(value))}><SelectTrigger aria-label="Selecionar mês" className="w-[142px] bg-white"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 12 }, (_, month) => <SelectItem key={month} value={String(month)}>{new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2020, month, 1))}</SelectItem>)}</SelectContent></Select><Select value={selectedYear} onValueChange={(value) => changeYear(Number(value))}><SelectTrigger aria-label="Selecionar ano" className="w-[108px] bg-white"><SelectValue /></SelectTrigger><SelectContent>{years.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent></Select><Button variant="outline" size="icon-sm" aria-label="Semana anterior" onClick={() => setSelectedDate(addDays(selectedDate, -7))}><ChevronLeft /></Button><Button variant="outline" size="icon-sm" aria-label="Próxima semana" onClick={() => setSelectedDate(addDays(selectedDate, 7))}><ChevronRight /></Button></div></div>
      <div className="week-strip">{week.map((item) => <button key={item.date} className={`day-button ${selectedDate === item.date ? "active" : ""}`} onClick={() => setSelectedDate(item.date)}><span>{item.label}</span><strong>{item.day}</strong><small>{collections.filter((c) => c.date === item.date).length || ""}</small></button>)}</div>
    </section>
    <div className="agenda-summary"><div><CalendarDays /><span>Coletas do dia<strong>{filtered.length}</strong></span></div><div><Clock3 /><span>Planejadas<strong>{planned}</strong></span></div><div><CheckCircle2 /><span>Realizadas<strong>{completed}</strong></span></div><div><CircleAlert /><span>Pendentes<strong>{pending}</strong></span></div></div>
    <Tabs defaultValue="agenda" className="mt-5">
      <div className="agenda-toolbar"><TabsList><TabsTrigger value="agenda"><CalendarDays />Agenda</TabsTrigger><TabsTrigger value="table"><ListFilter />Tabela</TabsTrigger></TabsList><div className="flex flex-1 flex-wrap justify-end gap-2"><div className="relative min-w-[210px]"><Search className="absolute left-3 top-2.5 size-4 text-stone-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente" className="bg-white pl-9" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-[150px] bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos os status</SelectItem><SelectItem value="Planejada">Planejadas</SelectItem><SelectItem value="Realizada">Realizadas</SelectItem><SelectItem value="Pendente">Pendentes</SelectItem><SelectItem value="Reagendada">Reagendadas</SelectItem></SelectContent></Select></div></div>
      <TabsContent value="agenda"><div className="agenda-heading"><div><h3 className="font-display text-xl font-bold capitalize text-forest-950">{longDate(selectedDate)}</h3><p className="mt-1 text-sm text-stone-500">{filtered.length} coleta(s) na programação selecionada</p></div></div><div className="collection-grid">{filtered.map((collection, index) => <CollectionCard key={collection.id} collection={collection} index={index} canManage={canManage} edit={editCollection} remove={removeCollection} />)}{filtered.length === 0 && <div className="empty-agenda"><CalendarDays /><h3>Nenhuma coleta encontrada</h3><p>Altere o dia ou os filtros, ou adicione uma nova coleta.</p><Button onClick={addCollection}><Plus />Nova coleta</Button></div>}</div></TabsContent>
      <TabsContent value="table"><section className="panel overflow-hidden"><Table><TableHeader><TableRow><TableHead className="pl-5">Cliente</TableHead><TableHead>Data e horário</TableHead><TableHead>Bombonas</TableHead><TableHead>Rota</TableHead><TableHead>Peso</TableHead><TableHead>Status</TableHead><TableHead className="pr-5 text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{filtered.map((c) => <TableRow key={c.id}><TableCell className="pl-5 font-semibold text-forest-950">{c.client}</TableCell><TableCell>{formatDate(c.date)}, {c.time}</TableCell><TableCell>{c.bombs} {c.bombType}</TableCell><TableCell>{c.route}</TableCell><TableCell>{c.weight ? `${c.weight} kg` : "—"}</TableCell><TableCell><Badge variant="outline" className={collectionTone(c.status)}>{c.status}</Badge></TableCell><TableCell className="pr-5 text-right"><div className="flex justify-end gap-1"><Button size="sm" variant="outline" onClick={() => editCollection(c)}><Pencil />Editar</Button>{canManage && <Button size="icon-sm" variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800" aria-label={`Excluir coleta ${c.client}`} onClick={() => removeCollection(c)}><Trash2 /></Button>}</div></TableCell></TableRow>)}{filtered.length === 0 && <TableRow><TableCell colSpan={7} className="h-28 text-center text-stone-500">Nenhuma coleta encontrada para a data e os filtros selecionados.</TableCell></TableRow>}</TableBody></Table></section></TabsContent>
    </Tabs>
  </>
}

function CollectionCard({ collection, index, canManage, edit, remove }: { collection: Collection; index: number; canManage: boolean; edit: (collection: Collection) => void; remove: (collection: Collection) => void }) {
  return <article className={`collection-card status-${collection.status.toLowerCase()}`}><div className="collection-sequence">{index + 1}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-xl font-bold text-forest-950">{collection.client}</h3><Badge variant="outline" className={collectionTone(collection.status)}>{collection.status}</Badge></div><p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-stone-600"><PackageOpen className="size-4 text-forest-700" />{collection.bombs} {collection.bombType}<span className="text-stone-300">•</span><Clock3 className="size-4 text-forest-700" />{collection.time}</p></div><Badge variant="secondary" className="gap-1"><Repeat2 />{collection.recurrence}</Badge></div><div className="collection-info"><div><MapPin /><span><strong>{collection.route}</strong><small>{collection.address}</small></span></div>{collection.accessInstructions && <div><ClipboardCheck /><span><strong>Instruções de acesso</strong><small>{collection.accessInstructions}</small></span></div>}{collection.whatsapp && <div><MessageCircle /><span><strong>{collection.contactName || "Contato"}</strong><a href={`https://wa.me/${collection.whatsapp}`} target="_blank" rel="noreferrer">Abrir WhatsApp<ExternalLink /></a></span></div>}</div>{collection.note && <div className="collection-note"><CircleAlert />{collection.note}</div>}<div className="collection-actions"><Button size="sm" variant="outline" onClick={() => edit(collection)}><Pencil />Editar</Button>{collection.status !== "Realizada" ? <Button size="sm" onClick={() => edit({ ...collection, status: "Realizada" })}><CheckCircle2 />Realizar</Button> : <Button size="sm" variant="secondary" onClick={() => edit({ ...collection, status: "Planejada", weight: null })}><RefreshCw />Reabrir</Button>}<Button size="sm" variant="outline" onClick={() => edit({ ...collection, status: "Reagendada" })}><CalendarClock />Reagendar</Button><Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => edit({ ...collection, status: "Pendente" })}><CircleAlert />Pendente</Button>{canManage && <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => remove(collection)}><Trash2 />Excluir</Button>}</div></div></article>
}

function AlertsView({ expiring, piles, pending, acknowledged, keys, classify, go }: { expiring: Contract[]; piles: Pile[]; pending: Collection[]; acknowledged: Set<string>; keys: { contratos: string[]; leiras: string[]; coletas: string[] }; classify: (temperature: number) => string; go: (v: View) => void }) {
  const contracts = expiring.map((contract, index) => ({ contract, key: keys.contratos[index] }))
  const monitoredPiles = piles.map((pile, index) => ({ pile, key: keys.leiras[index] }))
  const collections = pending.map((collection, index) => ({ collection, key: keys.coletas[index] }))
  const total = contracts.length + monitoredPiles.length + collections.length
  const required = contracts.filter(({ contract }) => contract.status === "expired").length
  return <><Heading eyebrow="Central de alertas" title={`${total} ${total === 1 ? "ocorrência ativa" : "ocorrências ativas"}`} description={required ? `${required} contrato(s) vencido(s) permanecem sinalizados até que uma ação seja registrada. Os demais avisos já foram reconhecidos ao abrir esta página.` : "Os avisos desta página foram reconhecidos automaticamente. As situações continuam disponíveis para acompanhamento nos respectivos módulos."} />
    <div className="grid gap-4 lg:grid-cols-3">
      <AlertGroup title="Contratos" icon={FileSignature} tone="amber" count={contracts.length} open={() => go("contratos")} buttonLabel="Abrir contratos">{contracts.map(({ contract, key }) => <AlertItem key={key} title={contract.tradeName || contract.legalName} detail={`${contract.status === "expired" ? "Vencido desde" : "Vence em"} ${formatIsoDate(contract.endDate)}`} state={contract.status === "expired" ? "required" : acknowledged.has(key) ? "seen" : "new"} />)}</AlertGroup>
      <AlertGroup title="Leiras" icon={Thermometer} tone="red" count={monitoredPiles.length} open={() => go("leiras")} buttonLabel="Abrir pátio">{monitoredPiles.map(({ pile, key }) => <AlertItem key={key} title={`Leira ${pile.id}`} detail={`${pile.temperature.toFixed(1)}°C — ${classify(pile.temperature) === "Revolver" ? "revolvimento necessário" : "próxima do limite"}`} state={acknowledged.has(key) ? "seen" : "new"} />)}</AlertGroup>
      <AlertGroup title="Coletas" icon={Truck} tone="blue" count={collections.length} open={() => go("coletas")} buttonLabel="Abrir agenda">{collections.map(({ collection, key }) => <AlertItem key={key} title={collection.client} detail={collection.note} state={acknowledged.has(key) ? "seen" : "new"} />)}</AlertGroup>
    </div>
  </>
}

function AlertGroup({ title, icon: Icon, tone, count, open, buttonLabel, children }: { title: string; icon: LucideIcon; tone: string; count: number; open: () => void; buttonLabel: string; children: ReactNode }) {
  return <Panel title={title} subtitle={`${count} ocorrência(s) ativa(s)`} action={<div className={`alert-icon ${tone}`}><Icon /></div>}><div className="divide-y divide-stone-100">{children}{count === 0 && <div className="p-6 text-center"><CheckCircle2 className="mx-auto size-7 text-emerald-600" /><p className="mt-2 text-sm text-stone-500">Nenhuma ocorrência ativa</p></div>}</div><div className="p-4"><Button variant="outline" className="w-full" onClick={open}>{buttonLabel}</Button></div></Panel>
}
function AlertItem({ title, detail, state }: { title: string; detail: string; state: "new" | "seen" | "required" }) {
  return <div className="flex items-start gap-3 px-5 py-4"><ClipboardCheck className="mt-0.5 size-4 shrink-0 text-stone-400" /><div className="min-w-0 flex-1"><p className="font-semibold text-forest-950">{title}</p><p className="mt-1 text-sm text-stone-500">{detail}</p></div><Badge variant="outline" className={state === "required" ? "border-red-200 bg-red-50 text-red-700" : state === "seen" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{state === "required" ? "Ação obrigatória" : state === "seen" ? "Visualizado" : "Novo"}</Badge></div>
}

function ImpactView() {
  const months = [{ label: "Abr", value: 52 }, { label: "Mai", value: 68 }, { label: "Jun", value: 61 }, { label: "Jul", value: 79 }, { label: "Ago", value: 88 }, { label: "Set", value: 73 }]
  return <><Heading eyebrow="Economia circular" title="Adubo e impacto" description="Transforme a operação em indicadores claros para clientes, relatórios e decisões comerciais." />
    <div className="impact-hero"><div><Badge className="bg-white/15 text-white">Impacto acumulado</Badge><h2>Resíduo que deixa de ser problema<br />e volta para a terra.</h2><p>Indicadores demonstrativos do ciclo completo da Origem Compostagem.</p></div><div className="impact-big-number"><strong>658,4</strong><span>toneladas desviadas<br />do aterro sanitário</span></div></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><ImpactMetric icon={Recycle} value="658,4 t" label="Resíduo recebido" change="+11,8% no mês" /><ImpactMetric icon={Sprout} value="312,6 t" label="Adubo produzido" change="47,5% de conversão" /><ImpactMetric icon={Scale} value="84,2 t" label="Volume neste mês" change="Meta mensal: 90 t" /><ImpactMetric icon={Building2} value="26" label="Clientes ativos" change="3 novos no trimestre" /></section>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><Panel title="Resíduo processado por mês" subtitle="Toneladas recebidas na operação"><div className="impact-chart">{months.map((month) => <div key={month.label}><span style={{ height: `${month.value}%` }}><i>{month.value}t</i></span><small>{month.label}</small></div>)}</div></Panel><Panel title="Estoque de adubo" subtitle="Disponibilidade atual por estágio"><div className="stock-list"><div><span className="stock-icon ready"><Sprout /></span><p>Pronto para venda<small>Produto finalizado</small></p><strong>4,2 t</strong></div><div><span className="stock-icon curing"><Clock3 /></span><p>Em maturação<small>Previsão: 12 dias</small></p><strong>1,8 t</strong></div><div><span className="stock-icon packed"><PackageOpen /></span><p>Ensacado<small>Unidades de 10 kg</small></p><strong>640</strong></div></div></Panel></div>
    <section className="impact-note"><ShieldCheck /><div><strong>Dados auditáveis para relatórios ESG</strong><p>As medições de coleta, processamento e saída de adubo formam a base para comprovar o impacto ambiental entregue a cada cliente.</p></div></section>
  </>
}

function ImpactMetric({ icon: Icon, value, label, change }: { icon: LucideIcon; value: string; label: string; change: string }) {
  return <article className="impact-metric"><div><Icon /></div><p>{label}</p><strong>{value}</strong><small>{change}</small></article>
}

function AuditView({ entries }: { entries: AuditEntry[] }) {
  const [category, setCategory] = useState<AuditCategory | "Todos">("Todos")
  const [actor, setActor] = useState("Todos")
  const [period, setPeriod] = useState("30")
  const [query, setQuery] = useState("")
  const [referenceTime, setReferenceTime] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setReferenceTime(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const actors = Array.from(new Set(entries.map((entry) => entry.user))).sort()
  const today = businessDateKey(referenceTime)
  const visible = entries.filter((entry) => {
    const text = `${entry.action} ${entry.detail} ${entry.user} ${entry.category}`.toLowerCase()
    const date = auditEntryDate(entry)
    const withinPeriod = period === "Todos" || !date || (referenceTime.getTime() - date.getTime()) <= Number(period) * 86_400_000
    return (category === "Todos" || entry.category === category) && (actor === "Todos" || entry.user === actor) && withinPeriod && text.includes(query.trim().toLowerCase())
  })
  const todayCount = entries.filter((entry) => {
    const date = auditEntryDate(entry)
    return date ? businessDateKey(date) === today : false
  }).length
  const exportCsv = () => {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`
    const rows = [["Data", "Hora", "Módulo", "Ação", "Detalhe", "Responsável"], ...visible.map((entry) => { const date = auditDateParts(entry); return [date.date, date.time, entry.category, entry.action, entry.detail, entry.user] })]
    const csv = `\uFEFF${rows.map((row) => row.map(escape).join(";")).join("\n")}`
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a"); link.href = url; link.download = `auditoria-origem-${businessDateKey()}.csv`; link.click(); URL.revokeObjectURL(url)
  }
  const clearFilters = () => { setCategory("Todos"); setActor("Todos"); setPeriod("30"); setQuery("") }
  return <><Heading eyebrow="Governança operacional" title="Auditoria" description="Acompanhe quem alterou cada informação, quando a mudança ocorreu e qual módulo foi afetado." action={<Button variant="outline" onClick={exportCsv} disabled={visible.length === 0}><Download />Exportar CSV</Button>} />
    <div className="audit-summary"><article><History /><span>Registros totais<strong>{entries.length}</strong></span></article><article><CalendarDays /><span>Alterações hoje<strong>{todayCount}</strong></span></article><article><ListFilter /><span>Resultados exibidos<strong>{visible.length}</strong></span></article></div>
    <section className="audit-workspace">
      <div className="audit-filters"><div className="audit-search"><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ação, detalhe ou responsável" /></div><Select value={category} onValueChange={(value) => setCategory(value as AuditCategory | "Todos")}><SelectTrigger><ListFilter /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos os módulos</SelectItem>{(["Coletas", "Rotas", "Leiras", "Contratos", "Configuração", "Geral"] as AuditCategory[]).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={actor} onValueChange={setActor}><SelectTrigger><Users /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos os responsáveis</SelectItem>{actors.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={period} onValueChange={setPeriod}><SelectTrigger><CalendarClock /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem><SelectItem value="Todos">Todo o período</SelectItem></SelectContent></Select><Button variant="ghost" onClick={clearFilters}><RotateCcw />Limpar</Button></div>
      <div className="audit-table-head"><span>Data e hora</span><span>Atividade</span><span>Módulo</span><span>Responsável</span></div>
      <div className="audit-rows">{visible.map((entry) => { const occurred = auditDateParts(entry); return <article key={entry.id} className="audit-row"><time dateTime={entry.at}><strong>{occurred.date}</strong><span>{occurred.time}</span></time><div className="audit-event"><span><History /></span><div><strong>{entry.action}</strong><p>{entry.detail}</p></div></div><Badge variant="outline" className={`audit-category audit-${entry.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}>{entry.category}</Badge><div className="audit-actor"><span>{entry.user.slice(0, 1).toUpperCase()}</span><strong>{entry.user}</strong></div></article>})}{visible.length === 0 && <div className="audit-empty"><Search /><strong>Nenhum registro encontrado</strong><p>Revise a busca ou limpe os filtros para consultar todo o histórico.</p><Button variant="outline" onClick={clearFilters}>Limpar filtros</Button></div>}</div>
    </section>
  </>
}

function ConfigDialog({ open, close, threshold, margin, save }: { open: boolean; close: (v: boolean) => void; threshold: number; margin: number; save: (e: FormEvent<HTMLFormElement>) => void }) {
  return <Dialog open={open} onOpenChange={close}><DialogContent><form onSubmit={save}><DialogHeader><DialogTitle>Regra de temperatura</DialogTitle><DialogDescription>Somente o Administrativo pode alterar. A regra anterior permanece registrada no histórico.</DialogDescription></DialogHeader><div className="my-6 grid gap-5 sm:grid-cols-2"><Field id="threshold" label="Limite para revolvimento"><Input id="threshold" name="threshold" type="number" min="20" max="80" step="0.1" defaultValue={threshold} /></Field><Field id="margin" label="Margem de proximidade"><Input id="margin" name="margin" type="number" min="0" max="15" step="0.1" defaultValue={margin} /></Field><Field id="reason" label="Justificativa da alteração" wide><Textarea id="reason" name="reason" placeholder="Explique por que a regra está sendo alterada" required /></Field><div className="rounded-xl bg-[#FFF0E6] p-3 text-sm text-[#9C431F] sm:col-span-2"><strong>Classificação automática:</strong> revolver em ≤ {threshold}°C; atenção entre {threshold}°C e {threshold + margin}°C; normal acima disso.</div></div><DialogFooter><Button type="button" variant="outline" onClick={() => close(false)}>Cancelar</Button><Button type="submit">Salvar e registrar</Button></DialogFooter></form></DialogContent></Dialog>
}

function MeasureDialog({ open, close, pile, save }: { open: boolean; close: (v: boolean) => void; pile: number; save: (e: FormEvent<HTMLFormElement>) => void }) {
  return <Dialog open={open} onOpenChange={close}><DialogContent><form onSubmit={save}><DialogHeader><DialogTitle>Registrar medição — Leira {pile}</DialogTitle><DialogDescription>Informe os dados observados no pátio.</DialogDescription></DialogHeader><div className="my-6 grid gap-5 sm:grid-cols-2"><Field id="temperature" label="Temperatura (°C)"><Input id="temperature" name="temperature" type="number" min="0" max="100" step="0.1" required /></Field><Field id="humidity" label="Umidade (%)"><Input id="humidity" name="humidity" type="number" min="0" max="100" required /></Field><Field id="observation" label="Observação" wide><Textarea id="observation" name="observation" placeholder="Opcional" /></Field></div><DialogFooter><Button type="button" variant="outline" onClick={() => close(false)}>Cancelar</Button><Button type="submit">Registrar medição</Button></DialogFooter></form></DialogContent></Dialog>
}

function contractCollectionAddress(contract: Contract) {
  return [
    [contract.street, contract.streetNumber].filter(Boolean).join(", "),
    contract.complement,
    contract.neighborhood,
    [contract.city, contract.state].filter(Boolean).join("/"),
    contract.cep ? `CEP ${contract.cep}` : "",
  ].filter(Boolean).join(" — ")
}

function CollectionDialog({ open, close, collection, routes, contracts, defaultDate, save }: {
  open: boolean; close: (value: boolean) => void; collection: Collection | "new" | null;
  routes: Route[]; contracts: Contract[]; defaultDate: string; save: (event: FormEvent<HTMLFormElement>) => void
}) {
  const current = collection === "new" ? null : collection
  const [client, setClient] = useState(current?.client ?? "")
  const [address, setAddress] = useState(current?.address ?? "")
  const [whatsapp, setWhatsapp] = useState(current?.whatsapp ?? "")
  const [selectedContract, setSelectedContract] = useState("manual")
  const clientContracts = contracts.filter((contract) => contract.storedStatus !== "archived")
  const selectClient = (id: string) => {
    setSelectedContract(id)
    const contract = clientContracts.find((item) => item.id === id)
    if (!contract) return
    setClient(contract.tradeName || contract.legalName)
    setAddress(contractCollectionAddress(contract))
    setWhatsapp(contract.phone)
  }
  return <Dialog open={open} onOpenChange={close}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><form key={current?.id ?? "new"} onSubmit={save}>
    <DialogHeader><DialogTitle>{collection === "new" ? "Adicionar nova coleta" : `Editar coleta — ${current?.client}`}</DialogTitle><DialogDescription>Selecione um cliente cadastrado para usar o endereço dele, ou preencha os dados manualmente.</DialogDescription></DialogHeader>
    <div className="my-6 grid gap-4 sm:grid-cols-2">
      <Field id="collectionRegisteredClient" label="Buscar cliente cadastrado" wide><Select value={selectedContract} onValueChange={selectClient}><SelectTrigger id="collectionRegisteredClient" className="w-full"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger><SelectContent><SelectItem value="manual">Preencher manualmente</SelectItem>{clientContracts.map((contract) => <SelectItem key={contract.id} value={contract.id}>{contract.tradeName || contract.legalName} — {contract.title}</SelectItem>)}</SelectContent></Select>{clientContracts.length === 0 && <p className="text-xs text-stone-500">Nenhum cliente cadastrado em contratos. Você pode preencher os dados abaixo.</p>}</Field>
      <Field id="collectionClient" label="Cliente" wide><Input id="collectionClient" name="collectionClient" value={client} onChange={(event) => setClient(event.target.value)} placeholder="Nome do cliente" required /></Field>
      <Field id="collectionDate" label="Data"><Input id="collectionDate" name="collectionDate" type="date" defaultValue={current?.date ?? defaultDate} required /></Field>
      <Field id="collectionTime" label="Horário"><Input id="collectionTime" name="collectionTime" type="time" defaultValue={current?.time ?? "09:00"} required /></Field>
      <Field id="collectionRoute" label="Rota"><Select name="collectionRoute" defaultValue={current?.route ?? routes[0]?.name}><SelectTrigger id="collectionRoute" className="w-full"><SelectValue placeholder="Selecione a rota" /></SelectTrigger><SelectContent>{routes.map((route) => <SelectItem key={route.id} value={route.name}>{route.name}</SelectItem>)}</SelectContent></Select></Field>
      <Field id="collectionStatus" label="Status"><Select name="collectionStatus" defaultValue={current?.status ?? "Planejada"}><SelectTrigger id="collectionStatus" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Planejada">Planejada</SelectItem><SelectItem value="Realizada">Realizada / entregue</SelectItem><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Reagendada">Reagendada</SelectItem></SelectContent></Select></Field>
      <Field id="collectionBombs" label="Quantidade de bombonas"><Input id="collectionBombs" name="collectionBombs" type="number" min="1" defaultValue={current?.bombs ?? 1} required /></Field>
      <Field id="collectionBombType" label="Tipo de bombona"><Input id="collectionBombType" name="collectionBombType" defaultValue={current?.bombType ?? "bombonas"} placeholder="Ex.: bombonas médias" required /></Field>
      <Field id="collectionAddress" label="Endereço da coleta" wide><Input id="collectionAddress" name="collectionAddress" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Selecione um cliente ou digite o endereço" required /></Field>
      <Field id="collectionContact" label="Nome do contato"><Input id="collectionContact" name="collectionContact" defaultValue={current?.contactName ?? ""} /></Field>
      <Field id="collectionWhatsapp" label="WhatsApp"><Input id="collectionWhatsapp" name="collectionWhatsapp" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="Telefone com DDD" /></Field>
      <Field id="collectionAccess" label="Instruções de acesso" wide><Textarea id="collectionAccess" name="collectionAccess" defaultValue={current?.accessInstructions ?? ""} placeholder="Portão, responsável, local das bombonas..." /></Field>
      <Field id="collectionRecurrence" label="Recorrência"><Select name="collectionRecurrence" defaultValue={current?.recurrence ?? "Semanal"}><SelectTrigger id="collectionRecurrence" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Não repetir">Não repetir</SelectItem><SelectItem value="Semanal">Semanal</SelectItem><SelectItem value="2x por semana">2x por semana</SelectItem><SelectItem value="Quinzenal">Quinzenal</SelectItem><SelectItem value="Mensal">Mensal</SelectItem></SelectContent></Select></Field>
      <Field id="collectionWeight" label="Peso coletado (kg)"><Input id="collectionWeight" name="collectionWeight" type="number" min="0" step="0.1" defaultValue={current?.weight ?? ""} placeholder="Obrigatório se realizada" /></Field>
      <Field id="collectionNote" label="Observação" wide><Textarea id="collectionNote" name="collectionNote" defaultValue={current?.note ?? ""} placeholder="Justificativa, ocorrência ou informação adicional" /></Field>
    </div>
    <div className="mb-5 rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-600">Uma coleta pode mudar livremente entre Planejada, Reagendada, Pendente e Realizada. Para marcar como Realizada, informe o peso; para Pendente, informe a justificativa.</div>
    <DialogFooter><Button type="button" variant="outline" onClick={() => close(false)}>Cancelar</Button><Button type="submit">{collection === "new" ? "Adicionar coleta" : "Salvar alterações"}</Button></DialogFooter>
  </form></DialogContent></Dialog>
}

function RouteDialog({ open, close, routes, collections, canManage, editing, setEditing, save, remove }: {
  open: boolean; close: (v: boolean) => void; routes: Route[]; collections: Collection[]; canManage: boolean;
  editing: Route | "new" | null; setEditing: (route: Route | "new" | null) => void;
  save: (event: FormEvent<HTMLFormElement>) => void; remove: (route: Route) => void
}) {
  const current = editing === "new" ? null : editing
  return <Dialog open={open} onOpenChange={(value) => { close(value); if (!value) setEditing(null) }}><DialogContent className="sm:max-w-2xl">
    {editing === null ? <>
      <DialogHeader><DialogTitle>Rotas de coleta</DialogTitle><DialogDescription>Cadastre uma nova rota ou edite as informações utilizadas nas coletas.</DialogDescription></DialogHeader>
      <div className="my-3 overflow-hidden rounded-xl border border-stone-200">
        <Table className="mobile-route-table"><TableHeader><TableRow><TableHead className="pl-4">Rota</TableHead><TableHead>Região atendida</TableHead><TableHead>Dia padrão</TableHead><TableHead className="pr-4 text-right">Ação</TableHead></TableRow></TableHeader><TableBody>
          {routes.map((route) => <TableRow key={route.id}><TableCell className="mobile-route-name pl-4"><p className="font-semibold text-forest-950">{route.name}</p><p className="text-xs text-stone-500">{collections.filter((item) => item.route === route.name).length} coleta(s)</p></TableCell><TableCell className="mobile-route-area">{route.area}</TableCell><TableCell className="mobile-route-day">{route.day}</TableCell><TableCell className="mobile-route-actions pr-4 text-right"><div className="flex justify-end gap-1"><Button size="icon-sm" variant="outline" onClick={() => setEditing(route)} aria-label={`Editar ${route.name}`}><Pencil /></Button>{canManage && <Button size="icon-sm" variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => remove(route)} aria-label={`Excluir ${route.name}`}><Trash2 /></Button>}</div></TableCell></TableRow>)}
        </TableBody></Table>
      </div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => close(false)}>Fechar</Button><Button type="button" onClick={() => setEditing("new")}><Plus />Nova rota</Button></DialogFooter>
    </> : <form key={current?.id ?? "new"} onSubmit={save}>
      <DialogHeader><DialogTitle>{editing === "new" ? "Adicionar nova rota" : `Editar ${current?.name}`}</DialogTitle><DialogDescription>Essas informações poderão ser usadas no planejamento das próximas coletas.</DialogDescription></DialogHeader>
      <div className="my-6 grid gap-4 sm:grid-cols-2">
        <Field id="routeName" label="Nome da rota" wide><Input id="routeName" name="routeName" defaultValue={current?.name ?? ""} placeholder="Ex.: Rota Oeste" required /></Field>
        <Field id="routeArea" label="Região ou bairros" wide><Input id="routeArea" name="routeArea" defaultValue={current?.area ?? ""} placeholder="Ex.: Zona Oeste e bairros próximos" required /></Field>
        <Field id="routeDay" label="Dia padrão" wide><Input id="routeDay" name="routeDay" defaultValue={current?.day ?? ""} placeholder="Ex.: Segunda e quarta" required /></Field>
      </div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Voltar</Button><Button type="submit">{editing === "new" ? "Adicionar rota" : "Salvar alterações"}</Button></DialogFooter>
    </form>}
  </DialogContent></Dialog>
}

function Field({ id, label, wide, children }: { id: string; label: string; wide?: boolean; children: ReactNode }) {
  return <div className={`space-y-2 ${wide ? "sm:col-span-2" : ""}`}><Label htmlFor={id}>{label}</Label>{children}</div>
}
