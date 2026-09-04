/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
import { AgentBuilderServicesContext } from '../application/context/agent_builder_services_context';
import {
  StreamingProvider,
  useStreamingContext,
  type StreamingContextValue,
} from '../application/context/streaming/streaming_context';
import type { AgentBuilderInternalService } from '../services';

/**
 * Persistent QueryClient + StreamingProvider for the chrome sidebar conversation. Chrome
 * fully unmounts the sidebar's React tree on close, so React Query cache and in-flight
 * stream tracking kept in that tree would reset on every reopen. These are created once,
 * outside that lifecycle, so an in-flight execution keeps streaming (and the conversation
 * cache stays live) while the sidebar is closed — mirroring the routed app, where
 * `StreamingProvider` lives in `mount.tsx` and survives route changes.
 */
export const sidebarQueryClient = new QueryClient();

export const sidebarStreamingValue$ = new BehaviorSubject<StreamingContextValue | null>(null);

const StreamingBridge: React.FC = () => {
  const value = useStreamingContext();
  // Layout effect (not a regular effect) so the bridged value is populated synchronously,
  // before the sidebar can ever mount and read a stale `null`.
  useLayoutEffect(() => {
    sidebarStreamingValue$.next(value);
  }, [value]);
  return null;
};

export const SidebarStreamingSingletonRoot: React.FC<{
  coreStart: CoreStart;
  services: AgentBuilderInternalService;
}> = ({ coreStart, services }) => {
  const kibanaServices = {
    ...coreStart,
    plugins: { ...services.startDependencies },
  };

  return (
    <KibanaContextProvider services={kibanaServices}>
      <I18nProvider>
        <QueryClientProvider client={sidebarQueryClient}>
          <AgentBuilderServicesContext.Provider value={services}>
            <StreamingProvider>
              <StreamingBridge />
            </StreamingProvider>
          </AgentBuilderServicesContext.Provider>
        </QueryClientProvider>
      </I18nProvider>
    </KibanaContextProvider>
  );
};
