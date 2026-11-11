import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatGuardrailMode,
  formatLoggingOnlyScope,
  loggingOnlyContinueFromParams,
  modeIncludesLoggingOnly,
} from "./guardrail_info_helpers";

type GuardrailModeParams = {
  mode?: unknown;
  default_on?: boolean;
  logging_only_scope?: string | null;
  logging_only_continue_on_input_failure?: boolean | null;
};

export const GuardrailModeCard: React.FC<{ litellmParams: GuardrailModeParams }> = ({ litellmParams }) => (
  <Card className="block p-6">
    <p>{"模式"}</p>
    <div className="mt-2">
      <h3 className="text-lg font-medium">{formatGuardrailMode(litellmParams.mode) || "-"}</h3>
      <Badge variant={litellmParams.default_on ? "secondary" : "outline"}>
        {litellmParams.default_on ? "默认启用" : "默认关闭"}
      </Badge>
    </div>
    {modeIncludesLoggingOnly(litellmParams.mode) && (
      <div className="mt-4">
        <p>{"仅记录日志的范围"}</p>
        <h3 className="text-lg font-medium">{formatLoggingOnlyScope(litellmParams.logging_only_scope)}</h3>
        <p className="mt-2">{"请求被标记后继续执行"}</p>
        <h3 className="text-lg font-medium">{loggingOnlyContinueFromParams(litellmParams) ? "开" : "关"}</h3>
      </div>
    )}
  </Card>
);

export const GuardrailModeRows: React.FC<{ litellmParams: GuardrailModeParams }> = ({ litellmParams }) => (
  <>
    <div>
      <p className="font-medium">{"模式"}</p>
      <div>{formatGuardrailMode(litellmParams.mode) || "-"}</div>
    </div>
    {modeIncludesLoggingOnly(litellmParams.mode) && (
      <div>
        <p className="font-medium">{"仅记录日志的范围"}</p>
        <div>{formatLoggingOnlyScope(litellmParams.logging_only_scope)}</div>
        <p className="font-medium">{"请求被标记后继续执行"}</p>
        <div>{loggingOnlyContinueFromParams(litellmParams) ? "开" : "关"}</div>
      </div>
    )}
  </>
);
