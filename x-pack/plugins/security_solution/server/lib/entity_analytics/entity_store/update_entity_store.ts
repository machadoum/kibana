/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import _ from 'lodash';
import moment from 'moment';
import type { Agent } from '@kbn/fleet-plugin/common';
import type { EndpointInternalFleetServicesInterface } from '../../../endpoint/services/fleet';
import type { EcsRiskScore } from '../../../../common/entity_analytics/risk_engine';
import type { NewEntityStoreEntity } from '../../../../common/entity_analytics/entity_store/types';
import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics';
import type { AssetCriticalityService } from '../asset_criticality';
import { AssetCriticalityDataClient } from '../asset_criticality';
import type { RiskEngineDataClient } from '../risk_engine/risk_engine_data_client';
import type { RiskScoreDataClient } from '../risk_score/risk_score_data_client';
import { EntityStoreDataClient } from './entity_store_data_client';
import {
  FIELD_HISTORY_MAX_SIZE,
  COMPOSITES_INDEX_PATTERN,
  MAX_COMPOSITE_SIZE,
  MAX_CRITICALITY_SIZE,
} from './constants';
import type { LatestTaskStateSchema } from './tasks/state';

export interface UpdateEntityStoreParams {
  timestamps?: LatestTaskStateSchema['timestamps'];
  ids?: LatestTaskStateSchema['ids'];
}

export interface UpdateEntityStoreResponse {
  errors: string[];
  entitiesUpdated: number;
  entitiesCreated: number;
  timestamps: {
    lastProcessedCompositeTimestamp?: string;
    lastProcessedCriticalityTimestamp?: string;
    lastProcessedRiskScoreTimestamp?: string;
    lastProcessedAgentCheckinTimestamp?: string;
  };
  ids: {
    lastProcessedCompositeId?: string;
    lastProcessedCriticalityId?: string;
    lastProcessedRiskScoreId?: {
      id_field: string;
      id_value: string;
    };
    lastProcessedAgentId?: string;
  };
}
interface OSInformation {
  Ext: {
    variant: string;
  };
  kernel: string;
  name: string;
  family: string;
  type: string;
  version: string;
  platform: string;
  full: string;
}
interface CompositeDocument {
  id: string;
  '@timestamp': string;
  type: 'host';
  host: {
    name: string;
  };
  ip_history: Array<{
    ip: string;
    timestamp: string;
  }>;
  first_doc_timestamp: string;
  last_doc_timestamp: string;
  latest_os_timestamp: string;
  latest_os: OSInformation;
}

interface CompositeHit {
  '@timestamp': string;
  host: {
    name: string;
  };
  entity: {
    type: 'host';
    ip_history: Array<{
      ip: string;
      timestamp: string;
    }>;
    first_doc_timestamp: string;
    last_doc_timestamp: string;
    latest_os_timestamp: string;
    latest_os: OSInformation;
  };
}

