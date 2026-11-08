import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateFolder } from "@/api";
import { NODE_KIND } from "@/shared/constants";
import type { UpdateFolderRequest } from "@/shared/types";

export const useUpdateFolder = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateFolderRequest) => updateFolder(id, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [NODE_KIND.folder, id] }),
  });
};
