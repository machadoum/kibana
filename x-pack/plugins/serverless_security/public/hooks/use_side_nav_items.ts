/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { partition } from 'lodash/fp';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import type { SolutionSideNavItem } from '@kbn/security-solution-side-nav';
import { NavigationLink } from '@kbn/security-solution-plugin/public/common/links';
import { useKibana } from '../services';
import { GetLinkProps, useGetLinkProps } from './use_link_props';
import { useNavTreeStructure } from './use_nav_tree_structure';
import { useFindNavLink } from './use_nav_links';

const isFooterNavItem = (id: string) =>
  id === SecurityPageName.landing || id === SecurityPageName.administration;

const isGetStartedNavItem = (id: string) => id === SecurityPageName.landing;

// DFS for the sideNavItem matching the current `pathname`, returns all item hierarchy when found
const findItemsByPath = (
  sideNavItems: SolutionSideNavItem[],
  pathname: string
): SolutionSideNavItem[] => {
  for (const sideNavItem of sideNavItems) {
    if (sideNavItem.items?.length) {
      const found = findItemsByPath(sideNavItem.items, pathname);
      if (found.length) {
        found.unshift(sideNavItem);
        return found;
      }
    }
    if (matchPath(pathname, { path: sideNavItem.href })) {
      return [sideNavItem];
    }
  }
  return [];
};

/**
 * Returns all the formatted SideNavItems, including external links
 */
export const useSideNavItems = (): SolutionSideNavItem[] => {
  const { getUrlForApp } = useKibana().services.application;

  const navTreeStructure = useNavTreeStructure();
  const getLinkProps = useGetLinkProps();
  const findNavLink = useFindNavLink();

  const securitySideNavItems = useMemo(
    () =>
      navTreeStructure.reduce<SolutionSideNavItem[]>((items, { id, appId, links, label }) => {
        const navLink = id ? findNavLink(id) : undefined;

        if (appId) {
          items.push({
            id: appId,
            label,
            ...getLinkProps({ appId }),
          });
          return items;
        }

        if (!navLink || navLink.disabled) {
          return items;
        }
        if (isGetStartedNavItem(navLink.id)) {
          items.push({
            id: navLink.id,
            label: navLink.title.toUpperCase(),
            ...getLinkProps({ deepLinkId: navLink.id }),
            labelSize: 'xs',
            iconType: 'launch',
            appendSeparator: true,
          });
        } else {
          items.push({
            id: navLink.id,
            label: navLink.title,
            ...getLinkProps({ deepLinkId: navLink.id }),
            ...(navLink.categories?.length && { categories: navLink.categories }),

            // Overwrites navLinks definition with customized subLinks
            ...(links?.length && {
              items: links.reduce<SolutionSideNavItem[]>((acc, child) => {
                const navLinkChild = child.id ? findNavLink(child.id) : undefined;

                if (navLinkChild && !navLinkChild.disabled) {
                  acc.push(navLink2SolutionSideNavItem(navLinkChild, getLinkProps));
                }
                return acc;
              }, []),
            }),

            ...(!links && {
              items: navLink.links
                ? navLink.links.reduce<SolutionSideNavItem[]>((acc, navLinkChild) => {
                    if (navLinkChild && !navLinkChild.disabled) {
                      acc.push(navLink2SolutionSideNavItem(navLinkChild, getLinkProps));
                    }
                    return acc;
                  }, [])
                : undefined,
            }),
          });
        }
        return items;
      }, []),
    [findNavLink, getLinkProps, navTreeStructure]
  );

  return securitySideNavItems;
};

const navLink2SolutionSideNavItem = (
  navLink: NavigationLink,
  getLinkProps: GetLinkProps
): SolutionSideNavItem => ({
  id: navLink.id,
  label: navLink.title,
  description: navLink.description,
  isBeta: navLink.isBeta,
  betaOptions: navLink.betaOptions,
  ...getLinkProps({ deepLinkId: navLink.id }),
});

/**
 * Partitions the sideNavItems into main and footer SideNavItems
 * @param sideNavItems array for all SideNavItems
 * @returns `[items, footerItems]` to be used in the side navigation component
 */
export const usePartitionFooterNavItems = (
  sideNavItems: SolutionSideNavItem[]
): [SolutionSideNavItem[], SolutionSideNavItem[]] =>
  useMemo(() => partition((item) => !isFooterNavItem(item.id), sideNavItems), [sideNavItems]);

/**
 * Returns the selected item id, which is the root item in the links hierarchy
 */
export const useSideNavSelectedId = (sideNavItems: SolutionSideNavItem[]): string => {
  const { http } = useKibana().services;
  const { pathname } = useLocation();

  const selectedId: string = useMemo(() => {
    const [rootNavItem] = findItemsByPath(sideNavItems, http.basePath.prepend(pathname));
    return rootNavItem?.id ?? '';
  }, [sideNavItems, pathname, http]);

  return selectedId;
};
