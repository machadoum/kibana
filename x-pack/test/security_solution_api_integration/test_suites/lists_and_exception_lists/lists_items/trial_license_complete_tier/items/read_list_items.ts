/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { LIST_URL, LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { getListItemResponseMockWithoutAutoGeneratedValues } from '@kbn/lists-plugin/common/schemas/response/list_item_schema.mock';
import { getCreateMinimalListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_list_item_schema.mock';
import { getCreateMinimalListSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_list_schema.mock';

import {
  createListsIndex,
  deleteListsIndex,
  removeListItemServerGeneratedProperties,
} from '../../../utils';

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  describe('@ess @serverless read_list_items', () => {
    describe('reading list items', () => {
      beforeEach(async () => {
        await createListsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteListsIndex(supertest, log);
      });

      it('should be able to read a single list item using id', async () => {
        await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        await supertest
          .post(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListItemSchemaMock())
          .expect(200);

        const { body } = await supertest
          .get(`${LIST_ITEM_URL}?id=${getCreateMinimalListItemSchemaMock().id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        const bodyToCompare = removeListItemServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(
          getListItemResponseMockWithoutAutoGeneratedValues(await utils.getUsername())
        );
      });

      it('should be able to read a single list item with an auto-generated list id', async () => {
        await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        const { body: createListBody } = await supertest
          .post(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListItemSchemaMock())
          .expect(200);

        const { body } = await supertest
          .get(`${LIST_ITEM_URL}?id=${createListBody.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        const bodyToCompare = removeListItemServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(
          getListItemResponseMockWithoutAutoGeneratedValues(await utils.getUsername())
        );
      });

      it('should return 404 if given a fake id', async () => {
        await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        const { body } = await supertest
          .get(`${LIST_ITEM_URL}?id=c1e1b359-7ac1-4e96-bc81-c683c092436f`)
          .set('kbn-xsrf', 'true')
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'list item id: "c1e1b359-7ac1-4e96-bc81-c683c092436f" does not exist',
        });
      });
    });
  });
};
