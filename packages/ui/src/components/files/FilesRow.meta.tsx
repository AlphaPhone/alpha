import { Download, FileText } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import type { FilesRowProps } from "./FilesRow.tsx";

export const meta: ComponentMeta<FilesRowProps> = {
  args: { name: "Downloads", icon: <Download />, count: 4 },
  examples: {
    File: { name: "lease.pdf", detail: "PDF · 2 KB", icon: <FileText /> },
    Chosen: { name: "lease.pdf", detail: "PDF · 2 KB", icon: <FileText />, chosen: true },
    Tile: { name: "lease.pdf", icon: <FileText />, layout: "tile" },
  },
};
