import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createToken, getTokens, revokeToken } from "@/api";

const TOKENS_KEY = ["tokens"];

export const useTokens = () => useQuery({ queryKey: TOKENS_KEY, queryFn: ({ signal }) => getTokens(signal) });

const useRefreshTokens = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: TOKENS_KEY });
};

export const useCreateToken = () => {
  const refreshTokens = useRefreshTokens();
  return useMutation({ mutationFn: createToken, onSuccess: refreshTokens });
};

export const useRevokeToken = () => {
  const refreshTokens = useRefreshTokens();
  return useMutation({ mutationFn: revokeToken, onSuccess: refreshTokens });
};
