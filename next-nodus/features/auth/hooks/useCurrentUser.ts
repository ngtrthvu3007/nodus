import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/api";
import { CURRENT_USER_KEY } from "../lib/session";

// A 401 is an answer (signed out), not a failure to retry.
export const useCurrentUser = () =>
  useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: ({ signal }) => getCurrentUser(signal),
    retry: false,
  });
