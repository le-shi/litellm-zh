import CopyButton from "@/components/shared/CopyButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";
import { JsonViewer } from "./JsonViewer";

interface ClassifierAuditViewProps {
  request: Record<string, unknown>;
  response: unknown;
}

export function ClassifierAuditView({ request, response }: ClassifierAuditViewProps) {
  return (
    <div className="mb-6 space-y-4">
      <AuditField title={"分类器输入"} value={request.classifier_input}>{"发送给提供商的请求内容。缓存命中或消息日志未启用时，可能没有记录。"}</AuditField>
      <AuditField title={"原始请求，凭据已脱敏"} value={request.originating_request_masked}>{"仅用于比较。此来源请求未附加到分类器输入中。"}</AuditField>
      <AuditField title={"分类器响应"} value={response}>{"分类器返回的判断及说明。后续路由规则可能调整层级。"}</AuditField>
    </div>
  );
}

function AuditField({ title, value, children }: { title: string; value: unknown; children: ReactNode }) {
  const serialized = JSON.stringify(value);
  const truncated = serialized?.includes("litellm_truncated") ?? false;

  return (
    <Card size="sm" role="region" aria-label={title}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {value != null && <CopyButton value={JSON.stringify(value, null, 2)} label={`Copy ${title}`} />}
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">{children}</p>
        {truncated && (
          <p role="status" className="mb-3 text-sm text-warning">{"此存储副本已被截断，无法从当前日志存储中获取完整内容。"}</p>
        )}
        {value == null ? (
          <p className="text-sm text-muted-foreground">{"未记录，或消息日志未启用"}</p>
        ) : (
          <JsonViewer data={value} mode="formatted" />
        )}
      </CardContent>
    </Card>
  );
}
