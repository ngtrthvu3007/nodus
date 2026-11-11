import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useTree, useTreeModel } from "@/features/tree";
import { PAGE_ROUTES } from "@/shared/constants";
import { useTabsStore } from "@/shared/stores";

// Keeps the open tabs in step with the URL and the tree, and gives the tab bar what it shows.
export const useTabs = () => {
  const router = useRouter();
  const { id: routeId } = useParams<{ id?: string }>(); // doc and folder pages both name the segment `id`
  const { data } = useTree();
  const { nodesById } = useTreeModel(data);
  const { tabIds, activeId, activateTab, closeTabs } = useTabsStore();

  // The page of a tab, or home when there is no tab (any more).
  const getHref = useCallback(
    (id: string | undefined) => {
      const node = id === undefined ? undefined : nodesById.get(id);
      return node ? PAGE_ROUTES.node(node.kind, node.id) : PAGE_ROUTES.home;
    },
    [nodesById],
  );

  // Closes the tabs and shows the one that became active, or home when none is left.
  const closeAndShow = useCallback(
    (ids: string[]) => router.replace(getHref(closeTabs(ids))),
    [router, getHref, closeTabs],
  );

  useEffect(() => {
    useTabsStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!data) return;

    const deletedIds = useTabsStore.getState().tabIds.filter((id) => !nodesById.has(id));
    // Leave the page only when the doc being shown lost its tab; another URL (a link to a deleted doc) keeps its 404.
    const isShownTabDeleted = routeId !== undefined && deletedIds.includes(routeId);

    if (isShownTabDeleted) closeAndShow(deletedIds);
    else if (deletedIds.length) closeTabs(deletedIds);

    // A doc that is not in the tree yet (just created) opens once the tree has it.
    if (!routeId || nodesById.has(routeId)) activateTab(routeId);
  }, [data, nodesById, routeId, closeAndShow, activateTab, closeTabs]);

  const tabNodes = tabIds.map((id) => nodesById.get(id)).filter((node) => node !== undefined);

  const close = (id: string) => {
    if (id === activeId) closeAndShow([id]);
    else closeTabs([id]);
  };

  return {
    tabNodes,
    activeId,
    select: (id: string) => router.push(getHref(id)),
    close,
  };
};
