/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { CellActionExecutionContext } from '.';
import { makeAction } from '../mocks/helpers';
import { HoverActionsPopover } from './hover_actions_popover';

describe('HoverActionsPopover', () => {
  const TestComponent = () => <span data-test-subj="test-component" />;
  jest.useFakeTimers();

  it('renders', () => {
    const getActions = () => Promise.resolve([]);
    const { queryByTestId } = render(
      <HoverActionsPopover
        children={null}
        getActions={getActions}
        showMoreActionsFrom={4}
        actionContext={{} as CellActionExecutionContext}
        showTooltip={false}
      />
    );
    expect(queryByTestId('hoverActionsPopover')).toBeInTheDocument();
  });

  it('renders actions when hovered', async () => {
    const action = makeAction('test-action');
    const getActionsPromise = Promise.resolve([action]);
    const getActions = () => getActionsPromise;

    const { queryByLabelText, getByTestId } = render(
      <HoverActionsPopover
        getActions={getActions}
        showMoreActionsFrom={4}
        actionContext={{} as CellActionExecutionContext}
        showTooltip={false}
      >
        <TestComponent />
      </HoverActionsPopover>
    );

    await hoverElement(getByTestId('test-component'), async () => {
      await getActionsPromise;
      jest.runAllTimers();
    });

    expect(queryByLabelText('test-action')).toBeInTheDocument();
  });

  it('hide actions when mouse stops hovering', async () => {
    const action = makeAction('test-action');
    const getActionsPromise = Promise.resolve([action]);
    const getActions = () => getActionsPromise;

    const { queryByLabelText, getByTestId } = render(
      <HoverActionsPopover
        getActions={getActions}
        showMoreActionsFrom={4}
        actionContext={{} as CellActionExecutionContext}
        showTooltip={false}
      >
        <TestComponent />
      </HoverActionsPopover>
    );

    await hoverElement(getByTestId('test-component'), async () => {
      await getActionsPromise;
      jest.runAllTimers();
    });

    // Mouse leaves hover state
    await act(async () => {
      fireEvent.mouseLeave(getByTestId('test-component'));
    });

    expect(queryByLabelText('test-action')).not.toBeInTheDocument();
  });

  it('renders extra actions button', async () => {
    const actions = [makeAction('test-action-1'), makeAction('test-action-2')];
    const getActionsPromise = Promise.resolve(actions);
    const getActions = () => getActionsPromise;

    const { getByTestId } = render(
      <HoverActionsPopover
        getActions={getActions}
        showMoreActionsFrom={1}
        actionContext={{} as CellActionExecutionContext}
        showTooltip={false}
      >
        <TestComponent />
      </HoverActionsPopover>
    );

    await hoverElement(getByTestId('test-component'), async () => {
      await getActionsPromise;
      jest.runAllTimers();
    });

    expect(getByTestId('showExtraActionsButton')).toBeInTheDocument();
  });

  it('shows extra actions when extra actions button is clicked', async () => {
    const actions = [makeAction('test-action-1'), makeAction('test-action-2')];
    const getActionsPromise = Promise.resolve(actions);
    const getActions = () => getActionsPromise;

    const { getByTestId, getByLabelText } = render(
      <HoverActionsPopover
        getActions={getActions}
        showMoreActionsFrom={1}
        actionContext={{} as CellActionExecutionContext}
        showTooltip={false}
      >
        <TestComponent />
      </HoverActionsPopover>
    );

    await hoverElement(getByTestId('test-component'), async () => {
      await getActionsPromise;
      jest.runAllTimers();
    });

    act(() => {
      fireEvent.click(getByTestId('showExtraActionsButton'));
    });

    expect(getByLabelText('test-action-2')).toBeInTheDocument();
  });
});

const hoverElement = async (element: Element, waitForChange: () => Promise<unknown>) => {
  await act(async () => {
    fireEvent.mouseEnter(element);
    await waitForChange();
  });
};
