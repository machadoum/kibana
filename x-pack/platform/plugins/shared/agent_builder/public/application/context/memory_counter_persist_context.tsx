/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';

export interface MemoryCounterPersistContextValue {
  conversationId: string | undefined;
  /**
   * counterKey is attachment.origin. Persist API resolves the store key by attachmentId;
   * the key is still passed for the follow-up updateOrigin call.
   */
  persistMemoryCounter: (attachmentId: string, counterKey: string, value: number) => Promise<void>;
}

const MemoryCounterPersistContext = createContext<MemoryCounterPersistContextValue | undefined>(
  undefined
);

export const useMemoryCounterPersistContext = (): MemoryCounterPersistContextValue | undefined => {
  return useContext(MemoryCounterPersistContext);
};

interface MemoryCounterPersistProviderProps {
  conversationId: string | undefined;
  persistMemoryCounter: (attachmentId: string, counterKey: string, value: number) => Promise<void>;
  children: React.ReactNode;
}

export const MemoryCounterPersistProvider: React.FC<MemoryCounterPersistProviderProps> = ({
  conversationId,
  persistMemoryCounter,
  children,
}) => {
  const value = useMemo<MemoryCounterPersistContextValue>(
    () => ({ conversationId, persistMemoryCounter }),
    [conversationId, persistMemoryCounter]
  );
  return (
    <MemoryCounterPersistContext.Provider value={value}>
      {children}
    </MemoryCounterPersistContext.Provider>
  );
};