export const updateEntityStore = async ({
  spaceId,
  timestamps,
  esClient,
  logger,
  assetCriticalityService,
  riskEngineDataClient,
  entityStoreDataClient,
  riskScoreDataClient,
  ids,
  fleetServices,
}: UpdateEntityStoreParams & {
  spaceId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  assetCriticalityService: AssetCriticalityService;
  entityStoreDataClient: EntityStoreDataClient;
  riskEngineDataClient: RiskEngineDataClient;
  riskScoreDataClient: RiskScoreDataClient;
  fleetServices: EndpointInternalFleetServicesInterface;
}): Promise<UpdateEntityStoreResponse> => {
  const lastProcessedCompositeTimestamp =
    timestamps?.lastProcessedCompositeTimestamp || moment().subtract(1, 'day').toISOString();

  const lastProcessedCriticalityTimestamp =
    timestamps?.lastProcessedCriticalityTimestamp || moment().subtract(1, 'day').toISOString();

  const lastProcessedRiskScoreTimestamp =
    timestamps?.lastProcessedRiskScoreTimestamp || moment().subtract(1, 'day').toISOString();

  // TODO: this is a bad field to search on here, as status can change independently of checkin
  const lastProcessedAgentCheckinTimestamp =
    timestamps?.lastProcessedAgentCheckinTimestamp || moment().subtract(7, 'day').toISOString();

  const composites = await getNextEntityComposites({
    esClient,
    lastProcessedCompositeTimestamp,
    lastProcessedCompositeId: ids?.lastProcessedCompositeId,
  });

  const compositesByHostName = groupAndCombineCompositesByHostName(composites);

  logger.info(`Processing ${Object.keys(compositesByHostName).length} composites`);

  const assetCriticalitiesById = await getNewAssetCriticalitiesAndEntityAssetCriticalities(
    Object.keys(compositesByHostName),
    assetCriticalityService,
    lastProcessedCriticalityTimestamp,
    ids?.lastProcessedCriticalityId
  );

  const riskScoresById = await getNewRiskScoresAndEntityRiskScores(
    Object.keys(compositesByHostName),
    riskScoreDataClient,
    lastProcessedRiskScoreTimestamp,
    ids?.lastProcessedRiskScoreId
  );

  const agentRecordsById = await getNewAgentRecords(
    Object.keys(compositesByHostName),
    fleetServices,
    lastProcessedAgentCheckinTimestamp,
    ids?.lastProcessedAgentId
  );

  const compositeEntities: NewEntityStoreEntity[] = Object.entries(compositesByHostName).map(
    ([hostName, composite]) => {
      const criticalityId = AssetCriticalityDataClient.createId({
        idField: 'host.name',
        idValue: hostName,
      });

      const assetCriticality = assetCriticalitiesById[criticalityId];

      if (assetCriticality) {
        logger.info(`Found asset criticality for host ${hostName}`);
        delete assetCriticalitiesById[criticalityId];
      }

      const riskScoreId = createRiskScoreId({ id_field: 'host.name', id_value: hostName });
      const riskScore = riskScoresById[riskScoreId];
      if (riskScore) {
        logger.info(`Found risk score for host ${hostName}`);
        delete riskScoresById[riskScoreId];
      }

      const agent = agentRecordsById[hostName];
      if (agent) {
        logger.info(`Found agent for host ${hostName}`);
        delete agentRecordsById[hostName];
      }

      return buildEntityFromComposite({ composite, assetCriticality, riskScore });
    }
  );

  const remainingCriticalityEntities = Object.values(assetCriticalitiesById).map((criticality) => {
    logger.info(`Found asset criticality for host ${criticality.id_value}`);
    return buildEntityFromCriticalityRecord(criticality);
  });

  const remainingRiskScoreEntities = Object.values(riskScoresById).map((riskScore) => {
    logger.info(`Found risk score for host ${riskScore.host?.name}`);
    return buildEntityFromHostRiskScore(riskScore);
  });

  const remainingAgentEntities = Object.values(agentRecordsById).map((agent) => {
    logger.info(`Found agent for host ${agent.local_metadata.host.name}`);
    return buildEntityFromAgent(agent);
  });

  const mergedRemainingEntities = mergeNewEntities([
    ...remainingCriticalityEntities,
    ...remainingRiskScoreEntities,
    ...remainingAgentEntities,
  ]);

  const entities = [...compositeEntities, ...mergedRemainingEntities];

  const { errors, created, updated } = await entityStoreDataClient.bulkUpsertEntities({
    entities,
  });

  const { ids: newIds, timestamps: newTimestamps } = createLastProcessedInfo({
    composites,
    assetCriticalities: Object.values(assetCriticalitiesById),
    riskScores: Object.values(riskScoresById),
    agents: Object.values(agentRecordsById),
    ...timestamps,
    ...ids,
  });

  return {
    errors,
    entitiesUpdated: updated,
    entitiesCreated: created,
    ids: newIds,
    timestamps: newTimestamps,
  };
};

