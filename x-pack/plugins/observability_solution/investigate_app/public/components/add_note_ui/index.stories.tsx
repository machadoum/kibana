/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryObj } from '@storybook/react';
import moment from 'moment';
import React from 'react';
import { AddNoteUI as Component } from '.';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';

interface Args {
  props: React.ComponentProps<typeof Component>;
}

type StoryMeta = Meta<Args>;
type Story = StoryObj<Args>;

const meta: StoryMeta = {
  component: Component,
  title: 'app/Molecules/AddWidgetUI',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

const defaultStory: Story = {
  args: {
    props: {
      onWidgetAdd: async () => {},
      user: {
        username: 'johndoe',
        full_name: 'John Doe',
      },
      filters: [],
      timeRange: {
        from: moment().subtract(15, 'minutes').toISOString(),
        to: moment().toISOString(),
      },
    },
  },
  render: function Render(args) {
    return <Component {...args.props} />;
  },
};

export const InvestigateSearchBarStory: Story = {
  ...defaultStory,
  args: {
    ...defaultStory.args,
  },
  name: 'default',
};
