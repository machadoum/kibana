/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidationFuncArg } from 'src/plugins/es_ui_shared/static/forms/hook_form_lib';

import { emptyArrayItem } from './field_validators';

describe('emptyArrayItem', () => {
  const MESSAGE = 'error message';
  const defaultArgs: ValidationFuncArg<FormData, unknown> = {
    path: '',
    form: {
      getFormData: jest.fn(),
      getFields: jest.fn(),
    },
    formData: {} as FormData,
    errors: [],
    value: undefined,
  };

  test('should return an error when value is an empty string', () => {
    expect(emptyArrayItem(MESSAGE)({ ...defaultArgs, value: '    ' })).toEqual({
      code: 'ERR_INVALID_CHARS',
      message: MESSAGE,
    });
  });
  test('should return undefined when value is not a string', () => {
    expect(emptyArrayItem(MESSAGE)({ ...defaultArgs, value: 9999 })).toBe(undefined);
  });
  test('should return undefined when value is not an empty string', () => {
    expect(emptyArrayItem(MESSAGE)({ ...defaultArgs, value: 'non-empty string' })).toBe(undefined);
  });
});