function createLastProcessedInfo(opts: {
  composites: CompositeDocument[];
  assetCriticalities: AssetCriticalityRecord[];
  riskScores: EcsRiskScore[];
  agents: Agent[];
  lastProcessedCompositeTimestamp?: string;
  lastProcessedCriticalityTimestamp?: string;
  lastProcessedRiskScoreTimestamp?: string;
  lastProcessedCompositeId?: string;
  lastProcessedCriticalityId?: string;
  lastProcessedRiskScoreId?: {
    id_field: string;
    id_value: string;
  };
  lastProcessedAgentCheckinTimestamp?: string;
  lastProcessedAgentId?: string;
}): {
  ids: UpdateEntityStoreResponse['ids'];
  timestamps: UpdateEntityStoreResponse['timestamps'];
} {
  const {
    composites,
    assetCriticalities,
    lastProcessedCriticalityTimestamp,
    lastProcessedCompositeTimestamp,
    lastProcessedCompositeId,
    lastProcessedCriticalityId,
    lastProcessedRiskScoreId,
    lastProcessedRiskScoreTimestamp,
  } = opts;

  const lastProcessedComposite = composites
    .sort((a, b) => moment(a['@timestamp']).diff(moment(b['@timestamp'])))
    .at(-1);
  const lastProcessedCriticality = assetCriticalities
    .sort((a, b) => moment(a['@timestamp']).diff(moment(b['@timestamp'])))
    .at(-1);
  const lastProcessedRiskScore = opts.riskScores
    .sort((a, b) => moment(a['@timestamp']).diff(moment(b['@timestamp'])))
    .at(-1);
  const lastProcessedAgent = opts.agents
    .sort((a, b) => moment(a.last_checkin).diff(moment(b.last_checkin)))
    .at(-1);

  return {
    ids: {
      lastProcessedCompositeId: lastProcessedComposite?.id || lastProcessedCompositeId,
      lastProcessedCriticalityId: lastProcessedCriticality
        ? AssetCriticalityDataClient.createIdFromRecord(lastProcessedCriticality)
        : lastProcessedCriticalityId,
      lastProcessedAgentId: lastProcessedAgent?.id || opts.lastProcessedAgentId,
      lastProcessedRiskScoreId: lastProcessedRiskScore?.host?.risk
        ? {
            id_field: lastProcessedRiskScore.host.risk.id_field,
            id_value: lastProcessedRiskScore.host.risk.id_value,
          }
        : lastProcessedRiskScoreId,
    },
    timestamps: {
      lastProcessedCompositeTimestamp:
        lastProcessedComposite?.['@timestamp'] || lastProcessedCompositeTimestamp,
      lastProcessedCriticalityTimestamp:
        lastProcessedCriticality?.['@timestamp'] || lastProcessedCriticalityTimestamp,
      lastProcessedRiskScoreTimestamp:
        lastProcessedRiskScore?.['@timestamp'] || lastProcessedRiskScoreTimestamp,
      lastProcessedAgentCheckinTimestamp:
        lastProcessedAgent?.last_checkin || opts.lastProcessedAgentCheckinTimestamp,
    },
  };
}

async function getNextEntityComposites({
  esClient,
  lastProcessedCompositeTimestamp,
  lastProcessedCompositeId,
}: {
  esClient: ElasticsearchClient;
  lastProcessedCompositeTimestamp?: string;
  lastProcessedCompositeId?: string;
}): Promise<CompositeDocument[]> {
  const result = await esClient.search<CompositeHit>({
    index: COMPOSITES_INDEX_PATTERN,
    size: MAX_COMPOSITE_SIZE,
    body: {
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: lastProcessedCompositeTimestamp,
                },
              },
            },
          ],
        },
      },
      sort: [
        {
          '@timestamp': {
            order: 'asc',
          },
        },
      ],
    },
  });

  let hits = result.hits.hits;

  // get all hits after _id lastProcessedCompositeId
  if (lastProcessedCompositeId) {
    const lastProcessedCompositeIndex = hits.findIndex(
      (hit) => hit._id === lastProcessedCompositeId
    );
    if (lastProcessedCompositeIndex !== -1) {
      hits = hits.slice(lastProcessedCompositeIndex + 1);
    }
  }

  return hits
    .filter((hit) => hit._source)
    .map((hit) => {
      const src = hit._source as CompositeHit;
      return {
        id: hit._id,
        '@timestamp': src['@timestamp'],
        type: src.entity.type,
        host: src.host,
        ip_history: src.entity.ip_history,
        first_doc_timestamp: src.entity.first_doc_timestamp,
        last_doc_timestamp: src.entity.last_doc_timestamp,
        latest_os_timestamp: src.entity.latest_os_timestamp,
        latest_os: src.entity.latest_os,
      };
    });
}

