/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storageKeys } from '../storage_keys';

export const persistActiveExecutionId = (conversationId: string, executionId: string): void => {
  try {
    localStorage.setItem(storageKeys.getActiveExecutionKey(conversationId), executionId);
  } catch {
    // localStorage may be unavailable
  }
};

export const readActiveExecutionId = (conversationId: string): string | undefined => {
  try {
    return localStorage.getItem(storageKeys.getActiveExecutionKey(conversationId)) ?? undefined;
  } catch {
    return undefined;
  }
};

export const clearActiveExecutionId = (conversationId: string): void => {
  try {
    localStorage.removeItem(storageKeys.getActiveExecutionKey(conversationId));
  } catch {
    // localStorage may be unavailable
  }
};
