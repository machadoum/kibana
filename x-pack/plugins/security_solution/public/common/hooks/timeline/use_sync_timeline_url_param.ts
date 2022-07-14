/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import { useUpdateUrlParam } from '../../utils/global_query_string';
import type { TimelineUrl } from '../../../timelines/store/timeline/model';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineId } from '../../../../common/types';
import { useShallowEqualSelector } from '../use_selector';
import { URL_PARAM_KEY } from '../use_url_state';

export const useSyncTimelineUrlParam = () => {
  const updateUrlParam = useUpdateUrlParam<TimelineUrl>(URL_PARAM_KEY.timeline);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const flyoutTimeline = useShallowEqualSelector((state) => getTimeline(state, TimelineId.active));

  useEffect(() => {
    updateUrlParam(
      flyoutTimeline && flyoutTimeline.savedObjectId != null
        ? {
            id: flyoutTimeline.savedObjectId != null ? flyoutTimeline.savedObjectId : '',
            isOpen: flyoutTimeline.show,
            activeTab: flyoutTimeline.activeTab,
            graphEventId: flyoutTimeline.graphEventId ?? '',
          }
        : null
    );
  }, [flyoutTimeline, updateUrlParam]);
};