async function getNextAssetCriticalities({
  assetCriticalityService,
  fromTimestamp,
  lastProcessedId,
}: {
  assetCriticalityService: AssetCriticalityService;
  fromTimestamp?: string;
  lastProcessedId?: string;
}): Promise<AssetCriticalityRecord[]> {
  if (!fromTimestamp) {
    return [];
  }

  const criticalities = await assetCriticalityService.getCriticalitiesFromTimestamp({
    from: fromTimestamp,
    entityTypes: ['host'],
    size: MAX_CRITICALITY_SIZE,
  });

  if (!lastProcessedId || !criticalities.length) {
    return criticalities;
  }

  const lastProcessedIndex = criticalities.findIndex((criticality) => {
    return (
      AssetCriticalityDataClient.createIdFromRecord(criticality) === lastProcessedId &&
      criticality['@timestamp'] === fromTimestamp
    );
  });

  if (lastProcessedIndex === -1) {
    return criticalities;
  }

  return criticalities.slice(lastProcessedIndex + 1);
}

async function getNextRiskScores({
  riskScoreDataClient,
  fromTimestamp,
  lastProcessed,
}: {
  riskScoreDataClient: RiskScoreDataClient;
  fromTimestamp?: string;
  lastProcessed?: {
    id_field: string;
    id_value: string;
  };
}): Promise<EcsRiskScore[]> {
  if (!fromTimestamp) {
    return [];
  }

  let riskScores: EcsRiskScore[] = [];
  try {
    riskScores = await riskScoreDataClient.getRiskScoresFromTimestamp({
      from: fromTimestamp,
      size: MAX_CRITICALITY_SIZE,
      entityTypes: ['host'],
      namespace: 'default',
    });
  } catch (e) {
    // TODO logger
    // eslint-disable-next-line no-console
    console.error(`Error getting risk scores from timestamp: ${e}`);
    riskScores = [];
  }

  if (!lastProcessed || !riskScores.length) {
    return riskScores;
  }

  const lastProcessedIndex = riskScores.findIndex((riskScore) => {
    return (
      riskScore.host?.risk.id_value === lastProcessed.id_value &&
      riskScore.host?.risk.id_field === lastProcessed.id_field &&
      riskScore['@timestamp'] === fromTimestamp
    );
  });

  if (lastProcessedIndex === -1) {
    return riskScores;
  }

  return riskScores.slice(lastProcessedIndex + 1);
}

function compareTimestamps(a: string, b: string) {
  return moment(a).diff(moment(b));
}

function isTimestampBefore(a: string, b: string) {
  return compareTimestamps(a, b) < 0;
}

function isTimestampAfter(a: string, b: string) {
  return compareTimestamps(a, b) > 0;
}

function groupAndCombineCompositesByHostName(
  composites: CompositeDocument[]
): Record<string, CompositeDocument> {
  const compositesGroupedByHostName = _.groupBy(composites, (composite) => composite.host.name);

  const combinedCompositesByHostName = {} as Record<string, CompositeDocument>;

  Object.entries(compositesGroupedByHostName).forEach(([hostName, hostComposites]) => {
    const combinedCompositeDocument = hostComposites.reduce((combinedDoc, composite) => {
      const {
        ip_history: ipHistory,
        first_doc_timestamp: firstDocTimestamp,
        last_doc_timestamp: lastDocTimestamp,
        host,
        latest_os_timestamp: latestOsTimestamp,
        latest_os: latestOs,
      } = composite;

      if (!combinedDoc.host) {
        combinedDoc.host = host;
      }

      combinedDoc.ip_history = [...(combinedDoc.ip_history || []), ...ipHistory];

      if (
        !combinedDoc.first_doc_timestamp ||
        isTimestampBefore(firstDocTimestamp, combinedDoc.first_doc_timestamp)
      ) {
        combinedDoc.first_doc_timestamp = firstDocTimestamp;
      }

      if (
        !combinedDoc.last_doc_timestamp ||
        isTimestampAfter(lastDocTimestamp, combinedDoc.last_doc_timestamp)
      ) {
        combinedDoc.last_doc_timestamp = lastDocTimestamp;
      }

      if (
        !combinedDoc.latest_os_timestamp ||
        isTimestampAfter(latestOsTimestamp, combinedDoc.latest_os_timestamp)
      ) {
        combinedDoc.latest_os_timestamp = latestOsTimestamp;
        combinedDoc.latest_os = latestOs;
      }

      return combinedDoc;
    }, {} as Partial<CompositeDocument>);

    if (!combinedCompositeDocument.ip_history) {
      return;
    }

    combinedCompositeDocument.ip_history = combinedCompositeDocument.ip_history.sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp)
    );

    combinedCompositeDocument.ip_history = combinedCompositeDocument.ip_history.slice(
      0,
      FIELD_HISTORY_MAX_SIZE
    );

    combinedCompositesByHostName[hostName] = combinedCompositeDocument as CompositeDocument;
  });

  return combinedCompositesByHostName;
}

