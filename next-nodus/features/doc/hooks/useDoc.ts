import { useQuery } from "@tanstack/react-query";
import { getDoc } from "@/api";
import { NODE_KIND } from "@/shared/constants";

export const useDoc = (id: string) =>
  useQuery({
    queryKey: [NODE_KIND.doc, id],
    queryFn: ({ signal }) => getDoc(id, signal),
  });
