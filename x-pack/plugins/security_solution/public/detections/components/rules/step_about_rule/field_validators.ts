/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidationFunc, ERROR_CODE, ValidationError } from '../../../../shared_imports';

export const emptyArrayItem = (message: string) => (
  ...[{ value }]: Parameters<ValidationFunc>
): ValidationError<ERROR_CODE> | void | undefined => {
  if (typeof value !== 'string') {
    return;
  }

  return value.trim() === ''
    ? {
        code: 'ERR_INVALID_CHARS',
        message,
      }
    : undefined;
};