function buildEntityFromComposite(opts: {
  composite: CompositeDocument;
  assetCriticality?: AssetCriticalityRecord;
  riskScore?: EcsRiskScore;
}): NewEntityStoreEntity {
  const { composite, assetCriticality, riskScore } = opts;
  return {
    '@timestamp': new Date().toISOString(),
    entity_type: 'host',
    first_seen: composite.first_doc_timestamp,
    last_seen: composite.last_doc_timestamp,
    host: {
      ...composite.host,
      ip_history: composite.ip_history.map((ip) => ip),
      ...(assetCriticality ? { asset: { criticality: assetCriticality.criticality_level } } : {}),
      ...(composite.latest_os_timestamp ? { os_seen_at: composite.latest_os_timestamp } : {}),
      ...(composite.latest_os ? { os: composite.latest_os } : {}),
      ...(riskScore?.host?.risk ? { risk: riskScore.host.risk } : {}),
    },
  };
}

function buildEntityFromCriticalityRecord(
  assetCriticalityRecord: AssetCriticalityRecord
): NewEntityStoreEntity {
  return {
    '@timestamp': new Date().toISOString(),
    entity_type: 'host',
    host: {
      name: assetCriticalityRecord.id_value,
      asset: {
        criticality: assetCriticalityRecord.criticality_level,
      },
    },
    first_seen: assetCriticalityRecord['@timestamp'],
    last_seen: assetCriticalityRecord['@timestamp'],
  };
}

function buildEntityFromHostRiskScore(riskScore: EcsRiskScore): NewEntityStoreEntity {
  if (!riskScore.host?.risk) {
    throw new Error('Risk score does not contain a host risk');
  }
  return {
    '@timestamp': new Date().toISOString(),
    entity_type: 'host',
    host: {
      name: riskScore.host?.name,
      risk: riskScore.host?.risk,
    },
    first_seen: riskScore['@timestamp'],
    last_seen: riskScore['@timestamp'],
  };
}

function buildEntityFromAgent(agent: Agent): NewEntityStoreEntity {
  const now = new Date().toISOString();
  return {
    '@timestamp': now,
    entity_type: 'host',
    host: {
      name: agent.local_metadata.host.name,
    },
    agent,
    first_seen: agent.enrolled_at,
    last_seen: agent.last_checkin || now,
  };
}

async function getNewAssetCriticalitiesAndEntityAssetCriticalities(
  hostNames: string[],
  assetCriticalityService: AssetCriticalityService,
  lastProcessedCriticalityTimestamp?: string,
  lastProcessedCriticalityId?: string
): Promise<Record<string, AssetCriticalityRecord>> {
  try {
    const newAssetCriticalities = await getNextAssetCriticalities({
      assetCriticalityService,
      fromTimestamp: lastProcessedCriticalityTimestamp,
      lastProcessedId: lastProcessedCriticalityId,
    });

    const assetCriticalitiesById = _.keyBy(newAssetCriticalities, (criticality) =>
      AssetCriticalityDataClient.createId({
        idField: criticality.id_field,
        idValue: criticality.id_value,
      })
    );

    const assetCriticalitiesToGet = hostNames.filter(
      (hostName) =>
        !assetCriticalitiesById[
          AssetCriticalityDataClient.createId({ idField: 'host.name', idValue: hostName })
        ]
    );

    const entityAssetCriticalities = !assetCriticalitiesToGet.length
      ? []
      : await assetCriticalityService.getCriticalitiesByIdentifiers(
          assetCriticalitiesToGet.map((hostName) => ({
            id_field: 'host.name',
            id_value: hostName,
          }))
        );

    entityAssetCriticalities.forEach((criticality) => {
      assetCriticalitiesById[
        AssetCriticalityDataClient.createId({
          idField: criticality.id_field,
          idValue: criticality.id_value,
        })
      ] = criticality;
    });

    return assetCriticalitiesById;
  } catch (e) {
    // TODO logger
    // eslint-disable-next-line no-console
    console.error(`Error getting asset criticalities: ${e}`);
    throw e;
  }
}

