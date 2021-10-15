/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import styled from 'styled-components';

import { useDispatch } from 'react-redux';
import { IndexPattern, IndexPatternField } from '../../../../../../../src/plugins/data/public';
import { useKibana } from '../../../common/lib/kibana';

import * as i18n from './translations';
import { CreateFieldComponentType, TimelineId } from '../../../../../timelines/common';
import { tGridActions } from '../../../../../timelines/public';
import { useIndexFields } from '../../../common/containers/source';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { sourcererSelectors } from '../../../common/store';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { SelectedDataView } from '../../../common/store/sourcerer/selectors';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../timeline/body/constants';
import { defaultColumnHeaderType } from '../timeline/body/column_headers/default_headers';

interface CreateFieldButtonProps {
  selectedDataViewId: string;
  onClick: () => void;
  timelineId: TimelineId;
  sourcererScope: SourcererScopeName;
}
const StyledButton = styled(EuiButton)`
  margin-left: ${({ theme }) => theme.eui.paddingSizes.m};
`;

export const CreateFieldButton = React.memo<CreateFieldButtonProps>(
  ({ selectedDataViewId, onClick: onClickParam, sourcererScope, timelineId }) => {
    const [dataView, setDataView] = useState<IndexPattern | null>(null);
    const dispatch = useDispatch();

    const { indexFieldsSearch } = useIndexFields(sourcererScope, false);
    const {
      indexPatternFieldEditor,
      data: { dataViews },
    } = useKibana().services;

    useEffect(() => {
      dataViews.get(selectedDataViewId).then((dataViewResponse) => {
        setDataView(dataViewResponse);
      });
    }, [selectedDataViewId, dataViews]);

    const onClick = useCallback(() => {
      if (dataView) {
        indexPatternFieldEditor?.openEditor({
          ctx: { indexPattern: dataView },
          onSave: (field: IndexPatternField) => {
            // Fetch the updated list of fields
            indexFieldsSearch(selectedDataViewId);

            // Add the new field to the event table
            dispatch(
              tGridActions.upsertColumn({
                column: {
                  columnHeaderType: defaultColumnHeaderType,
                  id: field.name,
                  initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
                },
                id: timelineId,
                index: 0,
              })
            );
          },
        });
      }
      onClickParam();
    }, [
      indexPatternFieldEditor,
      dataView,
      onClickParam,
      indexFieldsSearch,
      selectedDataViewId,
      dispatch,
      timelineId,
    ]);

    if (!indexPatternFieldEditor?.userPermissions.editIndexPattern()) {
      return null;
    }

    return (
      <>
        <StyledButton
          iconType={dataView ? 'plusInCircle' : 'none'}
          aria-label={i18n.CREATE_FIELD}
          data-test-subj="create-field"
          onClick={onClick}
          isLoading={!dataView}
        >
          {i18n.CREATE_FIELD}
        </StyledButton>
      </>
    );
  }
);

CreateFieldButton.displayName = 'CreateFieldButton';

/**
 *
 * Returns a memoised 'CreateFieldButton' with only an 'onClick' property.
 */
export const useCreateFieldButton = (
  sourcererScope: SourcererScopeName,
  timelineId: TimelineId
) => {
  const getSelectedDataView = useMemo(() => sourcererSelectors.getSelectedDataViewSelector(), []);
  const { dataViewId } = useDeepEqualSelector<SelectedDataView>((state) =>
    getSelectedDataView(state, sourcererScope)
  );

  const createFieldComponent = useMemo(() => {
    // It receives onClick props from field browser in order to close the modal.
    const CreateFieldButtonComponent: CreateFieldComponentType = ({ onClick }) => (
      <CreateFieldButton
        selectedDataViewId={dataViewId}
        onClick={onClick}
        sourcererScope={sourcererScope}
        timelineId={timelineId}
      />
    );

    return CreateFieldButtonComponent;
  }, [dataViewId, sourcererScope, timelineId]);

  return createFieldComponent;
};
