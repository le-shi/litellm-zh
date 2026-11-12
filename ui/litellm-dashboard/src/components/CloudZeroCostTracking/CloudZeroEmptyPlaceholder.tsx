import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";

interface CloudZeroEmptyPlaceholderProps {
  startCreation: () => void;
}

export default function CloudZeroEmptyPlaceholder({ startCreation }: CloudZeroEmptyPlaceholderProps) {
  return (
    <div className="mx-auto mt-8 max-w-2xl rounded-lg border border-dashed border-border bg-card p-12 text-center">
      <div className="flex flex-col items-center gap-2">
        <Inbox className="size-10 text-muted-foreground" aria-hidden />
        <h4 className="text-base font-semibold">{"尚未配置 CloudZero 集成"}</h4>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{"连接 CloudZero 账户，即可直接在 LiteLLM 中跟踪和分析云服务费用。"}</p>
        <Button size="lg" onClick={startCreation} className="mt-4">{"添加 CloudZero 集成"}</Button>
      </div>
    </div>
  );
}