function createRiskScoreId({
  id_field: idField,
  id_value: idValue,
}: {
  id_field: string;
  id_value: string;
}): string {
  return `${idField}:${idValue}`;
}

async function getNewRiskScoresAndEntityRiskScores(
  hostNames: string[],
  riskScoreDataClient: RiskScoreDataClient,
  lastProcessedRiskScoreTimestamp?: string,
  lastProcessedRiskScoreId?: {
    id_field: string;
    id_value: string;
  }
): Promise<Record<string, EcsRiskScore>> {
  const newRiskScores = await getNextRiskScores({
    riskScoreDataClient,
    fromTimestamp: lastProcessedRiskScoreTimestamp,
    lastProcessed: lastProcessedRiskScoreId,
  });

  const hostRiskScores = newRiskScores.filter((riskScore) => riskScore.host?.risk);

  const riskScoresById = _.keyBy(
    hostRiskScores,
    (riskScore) => createRiskScoreId(riskScore.host!.risk) // eslint-disable-line @typescript-eslint/no-non-null-assertion
  );

  const riskScoresToGet = hostNames.filter(
    (hostName) => !riskScoresById[createRiskScoreId({ id_field: 'host.name', id_value: hostName })]
  );

  const entityRiskScores = !riskScoresToGet.length
    ? []
    : await riskScoreDataClient.getRiskScoresByIdentifiers(
        riskScoresToGet.map((hostName) => ({
          id_field: 'host.name',
          id_value: hostName,
        })),
        'default'
      );

  entityRiskScores.forEach((riskScore) => {
    riskScoresById[createRiskScoreId(riskScore.host!.risk)] = riskScore; // eslint-disable-line @typescript-eslint/no-non-null-assertion
  });

  return riskScoresById;
}

function mergeNewEntities(entities: NewEntityStoreEntity[]): NewEntityStoreEntity[] {
  const entitiesByHostName = _.groupBy(entities, (entity) => entity.host.name);

  return Object.entries(entitiesByHostName).map(([hostName, hostEntities]) => {
    const mergedEntity = hostEntities.reduce(
      (merged, entity) => EntityStoreDataClient.mergeEntities(merged, entity),
      {} as NewEntityStoreEntity
    );

    return mergedEntity;
  });
}

// TODO: last checkin is a bad field to seacrch on here, as status can change independently of checkin
// we really want to avoid having to search all agents as there could be 100k+ agents here
async function getNewAgentRecords(
  hostNames: string[],
  fleetServices: EndpointInternalFleetServicesInterface,
  lastProcessedAgentCheckinTimestamp?: string,
  lastProcessedAgentId?: string
): Promise<Record<string, Agent>> {
  const hostNamesFilter = hostNames.length
    ? hostNames.map((hostName) => `local_metadata.host.name: ${hostName}`).join(' or ')
    : '';

  const lastCheckinFilter = lastProcessedAgentCheckinTimestamp
    ? `last_checkin > "${lastProcessedAgentCheckinTimestamp}"`
    : '';

  const hostnameExistsFilter = 'local_metadata.host.name:*';

  const hostsKuery = [hostNamesFilter, lastCheckinFilter].filter(Boolean).join(' or ');

  const kuery = `(${hostsKuery}) and ${hostnameExistsFilter}`;

  const { agents } = await fleetServices.agent.listAgents({
    kuery,
    showInactive: true,
    sortField: 'last_checkin',
    sortOrder: 'desc',
  });

  if (!lastProcessedAgentId || !lastProcessedAgentCheckinTimestamp || !agents.length) {
    return _.keyBy(agents, 'local_metadata.host.name');
  }

  const lastProcessedIndex = agents.findIndex(
    (agent) =>
      agent.id === lastProcessedAgentId &&
      agent?.last_checkin &&
      agent.last_checkin > lastProcessedAgentCheckinTimestamp
  );

  if (lastProcessedIndex === -1) {
    return _.keyBy(agents, 'local_metadata.host.name');
  }

  return _.keyBy(agents.slice(lastProcessedIndex + 1), 'local_metadata.host.name');
}

