/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface StoreEntry {
  value: number;
  updated_at: string;
}

/**
 * In-memory store for memory counter attachment values.
 * Keyed by counter key (string). Values are integers.
 * updated_at is set on every write so isStale can compare with attachment.origin_snapshot_at.
 */
const store = new Map<string, StoreEntry>();

function nowIso(): string {
  return new Date().toISOString();
}

function logStoreState(operation: string): void {
  const state = Object.fromEntries(Array.from(store.entries()).map(([k, e]) => [k, e.value]));
  // eslint-disable-next-line no-console -- debug visibility for memory counter store
  console.log('[memory_counter store]', operation, '→', JSON.stringify(state));
}

export const memoryCounterStore = {
  get(key: string): number | undefined {
    const value = store.get(key)?.value;
    logStoreState(`get(${key})`);
    return value;
  },

  /** ISO 8601 timestamp of last write for this key. Used by isStale. */
  getUpdatedAt(key: string): string | undefined {
    return store.get(key)?.updated_at;
  },

  set(key: string, value: number): void {
    store.set(key, { value: Math.floor(value), updated_at: nowIso() });
    logStoreState(`set(${key}, ${value})`);
  },

  increment(key: string, delta: number = 1): number {
    const entry = store.get(key);
    const current = entry?.value ?? 0;
    const next = Math.floor(current + delta);
    store.set(key, { value: next, updated_at: nowIso() });
    logStoreState(`increment(${key}, ${delta}) → ${next}`);
    return next;
  },
};
