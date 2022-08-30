/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoreSortField, RiskSeverity } from '../../../common/search_strategy';
import type { SortUsersField } from '../../../common/search_strategy/security_solution/users/common';

export enum UsersType {
  page = 'page',
  details = 'details',
}

export enum UsersTableType {
  allUsers = 'allUsers',
  authentications = 'authentications',
  anomalies = 'anomalies',
  risk = 'userRisk',
  events = 'events',
}

export enum UsersDetailsTableType {
  authentications = 'authentications',
  anomalies = 'anomalies',
  risk = 'userRisk',
  events = 'events',
}

export interface BasicQueryPaginated {
  activePage: number;
  limit: number;
}

export interface AllUsersQuery extends BasicQueryPaginated {
  sort: SortUsersField;
}

export interface UsersRiskScoreQuery extends BasicQueryPaginated {
  sort: RiskScoreSortField;
  severitySelection: RiskSeverity[];
}

export interface UsersAnomaliesQuery {
  jobIdSelection: string[];
}

export interface UsersQueries {
  [UsersTableType.allUsers]: AllUsersQuery;
  [UsersTableType.authentications]: BasicQueryPaginated;
  [UsersTableType.anomalies]: UsersAnomaliesQuery;
  [UsersTableType.risk]: UsersRiskScoreQuery;
  [UsersTableType.events]: BasicQueryPaginated;
}

export interface UserDetailsQueries {
  [UsersTableType.anomalies]: UsersAnomaliesQuery;
  [UsersTableType.events]: BasicQueryPaginated;
}

export interface UsersPageModel {
  queries: UsersQueries;
}

export interface UserDetailsPageModel {
  queries: UserDetailsQueries;
}

export interface UsersModel {
  [UsersType.page]: UsersPageModel;
  [UsersType.details]: UserDetailsPageModel;
}
