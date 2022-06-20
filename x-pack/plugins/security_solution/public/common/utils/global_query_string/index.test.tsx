/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import {
  registerUrlParam,
  updateUrlParam,
  useGlobalQueryString,
  useSyncGlobalQueryString,
} from '.';
import { GlobalUrlParam, globalUrlParamActions } from '../../store/global_url_param';
import { mockHistory } from '../route/mocks';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../mock';
import { createStore } from '../../store';
import { LinkInfo } from '../../links';
import { SecurityPageName } from '../../../app/types';

const mockGetState = jest.fn();
const mockDispatch = jest.fn();
const mockedStore = {
  dispatch: mockDispatch,
  getState: mockGetState,
};
jest.mock('../../store', () => ({
  ...jest.requireActual('../../store'),
  getStore: () => mockedStore,
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => mockHistory,
}));

const defaultLinkInfo: LinkInfo = {
  id: SecurityPageName.alerts,
  path: '/test',
  title: 'test title',
  skipUrlState: false,
};

const mockLinkInfo = jest.fn().mockResolvedValue(defaultLinkInfo);

jest.mock('../../links', () => ({
  ...jest.requireActual('../../links'),
  getLinkInfo: () => mockLinkInfo(),
}));

describe('global query string', () => {
  beforeAll(() => {
    // allow window.location.search to be redefined
    Object.defineProperty(window, 'location', {
      value: {
        search: '?',
      },
    });
  });
  beforeEach(() => {
    jest.clearAllMocks();
    window.location.search = '?';
  });
  describe('registerUrlParam', () => {
    it('returns decoded URL param value', () => {
      const urlParamKey = 'testKey';
      window.location.search = `?testKey=(test:(value:123))`;

      const { state: result } = registerUrlParam({ urlParamKey });

      expect(result).toEqual({ test: { value: 123 } });
    });

    it('returns deregister function', () => {
      const urlParamKey = 'testKey';
      window.location.search = `?testKey=(test:(value:123))`;

      const { deregister } = registerUrlParam({ urlParamKey });
      deregister();

      expect(mockDispatch).toBeCalledWith(
        globalUrlParamActions.deregisterUrlParam({
          key: urlParamKey,
        })
      );
    });

    it('calls registerUrlParam global URL param action', () => {
      const urlParamKey = 'testKey';
      const initialValue = 123;
      window.location.search = `?testKey=${initialValue}`;

      registerUrlParam({ urlParamKey });

      expect(mockDispatch).toBeCalledWith(
        globalUrlParamActions.registerUrlParam({
          key: urlParamKey,
          initialValue: initialValue.toString(),
        })
      );
    });
  });

  describe('updateUrlParam', () => {
    it('dispatch updateUrlParam action', () => {
      const urlParamKey = 'testKey';
      const value = { test: 123 };
      const encodedVaue = '(test:123)';

      mockGetState.mockReturnValue({
        globalUrlParam: {
          [urlParamKey]: 'oldValue',
        },
      });

      updateUrlParam({ urlParamKey, value });

      expect(mockDispatch).toBeCalledWith(
        globalUrlParamActions.updateUrlParam({
          key: urlParamKey,
          value: encodedVaue,
        })
      );
    });

    it('dispatch updateUrlParam action with null value', () => {
      const urlParamKey = 'testKey';

      updateUrlParam({ urlParamKey, value: null });

      expect(mockDispatch).toBeCalledWith(
        globalUrlParamActions.updateUrlParam({
          key: urlParamKey,
          value: null,
        })
      );
    });
  });

  describe('useGlobalQueryString', () => {
    it('returns global query string', () => {
      const { storage } = createSecuritySolutionStorageMock();
      const store = createStore(
        {
          ...mockGlobalState,
          globalUrlParam: {
            testNumber: '123',
            testObject: '(test:321)',
            testNull: null,
            testEmpty: '',
          },
        },
        SUB_PLUGINS_REDUCER,
        kibanaObservable,
        storage
      );
      const wrapper = ({ children }: { children: React.ReactElement }) => (
        <TestProviders store={store}>{children}</TestProviders>
      );

      const { result } = renderHook(() => useGlobalQueryString(), { wrapper });

      expect(result.current).toEqual('testNumber=123&testObject=(test:321)');
    });
  });

  describe('useSyncGlobalQueryString', () => {
    const { storage } = createSecuritySolutionStorageMock();
    const makeStore = (globalUrlParam: GlobalUrlParam) =>
      createStore(
        {
          ...mockGlobalState,
          globalUrlParam,
        },
        SUB_PLUGINS_REDUCER,
        kibanaObservable,
        storage
      );

    const makeWrapper = (globalUrlParam: GlobalUrlParam) => {
      const wrapper = ({ children }: { children: React.ReactElement }) => (
        <TestProviders store={makeStore(globalUrlParam)}>{children}</TestProviders>
      );
      return wrapper;
    };

    it("doesn't delete other URL params when updating one", async () => {
      const urlParamKey = 'testKey';
      const value = '123';
      const globalUrlParam = {
        [urlParamKey]: value,
      };
      window.location.search = `?firstKey=111&${urlParamKey}=oldValue&lastKey=999`;

      renderHook(() => useSyncGlobalQueryString(), { wrapper: makeWrapper(globalUrlParam) });

      expect(mockHistory.replace).toHaveBeenCalledWith({
        search: `firstKey=111&${urlParamKey}=${value}&lastKey=999`,
      });
    });

    it('updates URL params', async () => {
      const urlParamKey1 = 'testKey1';
      const value1 = '1111';
      const urlParamKey2 = 'testKey2';
      const value2 = '2222';
      const globalUrlParam = {
        [urlParamKey1]: value1,
        [urlParamKey2]: value2,
      };
      window.location.search = `?`;

      renderHook(() => useSyncGlobalQueryString(), { wrapper: makeWrapper(globalUrlParam) });

      expect(mockHistory.replace).toHaveBeenCalledWith({
        search: `${urlParamKey1}=${value1}&${urlParamKey2}=${value2}`,
      });
    });

    it('deletes URL param when value is null', async () => {
      const urlParamKey = 'testKey';
      const globalUrlParam = {
        [urlParamKey]: null,
      };
      window.location.search = `?${urlParamKey}=oldValue`;

      renderHook(() => useSyncGlobalQueryString(), { wrapper: makeWrapper(globalUrlParam) });

      expect(mockHistory.replace).toHaveBeenCalledWith({
        search: '',
      });
    });

    it('deletes URL param when page has skipUrlState=true', async () => {
      const urlParamKey = 'testKey';
      const value = 'testValue';
      const globalUrlParam = {
        [urlParamKey]: value,
      };
      window.location.search = `?${urlParamKey}=${value}`;
      mockLinkInfo.mockReturnValue({ ...defaultLinkInfo, skipUrlState: true });

      renderHook(() => useSyncGlobalQueryString(), { wrapper: makeWrapper(globalUrlParam) });

      expect(mockHistory.replace).toHaveBeenCalledWith({
        search: '',
      });
    });

    it('does not replace URL param when the value does not change', async () => {
      const urlParamKey = 'testKey';
      const value = 'testValue';
      const globalUrlParam = {
        [urlParamKey]: value,
      };
      window.location.search = `?${urlParamKey}=${value}`;

      renderHook(() => useSyncGlobalQueryString(), { wrapper: makeWrapper(globalUrlParam) });

      expect(mockHistory.replace).not.toHaveBeenCalledWith();
    });

    it('does not replace URL param when the page doe not exist', async () => {
      const urlParamKey = 'testKey';
      const value = 'testValue';
      const globalUrlParam = {
        [urlParamKey]: value,
      };
      window.location.search = `?${urlParamKey}=oldValue`;
      mockLinkInfo.mockReturnValue(undefined);

      renderHook(() => useSyncGlobalQueryString(), { wrapper: makeWrapper(globalUrlParam) });

      expect(mockHistory.replace).not.toHaveBeenCalledWith();
    });
  });
});
