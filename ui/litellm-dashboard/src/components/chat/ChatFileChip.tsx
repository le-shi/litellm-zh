import { FileText } from "lucide-react";
import type { ChatFileAttachment } from "./types";

export default function ChatFileChip({ file }: { file: ChatFileAttachment }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted px-3 py-2 text-sm">
      <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {file.url ? "附件" : "文件不可用，请新建对话并重新添加附件"}
        </p>
      </div>
    </div>
  );
}
