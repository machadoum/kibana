/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { ExperimentalFeatures } from '../../../../common';
import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics';
import type { AssetCriticalityDataClient } from './asset_criticality_data_client';

interface CriticalityIdentifier {
  id_field: string;
  id_value: string;
}

interface IdentifierValuesByField {
  [idField: string]: string[];
}

export interface AssetCriticalityService {
  getCriticalitiesByIdentifiers: (
    identifiers: CriticalityIdentifier[]
  ) => Promise<AssetCriticalityRecord[]>;
  getCriticalitiesFromTimestamp: (from: string) => Promise<AssetCriticalityRecord[]>;
  isEnabled: () => boolean;
}

const isCriticalityIdentifierValid = (identifier: CriticalityIdentifier): boolean =>
  !isEmpty(identifier.id_field) && !isEmpty(identifier.id_value);

const groupIdentifierValuesByField = (
  identifiers: CriticalityIdentifier[]
): IdentifierValuesByField =>
  identifiers.reduce((acc, id) => {
    acc[id.id_field] ??= [];
    if (!acc[id.id_field].includes(id.id_value)) {
      acc[id.id_field].push(id.id_value);
    }
    return acc;
  }, {} as IdentifierValuesByField);

const buildCriticalitiesQuery = (identifierValuesByField: IdentifierValuesByField) => ({
  bool: {
    filter: {
      bool: {
        should: Object.keys(identifierValuesByField).map((idField) => ({
          bool: {
            must: [
              { term: { id_field: idField } },
              { terms: { id_value: identifierValuesByField[idField] } },
            ],
          },
        })),
      },
    },
  },
});

const getCriticalitiesByIdentifiers = async ({
  assetCriticalityDataClient,
  identifiers,
}: {
  assetCriticalityDataClient: AssetCriticalityDataClient;
  identifiers: CriticalityIdentifier[];
}): Promise<AssetCriticalityRecord[]> => {
  if (identifiers.length === 0) {
    throw new Error('At least one identifier must be provided');
  }
  const validIdentifiers = identifiers.filter((id) => isCriticalityIdentifierValid(id));

  if (validIdentifiers.length === 0) {
    throw new Error('At least one identifier must contain a valid field and value');
  }

  const identifierCount = validIdentifiers.length;
  const identifierValuesByField = groupIdentifierValuesByField(validIdentifiers);
  const criticalitiesQuery = buildCriticalitiesQuery(identifierValuesByField);

  const criticalitySearchResponse = await assetCriticalityDataClient.search({
    query: criticalitiesQuery,
    size: identifierCount,
  });

  // @ts-expect-error @elastic/elasticsearch _source is optional
  return criticalitySearchResponse.hits.hits.map((hit) => hit._source);
};

const getCriticalitiesFromTimestamp = async ({
  assetCriticalityDataClient,
  from,
}: {
  assetCriticalityDataClient: AssetCriticalityDataClient;
  from: string;
}): Promise<AssetCriticalityRecord[]> => {
  const criticalitySearchResponse = await assetCriticalityDataClient.search({
    query: {
      range: {
        '@timestamp': {
          gte: from,
        },
      },
    },
  });

  return criticalitySearchResponse.hits.hits
    .map((hit) => hit._source)
    .filter((source): source is AssetCriticalityRecord => source !== undefined);
};

interface AssetCriticalityServiceFactoryOptions {
  assetCriticalityDataClient: AssetCriticalityDataClient;
  experimentalFeatures: ExperimentalFeatures;
}

export const assetCriticalityServiceFactory = ({
  assetCriticalityDataClient,
  experimentalFeatures,
}: AssetCriticalityServiceFactoryOptions): AssetCriticalityService => ({
  getCriticalitiesByIdentifiers: (identifiers: CriticalityIdentifier[]) =>
    getCriticalitiesByIdentifiers({ assetCriticalityDataClient, identifiers }),
  getCriticalitiesFromTimestamp: (from: string) =>
    getCriticalitiesFromTimestamp({ assetCriticalityDataClient, from }),
  isEnabled: () => experimentalFeatures.entityAnalyticsAssetCriticalityEnabled,
});
