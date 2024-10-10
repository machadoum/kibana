/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';
import type { EntityDefinition } from '@kbn/entities-schema';
import type {
  EngineDescriptor,
  EntityType,
} from '../../../../../common/api/entity_analytics/entity_store/common.gen';

import { entityEngineDescriptorTypeName } from './engine_descriptor_type';
import { buildEntityDefinitionId, getByEntityTypeQuery } from '../utils/utils';
import { ENGINE_STATUS } from '../constants';

interface EngineDescriptorDependencies {
  soClient: SavedObjectsClientContract;
  namespace: string;
}

type EngineDescriptorUpdate = Partial<Pick<EngineDescriptor, 'status' | 'indexPattern'>>;

export class EngineDescriptorClient {
  constructor(private readonly deps: EngineDescriptorDependencies) {}

  async init(entityType: EntityType, definition: EntityDefinition, filter: string) {
    const engineDescriptor = await this.find(entityType);

    if (engineDescriptor.total > 0)
      throw new Error(`Entity engine for ${entityType} already exists`);

    const { attributes } = await this.deps.soClient.create<EngineDescriptor>(
      entityEngineDescriptorTypeName,
      {
        status: ENGINE_STATUS.INSTALLING,
        type: entityType,
        indexPattern: definition.indexPatterns.join(','),
        filter,
      },
      { id: definition.id }
    );
    return attributes;
  }

  async update(id: string, updatedDescriptor: EngineDescriptorUpdate) {
    const { attributes } = await this.deps.soClient.update<EngineDescriptor>(
      entityEngineDescriptorTypeName,
      id,
      updatedDescriptor,
      { refresh: 'wait_for' }
    );
    return attributes;
  }

  async find(entityType: EntityType): Promise<SavedObjectsFindResponse<EngineDescriptor>> {
    return this.deps.soClient.find<EngineDescriptor>({
      type: entityEngineDescriptorTypeName,
      filter: getByEntityTypeQuery(entityType),
      namespaces: [this.deps.namespace],
    });
  }

  async get(entityType: EntityType): Promise<EngineDescriptor> {
    const id = buildEntityDefinitionId(entityType, this.deps.namespace);

    const { attributes } = await this.deps.soClient.get<EngineDescriptor>(
      entityEngineDescriptorTypeName,
      id
    );

    return attributes;
  }

  async list() {
    return this.deps.soClient
      .find<EngineDescriptor>({
        type: entityEngineDescriptorTypeName,
        namespaces: [this.deps.namespace],
      })
      .then(({ saved_objects: engines }) => ({
        engines: engines.map((engine) => engine.attributes),
        count: engines.length,
      }));
  }

  async delete(id: string) {
    return this.deps.soClient.delete(entityEngineDescriptorTypeName, id);
  }
}
