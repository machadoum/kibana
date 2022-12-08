/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';

export const YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS = (fieldName: string) =>
  i18n.translate('securitysolutionCellActions.youAreInADialogContainingOptionsScreenReaderOnly', {
    values: { fieldName },
    defaultMessage: `You are in a dialog, containing options for field {fieldName}. Press tab to navigate options. Press escape to exit.`,
  });
