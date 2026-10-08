"use client";

import { useCallback, useEffect, useState } from "react";

import type { Contract, ContractInput, StoredContractStatus } from "@/lib/contracts";

type ApiError = { error?: string; fields?: Record<string, string[]> };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const payload = await response.json().catch(() => ({})) as T & ApiError;
  if (!response.ok) {
    const error = new Error(payload.error || "Não foi possível concluir a operação.") as Error & { fields?: Record<string, string[]> };
    error.fields = payload.fields;
    throw error;
  }
  return payload;
}

export function useContracts(enabled = true) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setContracts([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await requestJson<{ contracts: Contract[] }>("/api/contracts");
      setContracts(result.contracts);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar os contratos.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carregamento inicial da fonte remota
    void load();
  }, [load]);

  const create = async (input: ContractInput) => {
    const result = await requestJson<{ contract: Contract }>("/api/contracts", { method: "POST", body: JSON.stringify(input) });
    setContracts((items) => [...items, result.contract].sort((a, b) => a.endDate.localeCompare(b.endDate)));
    return result.contract;
  };

  const update = async (id: string, input: ContractInput) => {
    const result = await requestJson<{ contract: Contract }>(`/api/contracts/${id}`, { method: "PUT", body: JSON.stringify(input) });
    setContracts((items) => items.map((item) => item.id === id ? result.contract : item));
    return result.contract;
  };

  const get = async (id: string) => {
    const result = await requestJson<{ contract: Contract }>(`/api/contracts/${id}`);
    return result.contract;
  };

  const changeStatus = async (id: string, status: Exclude<StoredContractStatus, "archived">, actor: string, reason: string) => {
    const result = await requestJson<{ contract: Contract }>(`/api/contracts/${id}`, { method: "PATCH", body: JSON.stringify({ status, actor, reason }) });
    setContracts((items) => items.map((item) => item.id === id ? result.contract : item));
    return result.contract;
  };

  const archive = async (id: string, actor: string, reason: string) => {
    const result = await requestJson<{ contract: Contract }>(`/api/contracts/${id}`, { method: "DELETE", body: JSON.stringify({ actor, reason }) });
    setContracts((items) => items.map((item) => item.id === id ? result.contract : item));
  };

  return { contracts, loading, error, load, create, update, get, changeStatus, archive };
}

export type ContractsStore = ReturnType<typeof useContracts>;
