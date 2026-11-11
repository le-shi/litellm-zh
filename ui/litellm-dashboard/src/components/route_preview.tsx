import React from "react";
import { ArrowRight, Info } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { getProxyBaseUrl } from "./networking";

interface RoutePreviewProps {
  pathValue: string;
  targetValue: string;
  includeSubpath: boolean;
}

const Endpoint = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0 flex-1 rounded-lg border bg-muted/40 p-3">
    <div className="mb-2 text-sm text-muted-foreground">{label}</div>
    <code className="block overflow-x-auto font-mono text-sm text-foreground">{children}</code>
  </div>
);

const RoutePreview: React.FC<RoutePreviewProps> = ({ pathValue, targetValue, includeSubpath }) => {
  const proxyBaseUrl = getProxyBaseUrl();

  if (!pathValue || !targetValue) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{"路由预览"}</CardTitle>
        <CardDescription>{"请求的路由方式"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <h4 className="mb-3 text-base font-semibold">{"基本路由："}</h4>
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
            <Endpoint label={"你的端点"}>{`${proxyBaseUrl}${pathValue}`}</Endpoint>
            <ArrowRight className="size-5 shrink-0 self-center text-muted-foreground max-sm:rotate-90" />
            <Endpoint label={"转发至"}>{targetValue}</Endpoint>
          </div>
        </div>

        {includeSubpath ? (
          <div>
            <h4 className="mb-3 text-base font-semibold">{"包含子路径时："}</h4>
            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
              <Endpoint label={"你的端点 + 子路径"}>
                {`${proxyBaseUrl}${pathValue}`}
                <span className="text-primary">/v1/text-to-image/base/model</span>
              </Endpoint>
              <ArrowRight className="size-5 shrink-0 self-center text-muted-foreground max-sm:rotate-90" />
              <Endpoint label={"转发至"}>
                {targetValue}
                <span className="text-primary">/v1/text-to-image/base/model</span>
              </Endpoint>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{"以下路径之后的任意内容 "}{pathValue}{" 会附加到目标地址之后"}</p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              <span className="font-medium">{"路由结果不符合预期？"}</span>{" 可启用上方的“包含子路径”，以便将类似以下的子路径"}{" "}
              <code className="rounded-sm bg-primary/10 px-1 py-0.5 font-mono text-xs">/api/v1/models</code>{" 自动转发。"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RoutePreview;
