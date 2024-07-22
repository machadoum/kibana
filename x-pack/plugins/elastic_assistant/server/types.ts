/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type {
  AuthenticatedUser,
  CoreRequestHandlerContext,
  CoreSetup,
  AnalyticsServiceSetup,
  CustomRequestHandlerContext,
  IRouter,
  KibanaRequest,
  Logger,
  SecurityServiceStart,
} from '@kbn/core/server';
import { type MlPluginSetup } from '@kbn/ml-plugin/server';
import { DynamicStructuredTool, Tool } from '@langchain/core/tools';
import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { RetrievalQAChain } from 'langchain/chains';
import { ElasticsearchClient } from '@kbn/core/server';
import {
  AttackDiscoveryPostRequestBody,
  AssistantFeatures,
  ExecuteConnectorRequestBody,
  Replacements,
  EntityResolutionPostRequestBody,
  SearchEntity,
} from '@kbn/elastic-assistant-common';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import {
  ActionsClientChatOpenAI,
  ActionsClientLlm,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server';

import { AttackDiscoveryDataClient } from './ai_assistant_data_clients/attack_discovery';
import { AIAssistantConversationsDataClient } from './ai_assistant_data_clients/conversations';
import type { GetRegisteredFeatures, GetRegisteredTools } from './services/app_context';
import { AIAssistantDataClient } from './ai_assistant_data_clients';
import { AIAssistantKnowledgeBaseDataClient } from './ai_assistant_data_clients/knowledge_base';
import { EntityResolutionDataClient } from './ai_assistant_data_clients/entity_resolution';

export const PLUGIN_ID = 'elasticAssistant' as const;

/** The plugin setup interface */
export interface ElasticAssistantPluginSetup {
  actions: ActionsPluginSetup;
}

/** The plugin start interface */
export interface ElasticAssistantPluginStart {
  /**
   * Actions plugin start contract.
   */
  actions: ActionsPluginStart;
  /**
   * Register features to be used by the elastic assistant.
   *
   * Note: Be sure to use the pluginName that is sent in the request headers by your plugin to ensure it is extracted
   * and the correct features are available. See {@link getPluginNameFromRequest} for more details.
   *
   * @param pluginName Name of the plugin the features should be registered to
   * @param features Partial<AssistantFeatures> to be registered with for the given plugin
   */
  registerFeatures: (pluginName: string, features: Partial<AssistantFeatures>) => void;
  /**
   * Get the registered features for a given plugin name.
   * @param pluginName Name of the plugin to get the features for
   */
  getRegisteredFeatures: GetRegisteredFeatures;
  /**
   * Register tools to be used by the elastic assistant.
   *
   * Note: Be sure to use the pluginName that is sent in the request headers by your plugin to ensure it is extracted
   * and the correct tools are selected. See {@link getPluginNameFromRequest} for more details.
   *
   * @param pluginName Name of the plugin the tool should be registered to
   * @param tools AssistantTools to be registered with for the given plugin
   */
  registerTools: (pluginName: string, tools: AssistantTool[]) => void;
  /**
   * Get the registered tools for a given plugin name.
   * @param pluginName Name of the plugin to get the tools for
   */
  getRegisteredTools: GetRegisteredTools;
}

export interface ElasticAssistantPluginSetupDependencies {
  actions: ActionsPluginSetup;
  ml: MlPluginSetup;
  taskManager: TaskManagerSetupContract;
  spaces?: SpacesPluginSetup;
}
export interface ElasticAssistantPluginStartDependencies {
  actions: ActionsPluginStart;
  spaces?: SpacesPluginStart;
  security: SecurityServiceStart;
}

export interface ElasticAssistantApiRequestHandlerContext {
  core: CoreRequestHandlerContext;
  actions: ActionsPluginStart;
  getRegisteredFeatures: GetRegisteredFeatures;
  getRegisteredTools: GetRegisteredTools;
  logger: Logger;
  getServerBasePath: () => string;
  getSpaceId: () => string;
  getCurrentUser: () => AuthenticatedUser | null;
  getAIAssistantConversationsDataClient: () => Promise<AIAssistantConversationsDataClient | null>;
  getAIAssistantKnowledgeBaseDataClient: (
    initializeKnowledgeBase: boolean
  ) => Promise<AIAssistantKnowledgeBaseDataClient | null>;
  getAttackDiscoveryDataClient: () => Promise<AttackDiscoveryDataClient | null>;
  getEntityResolutionDataClient: () => Promise<EntityResolutionDataClient | null>;
  getAIAssistantPromptsDataClient: () => Promise<AIAssistantDataClient | null>;
  getAIAssistantAnonymizationFieldsDataClient: () => Promise<AIAssistantDataClient | null>;
  telemetry: AnalyticsServiceSetup;
}
/**
 * @internal
 */
export type ElasticAssistantRequestHandlerContext = CustomRequestHandlerContext<{
  elasticAssistant: ElasticAssistantApiRequestHandlerContext;
  licensing: LicensingApiRequestHandlerContext;
}>;

export type ElasticAssistantPluginRouter = IRouter<ElasticAssistantRequestHandlerContext>;

export type ElasticAssistantPluginCoreSetupDependencies = CoreSetup<
  ElasticAssistantPluginStartDependencies,
  ElasticAssistantPluginStart
>;

export type GetElser = () => Promise<string> | never;

export interface InitAssistantResult {
  assistantResourcesInstalled: boolean;
  assistantNamespaceResourcesInstalled: boolean;
  assistantSettingsCreated: boolean;
  errors: string[];
}

export interface AssistantResourceNames {
  componentTemplate: {
    conversations: string;
    knowledgeBase: string;
    prompts: string;
    anonymizationFields: string;
    attackDiscovery: string;
  };
  indexTemplate: {
    conversations: string;
    knowledgeBase: string;
    prompts: string;
    anonymizationFields: string;
    attackDiscovery: string;
  };
  aliases: {
    conversations: string;
    knowledgeBase: string;
    prompts: string;
    anonymizationFields: string;
    attackDiscovery: string;
  };
  indexPatterns: {
    conversations: string;
    knowledgeBase: string;
    prompts: string;
    anonymizationFields: string;
    attackDiscovery: string;
  };
  pipelines: {
    knowledgeBase: string;
  };
}

export interface IIndexPatternString {
  pattern: string;
  alias: string;
  name: string;
  basePattern: string;
  validPrefixes?: string[];
  secondaryAlias?: string;
}

export interface PublicAIAssistantDataClient {
  getConversationsLimitValue: () => number;
}

export interface IAIAssistantDataClient {
  client(): PublicAIAssistantDataClient | null;
}

export interface AIAssistantPrompts {
  id: string;
}

/**
 * Interfaces for registering tools to be used by the elastic assistant
 */

export interface AssistantTool {
  id: string;
  name: string;
  description: string;
  sourceRegister: string;
  isSupported: (params: AssistantToolParams) => boolean;
  getTool: (params: AssistantToolParams) => Tool | DynamicStructuredTool | null;
}

export interface AssistantToolParams {
  entityResolutionClient?: EntityResolutionDataClient;
  alertsIndexPattern?: string;
  entitiesIndexPattern?: string;
  searchEntity?: SearchEntity;
  anonymizationFields?: AnonymizationFieldResponse[];
  isEnabledKnowledgeBase: boolean;
  chain?: RetrievalQAChain;
  esClient: ElasticsearchClient;
  kbDataClient?: AIAssistantKnowledgeBaseDataClient;
  langChainTimeout?: number;
  llm?: ActionsClientLlm | ActionsClientChatOpenAI | ActionsClientSimpleChatModel;
  logger: Logger;
  modelExists: boolean;
  onNewReplacements?: (newReplacements: Replacements) => void;
  replacements?: Replacements;
  request: KibanaRequest<
    unknown,
    unknown,
    ExecuteConnectorRequestBody | AttackDiscoveryPostRequestBody | EntityResolutionPostRequestBody
  >;
  size?: number;
}
