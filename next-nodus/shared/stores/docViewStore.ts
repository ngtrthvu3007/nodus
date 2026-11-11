import { create } from "zustand";

type DocViewState = {
  // On a phone the doc page shows the editor or the preview, not both. This outlives a single doc, so following a
  // link inside the preview keeps showing the preview of the next doc.
  isPreviewShown: boolean;
  setPreviewShown: (isShown: boolean) => void;
};

export const useDocViewStore = create<DocViewState>((set) => ({
  isPreviewShown: false,
  setPreviewShown: (isPreviewShown) => set({ isPreviewShown }),
}));
