/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AuthenticationsUserTable } from '../../../common/components/authentication/authentications_user_table';
import { AuthenticationsUserTableProps } from '../../../common/components/authentication/types';

export const ID = 'usersAuthenticationsQuery';

export const AuthenticationsQueryTabBody = ({
  endDate,
  filterQuery,
  indexNames,
  skip,
  setQuery,
  startDate,
  type,
  docValueFields,
  deleteQuery,
  userName,
}: AuthenticationsUserTableProps) => {
  return (
    <AuthenticationsUserTable
      endDate={endDate}
      filterQuery={filterQuery}
      indexNames={indexNames}
      setQuery={setQuery}
      deleteQuery={deleteQuery}
      startDate={startDate}
      type={type}
      skip={skip}
      docValueFields={docValueFields}
      userName={userName}
    />
  );
};

AuthenticationsQueryTabBody.displayName = 'AllUsersQueryTabBody';
