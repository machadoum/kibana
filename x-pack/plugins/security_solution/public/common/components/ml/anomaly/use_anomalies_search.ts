/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo } from 'react';
import { has, sortBy } from 'lodash/fp';

import { DEFAULT_ANOMALY_SCORE } from '../../../../../common/constants';
import * as i18n from './translations';
import { useUiSetting$ } from '../../../lib/kibana';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { notableAnomaliesSearch } from '../api/anomalies_search';
import type { NotableAnomaliesJobId } from '../../../../overview/components/entity_analytics/anomalies/config';
import { NOTABLE_ANOMALIES_IDS } from '../../../../overview/components/entity_analytics/anomalies/config';
import { getAggregatedAnomaliesQuery } from '../../../../overview/components/entity_analytics/anomalies/query';
import type { inputsModel } from '../../../store';
import { useSecurityJobs } from '../../ml_popover/hooks/use_security_jobs';
import type { SecurityJob } from '../../ml_popover/types';
import { useSpaceId } from '../../../hooks/use_space_id';

export enum AnomalyEntity {
  User,
  Host,
}

export interface AnomaliesCount {
  name: NotableAnomaliesJobId | string;
  count: number;
  entity: AnomalyEntity;
  job?: SecurityJob;
}

interface UseNotableAnomaliesSearchProps {
  skip: boolean;
  from: string;
  to: string;
}

export const useNotableAnomaliesSearch = ({
  skip,
  from,
  to,
}: UseNotableAnomaliesSearchProps): {
  isLoading: boolean;
  data: AnomaliesCount[];
  refetch: inputsModel.Refetch;
} => {
  const [data, setData] = useState<AnomaliesCount[]>([]);
  const spaceId = useSpaceId();

  const {
    loading: jobsLoading,
    isMlAdmin: isMlUser,
    jobs: securityJobs,
    refetch: refetchJobs,
  } = useSecurityJobs();

  const [loading, setLoading] = useState(true);
  const { addError } = useAppToasts();
  const [anomalyScoreThreshold] = useUiSetting$<number>(DEFAULT_ANOMALY_SCORE);

  const { notableAnomaliesJobs, query } = useMemo(() => {
    const newNotableAnomaliesJobs = securityJobs.filter(({ id }) =>
      NOTABLE_ANOMALIES_IDS.some((notableJobId) => matchJobId(id, notableJobId, spaceId))
    );

    const newQuery = getAggregatedAnomaliesQuery({
      jobIds: newNotableAnomaliesJobs.map(({ id }) => id),
      anomalyScoreThreshold,
      from,
      to,
    });

    return {
      query: newQuery,
      notableAnomaliesJobs: newNotableAnomaliesJobs,
    };
  }, [securityJobs, anomalyScoreThreshold, from, to, spaceId]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchAnomaliesSearch() {
      if (!isSubscribed) return;

      if (skip || !isMlUser || notableAnomaliesJobs.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await notableAnomaliesSearch(
          {
            jobIds: notableAnomaliesJobs.filter((job) => job.isInstalled).map(({ id }) => id),
            query,
          },
          abortCtrl.signal
        );

        if (isSubscribed) {
          setLoading(false);
          const buckets = response.aggregations?.number_of_anomalies.buckets ?? [];
          setData(formatResultData(buckets, notableAnomaliesJobs, spaceId));
        }
      } catch (error) {
        if (isSubscribed && error.name !== 'AbortError') {
          addError(error, { title: i18n.SIEM_TABLE_FETCH_FAILURE });
          setLoading(false);
        }
      }
    }

    fetchAnomaliesSearch();

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [skip, isMlUser, addError, query, notableAnomaliesJobs, refetchJobs, spaceId]);

  return { isLoading: loading || jobsLoading, data, refetch: refetchJobs };
};

function formatResultData(
  buckets: Array<{
    key: string;
    doc_count: number;
  }>,
  notableAnomaliesJobs: SecurityJob[],
  spaceId: string | undefined
): AnomaliesCount[] {
  const unsortedAnomalies: AnomaliesCount[] = NOTABLE_ANOMALIES_IDS.flatMap((notableJobId) => {
    const jobs = notableAnomaliesJobs.filter(({ id }) => matchJobId(id, notableJobId, spaceId));

    return jobs.map((job) => {
      const bucket = buckets.find(({ key }) => key === job?.id);
      const hasUserName = has("entity.hits.hits[0]._source['user.name']", bucket);

      return {
        name: job.customSettings?.security_app_display_name ?? notableJobId,
        count: bucket?.doc_count ?? 0,
        entity: hasUserName ? AnomalyEntity.User : AnomalyEntity.Host,
        job,
      };
    });
  });
  return sortBy(['name'], unsortedAnomalies);
}

export const installedJobPrefix = (spaceId: string | undefined) => `${spaceId ?? 'default'}_`;

export const uninstalledJobIdToInstalledJobId = (
  moduleJobId: string,
  spaceId: string | undefined
) => `${installedJobPrefix(spaceId)}${moduleJobId}`;

/**
 * From version 8.8, jobs installed using security solution have the spaceId in their name.
 * Jobs installed using security solution on versions older than 8.8 don't have the spaceId in their name.
 */
const matchJobId = (
  jobId: string,
  notableJobId: NotableAnomaliesJobId,
  spaceId: string | undefined
) => jobId === uninstalledJobIdToInstalledJobId(notableJobId, spaceId) || jobId === notableJobId;
