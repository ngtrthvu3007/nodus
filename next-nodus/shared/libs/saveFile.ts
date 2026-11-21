import type { DownloadedFile } from "./httpClient";

// Hands a downloaded file to the browser's download, as if a link to it had been clicked.
export const saveFile = ({ blob, fileName }: DownloadedFile) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
};
