"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/api";
import { CURRENT_USER_KEY } from "../lib/session";

type UseCurrentUserOptions = {
  // "always": fetch again on mount even with cached data, for a screen that must not act on a stale list.
  refetchOnMount?: "always";
};

// A 401 is an answer (signed out), not a failure to retry.
export const useCurrentUser = ({ refetchOnMount }: UseCurrentUserOptions = {}) =>
  useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: ({ signal }) => getCurrentUser(signal),
    retry: false,
    refetchOnMount,
  });
