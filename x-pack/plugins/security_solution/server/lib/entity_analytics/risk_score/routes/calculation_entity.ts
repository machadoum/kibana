/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import { APP_ID, RISK_SCORE_CALCULATION_ENTITY_URL } from '../../../../../common/constants';
import type { AfterKeys } from '../../../../../common/entity_analytics/risk_engine';
import { riskScoreCalculationEntityRequestSchema } from '../../../../../common/entity_analytics/risk_engine/risk_score_calculation_entity/request_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { getRiskInputsIndex } from '../get_risk_inputs_index';
import type { CalculateAndPersistScoresResponse, EntityAnalyticsRoutesDeps } from '../../types';
import { RiskScoreAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
import { convertRangeToISO } from '../tasks/helpers';
import { buildRiskScoreServiceForRequest } from './helpers';
import { getFieldForIdentifier } from '../helpers';

export const riskScoreCalculationEntityRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
      path: RISK_SCORE_CALCULATION_ENTITY_URL,
      access: 'internal',
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: buildRouteValidation(riskScoreCalculationEntityRequestSchema) },
        },
      },
      async (context, request, response) => {
        const securityContext = await context.securitySolution;

        securityContext.getAuditLogger()?.log({
          message: 'User triggered custom manual scoring',
          event: {
            action: RiskScoreAuditActions.RISK_ENGINE_ENTITY_MANUAL_SCORING,
            category: AUDIT_CATEGORY.DATABASE,
            type: AUDIT_TYPE.CHANGE,
            outcome: AUDIT_OUTCOME.UNKNOWN,
          },
        });

        const coreContext = await context.core;
        const securityConfig = await securityContext.getConfig();
        const siemResponse = buildSiemResponse(response);
        const soClient = coreContext.savedObjects.client;

        const riskScoreService = buildRiskScoreServiceForRequest(
          securityContext,
          coreContext,
          logger
        );

        const { identifier_type: identifierType, identifier } = request.body;

        try {
          const entityAnalyticsConfig = await riskScoreService.getConfigurationWithDefaults(
            securityConfig.entityAnalytics
          );

          if (entityAnalyticsConfig == null) {
            return siemResponse.error({
              statusCode: 500,
              body: { message: 'No Risk engine configuration found.' },
              bypassErrorFormat: true,
            });
          }

          const {
            dataViewId,
            enabled,
            // filter, // TODO merge with filter for entity
            range: configuredRange,
            pageSize,
            alertSampleSizePerShard,
          } = entityAnalyticsConfig;

          if (!enabled) {
            return siemResponse.error({
              statusCode: 412,
              body: { message: 'Risk engine is disabled.' },
              bypassErrorFormat: true,
            });
          }

          const { index, runtimeMappings } = await getRiskInputsIndex({
            dataViewId,
            logger,
            soClient,
          });

          // TODO delete me
          const testRange = {
            start: 'Jan 26, 2024 @ 00:00:00.000',
            end: 'Apr 25, 2024 @ 10:57:53.511',
          };
          // const range = convertRangeToISO(configuredRange);

          const range = convertRangeToISO(testRange);
          const afterKeys: AfterKeys = {};

          const result: CalculateAndPersistScoresResponse =
            await riskScoreService.calculateAndPersistScores({
              pageSize,
              identifierType,
              index,
              filter: { term: { [getFieldForIdentifier(identifierType)]: identifier } },
              range,
              runtimeMappings,
              weights: [],
              alertSampleSizePerShard,
              afterKeys,
              returnScores: true,
            });

          if (result.errors.length) {
            return siemResponse.error({
              statusCode: 500,
              body: {
                message: 'Error calculating the risk score for an entity',
                full_error: JSON.stringify(result.errors),
              },
              bypassErrorFormat: true,
            });
          }

          const score =
            result.scores_written === 1 ? result.scores?.[identifierType]?.[0] : undefined;

          return response.ok({
            body: {
              success: true,
              score,
            },
          });
        } catch (e) {
          const error = transformError(e);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: { message: error.message, full_error: JSON.stringify(e) },
            bypassErrorFormat: true,
          });
        }
      }
    );
};

// KIBANA_URL="http://localhost:5601/mtj"

// curl "$KIBANA_URL/api/risk_scores/calculation/entity" \
//   -H 'kbn-xsrf:hello' \
//   --user elastic:changeme \
//   -X 'POST' \
//   -H 'elastic-api-version: 1' \
//   -H "Content-Type: application/json" \
//   -d '{"identifier_type": "host", "identifier": "Host-spotless-tamale.name"}'
