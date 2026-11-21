import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { useTree, useTreeModel } from "@/features/tree";
import { PAGE_ROUTES } from "@/shared/constants";
import { useTabsStore } from "@/shared/stores";
import { useTabShortcuts } from "./useTabShortcuts";

// Keeps the open tabs in step with the URL and the tree, and gives the tab bar what it shows.
export const useTabs = () => {
  const router = useRouter();
  const { id: routeId } = useParams<{ id?: string }>(); // doc and folder pages both name the segment `id`
  // The doc this page showed the last time the tree arrived, to tell a doc deleted now from one deleted before.
  const shownIdRef = useRef<string | undefined>(undefined);
  const routeIdRef = useRef(routeId);
  useEffect(() => {
    routeIdRef.current = routeId;
  }, [routeId]);
  const { data } = useTree();
  const { nodesById } = useTreeModel(data);
  const { tabIds, activeId, activateTab, closeTabs, moveTab } = useTabsStore();

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

    // Another browser tab changed the list: take it, and keep the doc shown here open.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== useTabsStore.persist.getOptions().name) return;
      useTabsStore.persist.rehydrate();
      if (routeIdRef.current) useTabsStore.getState().activateTab(routeIdRef.current);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!data) return;

    const deletedIds = useTabsStore.getState().tabIds.filter((id) => !nodesById.has(id));
    // Leave the page only when the doc shown here was deleted while it was open; a URL that is already deleted when
    // the page loads (a link, or a tab saved earlier) keeps its 404.
    const isShownDocDeleted = routeId !== undefined && shownIdRef.current === routeId && deletedIds.includes(routeId);
    shownIdRef.current = routeId !== undefined && nodesById.has(routeId) ? routeId : undefined;

    if (isShownDocDeleted) closeAndShow(deletedIds);
    else if (deletedIds.length) closeTabs(deletedIds);

    // A doc that is not in the tree yet (just created) opens once the tree has it.
    if (!routeId || nodesById.has(routeId)) activateTab(routeId);
  }, [data, nodesById, routeId, closeAndShow, activateTab, closeTabs]);

  const tabNodes = tabIds.map((id) => nodesById.get(id)).filter((node) => node !== undefined);

  const close = (id: string) => {
    if (id === activeId) closeAndShow([id]);
    else closeTabs([id]);
  };

  const select = (id: string) => router.push(getHref(id));

  useTabShortcuts({ tabIds: tabNodes.map(({ id }) => id), activeId, select, close, move: moveTab });

  return { tabNodes, activeId, select, close, move: moveTab };
};
