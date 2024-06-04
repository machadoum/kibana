/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TransformGetTransformResponse,
  TransformGetTransformStatsResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { scheduleLatestTransformNow, scheduleTransformNow } from './transforms';

const transformId = 'test_transform_id';

const startedTransformsMock = {
  count: 1,
  transforms: [
    {
      id: 'test_transform_id_1',
      state: 'started',
    },
  ],
} as TransformGetTransformStatsResponse;

const stoppedTransformsMock = {
  count: 1,
  transforms: [
    {
      id: 'test_transform_id_2',
      state: 'stopped',
    },
  ],
} as TransformGetTransformStatsResponse;

const outdatedTransformsMock = {
  count: 1,
  transforms: [
    {
      id: 'test_transform_id_3',
      sync: {
        time: {
          delay: '2s',
        },
      },
    },
  ],
} as TransformGetTransformResponse;

describe('transforms utils', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('scheduleTransformNow', () => {
    it('calls startTransform when the transform state is stopped ', async () => {
      const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
      esClient.transform.getTransformStats.mockResolvedValueOnce(stoppedTransformsMock);

      await scheduleTransformNow({ esClient, transformId });

      expect(esClient.transform.startTransform).toHaveBeenCalled();
    });

    it('calls scheduleNowTransform when the transform state is started ', async () => {
      const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
      esClient.transform.getTransformStats.mockResolvedValueOnce(startedTransformsMock);

      await scheduleTransformNow({ esClient, transformId });

      expect(esClient.transform.scheduleNowTransform).toHaveBeenCalled();
    });
  });

  describe('scheduleLatestTransformNow', () => {
    it('calls update the latest transform when scheduleTransformNow is called and the transform is outdated', async () => {
      const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
      esClient.transform.getTransformStats.mockResolvedValueOnce(stoppedTransformsMock);
      esClient.transform.getTransform.mockResolvedValueOnce(outdatedTransformsMock);

      await scheduleLatestTransformNow({ esClient, namespace: 'tests' });

      expect(esClient.transform.updateTransform).toHaveBeenCalled();
    });
  });
});
