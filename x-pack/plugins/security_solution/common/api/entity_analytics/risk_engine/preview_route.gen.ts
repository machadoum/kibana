/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.
 *
 * info:
 *   title: Risk Scoring API
 *   version: 1.0.0
 */

import {
  AfterKeys,
  DataViewId,
  Filter,
  PageSize,
  IdentifierType,
  DateRange,
  RiskScoreWeights,
  RiskScore,
} from '../common/common.gen';

export type RiskScoresPreviewRequest = z.infer<typeof RiskScoresPreviewRequest>;
export const RiskScoresPreviewRequest = z.object({
  /**
   * Used to retrieve a specific "page" of risk scores. If unspecified, the first "page" of scores is returned. See also the `after_keys` key in a risk scores response.
   */
  after_keys: AfterKeys,
  /**
   * The identifier of the Kibana data view to be used when generating risk scores. If a data view is not found, the provided ID will be used as the query's index pattern instead.
   */
  data_view_id: DataViewId,
  /**
   * If set to `true`, a `debug` key is added to the response, containing both the internal request and response with elasticsearch.
   */
  debug: z.boolean().optional(),
  /**
   * An elasticsearch DSL filter object. Used to filter the data being scored, which implicitly filters the risk scores returned.
   */
  filter: Filter.optional(),
  page_size: PageSize.optional(),
  /**
   * Used to restrict the type of risk scores involved. If unspecified, both `host` and `user` scores will be returned.
   */
  identifier_type: IdentifierType,
  /**
   * Defines the time period over which scores will be evaluated. If unspecified, a range of `[now, now-30d]` will be used.
   */
  range: DateRange.optional(),
  weights: RiskScoreWeights.optional(),
});

export type RiskScoresPreviewResponse = z.infer<typeof RiskScoresPreviewResponse>;
export const RiskScoresPreviewResponse = z.object({
  /**
   * Used to obtain the next "page" of risk scores. See also the `after_keys` key in a risk scores request. If this key is empty, the calculation is complete.
   */
  after_keys: AfterKeys,
  /**
   * Object containing debug information, particularly the internal request and response from elasticsearch
   */
  debug: z
    .object({
      request: z.string().optional(),
      response: z.string().optional(),
    })
    .optional(),
  /**
   * A list of risk scores
   */
  scores: z.array(RiskScore),
});