// example agent record
// {
//   "_index": ".fleet-agents-7",
//   "_id": "c05bc335-7ad7-45f5-bdf5-f7c9c3416999",
//   "_score": 1,
//   "_source": {
//     "access_api_key_id": "WDxG740BAG_XfFTa8Wbz",
//     "action_seq_no": [
//       -1
//     ],
//     "active": true,
//     "agent": {
//       "id": "c05bc335-7ad7-45f5-bdf5-f7c9c3416999",
//       "version": "8.13.0"
//     },
//     "enrolled_at": "2024-02-28T10:33:40Z",
//     "local_metadata": {
//       "elastic": {
//         "agent": {
//           "build.original": "8.13.0 (build: edeb9adbf0c11a997359038d1393d14ab03462ce at 2024-02-23 12:32:56 +0000 UTC)",
//           "complete": false,
//           "id": "c05bc335-7ad7-45f5-bdf5-f7c9c3416999",
//           "log_level": "info",
//           "snapshot": false,
//           "upgradeable": false,
//           "version": "8.13.0"
//         }
//       },
//       "host": {
//         "architecture": "x86_64",
//         "hostname": "ec7ed2db3b3f",
//         "id": "",
//         "ip": [
//           "127.0.0.1/8",
//           "172.17.0.10/16"
//         ],
//         "mac": [
//           "02:42:ac:11:00:0a"
//         ],
//         "name": "ec7ed2db3b3f"
//       },
//       "os": {
//         "family": "debian",
//         "full": "Ubuntu focal(20.04.6 LTS (Focal Fossa))",
//         "kernel": "5.15.0-1032-gcp",
//         "name": "Ubuntu",
//         "platform": "ubuntu",
//         "version": "20.04.6 LTS (Focal Fossa)"
//       }
//     },
//     "policy_id": "policy-elastic-agent-on-cloud",
//     "type": "PERMANENT",
//     "outputs": {
//       "es-containerhost": {
//         "api_key": "XjxH740BAG_XfFTaAmYH:AtX5ejLMRIyfcmRXTMX-Lg",
//         "permissions_hash": "b8bf91d03aa17d178cdd82db91a1e0e7711e8fd623ee2d5cb689f912ad5cd026",
//         "type": "elasticsearch",
//         "api_key_id": "XjxH740BAG_XfFTaAmYH"
//       }
//     },
//     "policy_revision_idx": 5,
//     "policy_coordinator_idx": 1,
//     "updated_at": "2024-02-28T10:36:25Z",
//     "components": [
//       {
//         "id": "fleet-server-es-containerhost",
//         "units": [
//           {
//             "id": "fleet-server-es-containerhost-fleet-server-fleet_server-elastic-cloud-fleet-server",
//             "type": "input",
//             "message": "Re-configuring",
//             "status": "CONFIGURING"
//           },
//           {
//             "id": "fleet-server-es-containerhost",
//             "type": "output",
//             "message": "Re-configuring",
//             "status": "CONFIGURING"
//           }
//         ],
//         "type": "fleet-server",
//         "message": "Healthy: communicating with pid '153'",
//         "status": "HEALTHY"
//       },
//       {
//         "id": "apm-es-containerhost",
//         "units": [
//           {
//             "id": "apm-es-containerhost",
//             "type": "output",
//             "message": "Healthy",
//             "status": "HEALTHY"
//           },
//           {
//             "id": "apm-es-containerhost-elastic-cloud-apm",
//             "type": "input",
//             "message": "Healthy",
//             "status": "HEALTHY"
//           }
//         ],
//         "type": "apm",
//         "message": "Healthy: communicating with pid '179'",
//         "status": "HEALTHY"
//       }
//     ],
//     "last_checkin_message": "Running",
//     "last_checkin_status": "online",
//     "last_checkin": "2024-02-28T10:36:20Z"
//   }
// }
