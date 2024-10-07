/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, isEntityDefinitionWithIndexPattern } from '@kbn/entities-schema';
import {
  QueryDslQueryContainer,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { DataViewsService } from '@kbn/data-views-plugin/common';
import { getElasticsearchQueryOrThrow } from '../helpers/get_elasticsearch_query_or_throw';
import { generateHistoryMetricAggregations } from './generate_metric_aggregations';
import {
  ENTITY_DEFAULT_HISTORY_FREQUENCY,
  ENTITY_DEFAULT_HISTORY_SYNC_DELAY,
} from '../../../../common/constants_entities';
import { generateHistoryMetadataAggregations } from './generate_metadata_aggregations';
import {
  generateHistoryTransformId,
  generateHistoryIngestPipelineId,
  generateHistoryIndexName,
  generateHistoryBackfillTransformId,
} from '../helpers/generate_component_id';
import { isBackfillEnabled } from '../helpers/is_backfill_enabled';

export function generateHistoryTransform(
  definition: EntityDefinition,
  dataViewsService: DataViewsService
): Promise<TransformPutTransformRequest> {
  const filter: QueryDslQueryContainer[] = [];

  if (definition.filter) {
    filter.push(getElasticsearchQueryOrThrow(definition.filter));
  }

  if (definition.identityFields.some(({ optional }) => !optional)) {
    definition.identityFields
      .filter(({ optional }) => !optional)
      .forEach(({ field }) => {
        filter.push({ exists: { field } });
      });
  }

  filter.push({
    range: {
      [definition.history.timestampField]: {
        gte: `now-${definition.history.settings.lookbackPeriod}`,
      },
    },
  });

  return generateTransformPutRequest({
    definition,
    filter,
    transformId: generateHistoryTransformId(definition),
    frequency: definition.history.settings.frequency,
    syncDelay: definition.history.settings.syncDelay,
    dataViewsService,
  });
}

export async function generateBackfillHistoryTransform(
  definition: EntityDefinition,
  dataViewsService: DataViewsService
): Promise<TransformPutTransformRequest> {
  if (!isBackfillEnabled(definition)) {
    throw new Error(
      'generateBackfillHistoryTransform called without history.settings.backfillSyncDelay set'
    );
  }

  const filter: QueryDslQueryContainer[] = [];

  if (definition.filter) {
    filter.push(getElasticsearchQueryOrThrow(definition.filter));
  }

  if (definition.history.settings.backfillLookbackPeriod) {
    filter.push({
      range: {
        [definition.history.timestampField]: {
          gte: `now-${definition.history.settings.backfillLookbackPeriod}`,
        },
      },
    });
  }

  if (definition.identityFields.some(({ optional }) => !optional)) {
    definition.identityFields
      .filter(({ optional }) => !optional)
      .forEach(({ field }) => {
        filter.push({ exists: { field } });
      });
  }

  const putRequest = await generateTransformPutRequest({
    definition,
    filter,
    transformId: generateHistoryBackfillTransformId(definition),
    frequency: definition.history.settings.backfillFrequency,
    syncDelay: definition.history.settings.backfillSyncDelay,
    dataViewsService,
  });

  return putRequest;
}

const generateTransformPutRequest = async ({
  definition,
  filter,
  transformId,
  frequency,
  syncDelay,
  dataViewsService,
}: {
  definition: EntityDefinition;
  transformId: string;
  filter: QueryDslQueryContainer[];
  frequency?: string;
  syncDelay?: string;
  dataViewsService: DataViewsService;
}) => {
  return {
    transform_id: transformId,
    _meta: {
      definitionVersion: definition.version,
      managed: definition.managed,
    },
    defer_validation: true,
    source: {
      index: await getIndexPatterns(definition, dataViewsService),
      ...(filter.length > 0 && {
        query: {
          bool: {
            filter,
          },
        },
      }),
    },
    dest: {
      index: `${generateHistoryIndexName({ id: 'noop' } as EntityDefinition)}`,
      pipeline: generateHistoryIngestPipelineId(definition),
    },
    frequency: frequency || ENTITY_DEFAULT_HISTORY_FREQUENCY,
    sync: {
      time: {
        field: definition.history.settings.syncField || definition.history.timestampField,
        delay: syncDelay || ENTITY_DEFAULT_HISTORY_SYNC_DELAY,
      },
    },
    settings: {
      deduce_mappings: false,
      unattended: true,
    },
    pivot: {
      group_by: {
        ...definition.identityFields.reduce(
          (acc, id) => ({
            ...acc,
            [`entity.identity.${id.field}`]: {
              terms: { field: id.field, missing_bucket: id.optional },
            },
          }),
          {}
        ),
        ['@timestamp']: {
          date_histogram: {
            field: definition.history.timestampField,
            fixed_interval: definition.history.interval,
          },
        },
      },
      aggs: {
        ...generateHistoryMetricAggregations(definition),
        ...generateHistoryMetadataAggregations(definition),
        'entity.lastSeenTimestamp': {
          max: {
            field: definition.history.timestampField,
          },
        },
      },
    },
  };
};

// TODO ADD UNIT TESTS
const getIndexPatterns = async (
  definition: EntityDefinition,
  dataViewsService: DataViewsService
): Promise<string | string[]> => {
  if (isEntityDefinitionWithIndexPattern(definition)) {
    return definition.indexPatterns; // dataViewId or indexPatterns must be defined
  }

  try {
    const dataView = await dataViewsService.get(definition.dataViewId);
    return [dataView.getIndexPattern()];
  } catch (e) {
    throw new Error(
      `Data view '${definition.dataViewId}' not found for entity definition '${definition.id}'.` +
        e.message
    );
  }
};
