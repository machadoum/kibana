/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { act, renderHook } from '@testing-library/react-hooks';

import { useDashboardListingTable } from './use_dashboard_listing_table';
import { pluginServices } from '../../services/plugin_services';
import { confirmCreateWithUnsaved } from '../confirm_overlays';
const clearStateMock = jest.fn();
const getDashboardUrl = jest.fn();
const goToDashboard = jest.fn();
const deleteDashboards = jest.fn().mockResolvedValue(true);

jest.mock('@kbn/ebt-tools', () => ({
  reportPerformanceMetricEvent: jest.fn(),
}));

jest.mock('../confirm_overlays', () => ({
  confirmCreateWithUnsaved: jest.fn().mockImplementation((fn) => fn()),
}));

jest.mock('../_dashboard_listing_strings', () => ({
  dashboardListingTableStrings: {
    getEntityName: jest.fn().mockReturnValue('Dashboard'),
    getTableListTitle: jest.fn().mockReturnValue('Dashboard List'),
    getEntityNamePlural: jest.fn().mockReturnValue('Dashboards'),
  },
}));

jest.mock('../../services/plugin_services', () => ({
  pluginServices: {
    getServices: jest.fn(),
  },
}));

const mockGetServices = {
  analytics: 'analytics',
  dashboardSessionStorage: {
    dashboardHasUnsavedEdits: jest.fn().mockReturnValue(true),
    getDashboardIdsWithUnsavedChanges: jest.fn().mockReturnValue([]),
    clearState: clearStateMock,
  },
  dashboardCapabilities: {
    showWriteControls: true,
  },
  dashboardContentManagement: {
    findDashboards: jest.fn(),
    deleteDashboards,
  },
  settings: {
    uiSettings: {
      get: jest.fn().mockImplementation((key) => {
        if (key === 'savedObjects:listingLimit') {
          return 20;
        }
        if (key === 'savedObjects:perPage') {
          return 5;
        }
        return null;
      }),
    },
  },
  notifications: {
    toasts: {
      addError: jest.fn(),
    },
  },
};

describe('useDashboardListingTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (pluginServices.getServices as jest.Mock).mockReturnValue(mockGetServices);
  });

  test('should return the correct initial hasInitialFetchReturned state', () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    expect(result.current.hasInitialFetchReturned).toBe(false);
  });

  test('should return the correct initial pageDataTestSubject state', () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    expect(result.current.pageDataTestSubject).toBeUndefined();
  });

  test('should return the correct refreshUnsavedDashboards function', () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    expect(typeof result.current.refreshUnsavedDashboards).toBe('function');
  });

  test('should return the correct initial unsavedDashboardIds state', () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    expect(result.current.unsavedDashboardIds).toEqual([]);
  });

  test('should return the correct tableListViewTableProps', () => {
    const initialFilter = 'myFilter';
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
        initialFilter,
        urlStateEnabled: false,
      })
    );

    const tableListViewTableProps = result.current.tableListViewTableProps;

    const expectedProps = {
      createItem: expect.any(Function),
      deleteItems: expect.any(Function),
      editItem: expect.any(Function),
      emptyPrompt: expect.any(Object),
      entityName: 'Dashboard',
      entityNamePlural: 'Dashboards',
      findItems: expect.any(Function),
      getDetailViewLink: expect.any(Function),
      headingId: 'dashboardListingHeading',
      id: expect.any(String),
      initialFilter: 'myFilter',
      initialPageSize: 5,
      listingLimit: 20,
      onFetchSuccess: expect.any(Function),
      setPageDataTestSubject: expect.any(Function),
      title: 'Dashboard List',
      urlStateEnabled: false,
    };

    expect(tableListViewTableProps).toEqual(expectedProps);
  });

  test('should call deleteDashboards when deleteItems is called', () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    act(() => {
      result.current.tableListViewTableProps.deleteItems?.([{ id: 'test-id' }]);
    });

    expect(deleteDashboards).toHaveBeenCalled();
  });

  test('should call goToDashboard when editItem is called', () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    act(() => {
      result.current.tableListViewTableProps.editItem?.({ id: 'test-id' });
    });

    expect(goToDashboard).toHaveBeenCalled();
  });

  test('should call goToDashboard when createItem is called without unsaved changes', () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    act(() => {
      result.current.tableListViewTableProps.createItem?.();
    });

    expect(goToDashboard).toHaveBeenCalled();
  });

  test('should call confirmCreateWithUnsaved and clear state when createItem is called with unsaved changes', () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
        useSessionStorageIntegration: true,
      })
    );

    act(() => {
      result.current.tableListViewTableProps.createItem?.();
    });

    expect(confirmCreateWithUnsaved).toHaveBeenCalled();
    expect(clearStateMock).toHaveBeenCalled();
    expect(goToDashboard).toHaveBeenCalled();
  });

  test('createItem should be undefined when showWriteControls equals false', () => {
    (pluginServices.getServices as jest.Mock).mockReturnValue({
      ...mockGetServices,
      dashboardCapabilities: {
        showWriteControls: false,
      },
    });
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    expect(result.current.tableListViewTableProps.createItem).toBeUndefined();
  });

  test('deleteItems should be undefined when showWriteControls equals false', () => {
    (pluginServices.getServices as jest.Mock).mockReturnValue({
      ...mockGetServices,
      dashboardCapabilities: {
        showWriteControls: false,
      },
    });
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    expect(result.current.tableListViewTableProps.deleteItems).toBeUndefined();
  });

  test('editItem should be undefined when showWriteControls equals false', () => {
    (pluginServices.getServices as jest.Mock).mockReturnValue({
      ...mockGetServices,
      dashboardCapabilities: {
        showWriteControls: false,
      },
    });
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    expect(result.current.tableListViewTableProps.editItem).toBeUndefined();
  });
});
