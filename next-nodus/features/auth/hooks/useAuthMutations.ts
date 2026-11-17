import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { login, logout, register } from "@/api";
import { PAGE_ROUTES } from "@/shared/constants";
import type { User } from "@/shared/types";
import { CURRENT_USER_KEY } from "../lib/session";

// Drops everything cached for the previous user before showing the new one's workspace.
const useOpenWorkspace = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return (user: User) => {
    queryClient.clear();
    queryClient.setQueryData(CURRENT_USER_KEY, user);
    router.replace(PAGE_ROUTES.home);
  };
};

export const useLogin = () => {
  const openWorkspace = useOpenWorkspace();
  return useMutation({ mutationFn: login, onSuccess: openWorkspace });
};

export const useRegister = () => {
  const openWorkspace = useOpenWorkspace();
  return useMutation({ mutationFn: register, onSuccess: openWorkspace });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      router.replace(PAGE_ROUTES.login);
    },
  });
};
