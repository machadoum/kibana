/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { ReactNode, useState } from 'react';
import {
  TableListViewTable,
  type TableListViewTableProps,
  type UserContentCommonSchema,
} from '@kbn/content-management-table-list-view-table';
import { EuiPaddingSize } from '@elastic/eui';
import { SavedObjectsReference } from '@kbn/content-management-content-editor/src/services';

export type TableListViewProps<T extends UserContentCommonSchema = UserContentCommonSchema> = Pick<
  TableListViewTableProps<T>,
  | 'entityName'
  | 'entityNamePlural'
  | 'initialFilter'
  | 'headingId'
  | 'initialPageSize'
  | 'listingLimit'
  | 'urlStateEnabled'
  | 'customTableColumn'
  | 'emptyPrompt'
  | 'findItems'
  | 'createItem'
  | 'editItem'
  | 'deleteItems'
  | 'getDetailViewLink'
  | 'onClickTitle'
  | 'id'
  | 'rowItemActions'
  | 'contentEditor'
  | 'titleColumnName'
  | 'withoutPageTemplateWrapper'
  | 'showEditActionForItem'
> & {
  title: string;
  description?: string;
  /**
   * Additional actions (buttons) to be placed in the page header.
   * @note only the first two values will be used.
   */
  additionalRightSideActions?: ReactNode[];
  children?: ReactNode | undefined;
  tagReferences?: SavedObjectsReference[] | undefined;
  withPageTemplateHeader?: boolean;
  restrictPageSectionWidth?: boolean;
  pageSectionPadding?: EuiPaddingSize;
};

export const TableListView = <T extends UserContentCommonSchema>({
  title,
  description,
  entityName,
  entityNamePlural,
  initialFilter,
  headingId,
  initialPageSize,
  listingLimit,
  urlStateEnabled = true,
  customTableColumn,
  emptyPrompt,
  findItems,
  createItem,
  editItem,
  deleteItems,
  getDetailViewLink,
  onClickTitle,
  rowItemActions,
  id: listingId,
  contentEditor,
  children,
  titleColumnName,
  additionalRightSideActions,
  withoutPageTemplateWrapper,
  tagReferences,
  withPageTemplateHeader,
  restrictPageSectionWidth,
  pageSectionPadding,
}: TableListViewProps<T>) => {
  const PageTemplate = withoutPageTemplateWrapper
    ? (React.Fragment as unknown as typeof KibanaPageTemplate)
    : KibanaPageTemplate;

  const [hasInitialFetchReturned, setHasInitialFetchReturned] = useState(false);
  const [pageDataTestSubject, setPageDataTestSubject] = useState<string>();

  return (
    <PageTemplate panelled data-test-subj={pageDataTestSubject}>
      {withPageTemplateHeader && (
        <KibanaPageTemplate.Header
          pageTitle={<span id={headingId}>{title}</span>}
          description={description}
          rightSideItems={additionalRightSideActions?.slice(0, 2)}
          data-test-subj="top-nav"
        />
      )}
      <KibanaPageTemplate.Section
        aria-labelledby={hasInitialFetchReturned ? headingId : undefined}
        restrictWidth={restrictPageSectionWidth}
        paddingSize={pageSectionPadding}
      >
        {/* Any children passed to the component */}
        {children}

        <TableListViewTable
          tableCaption={title}
          entityName={entityName}
          entityNamePlural={entityNamePlural}
          initialFilter={initialFilter}
          headingId={headingId}
          initialPageSize={initialPageSize}
          listingLimit={listingLimit}
          urlStateEnabled={urlStateEnabled}
          customTableColumn={customTableColumn}
          emptyPrompt={emptyPrompt}
          findItems={findItems}
          createItem={createItem}
          editItem={editItem}
          deleteItems={deleteItems}
          rowItemActions={rowItemActions}
          getDetailViewLink={getDetailViewLink}
          onClickTitle={onClickTitle}
          id={listingId}
          contentEditor={contentEditor}
          titleColumnName={titleColumnName}
          withoutPageTemplateWrapper={withoutPageTemplateWrapper}
          onFetchSuccess={() => {
            if (!hasInitialFetchReturned) {
              setHasInitialFetchReturned(true);
            }
          }}
          setPageDataTestSubject={setPageDataTestSubject}
          tagReferences={tagReferences}
        />
      </KibanaPageTemplate.Section>
    </PageTemplate>
  );
};

// eslint-disable-next-line import/no-default-export
export default TableListView;
