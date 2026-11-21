import { useQuery } from "@tanstack/react-query";
import { getFolder } from "@/api";
import { NODE_KIND } from "@/shared/constants";

export const useFolder = (id: string) =>
  useQuery({
    queryKey: [NODE_KIND.folder, id],
    queryFn: ({ signal }) => getFolder(id, signal),
  });
