import CopyButton from "@/components/shared/CopyButton";
import { buildCurlCommand, type CurlCommandInput } from "./lib/curlCommand";

interface CurlPreviewProps extends CurlCommandInput {
  errorCount?: number;
}

export default function CurlPreview({ errorCount = 0, ...input }: CurlPreviewProps) {
  const command = buildCurlCommand(input);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2 text-sm">
        <span className="font-medium">{"cURL 请求"}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {errorCount > 0 ? (
            <span role="alert" className="text-destructive">{"修复 "}{errorCount} {errorCount === 1 ? "问题" : "问题"}{" ，请先在表单标签页填写后再复制"}</span>
          ) : (
            <>
              <span>{"将 $LITELLM_API_KEY 替换为虚拟密钥"}</span>
              <CopyButton value={command} label={"复制 cURL"} variant="action" />
            </>
          )}
        </div>
      </div>
      <pre
        aria-label="cURL request"
        className="m-0 min-h-0 flex-1 overflow-auto whitespace-pre-wrap wrap-anywhere px-3 py-3 font-mono text-xs leading-5"
      >
        {command}
      </pre>
    </div>
  );
}
