import React from "react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";
import { DEFAULT_DEPLOYMENT_AFFINITY, DEFAULT_SESSION_AFFINITY_TTL_SECONDS } from "./ComplexityRouterConfig";

export const AffinityControls: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => {
  const [ttlDraft, setTtlDraft] = React.useState<string | null>(null);
  const commitTtl = (raw: string) => {
    setTtlDraft(null);
    if (raw.trim() === "") {
      onChange({ ...value, session_affinity_ttl_seconds: undefined });
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    onChange({ ...value, session_affinity_ttl_seconds: Math.max(1, Math.round(parsed)) });
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={value.deployment_affinity ?? DEFAULT_DEPLOYMENT_AFFINITY}
          onCheckedChange={(deploymentAffinity) => onChange({ ...value, deployment_affinity: deploymentAffinity })}
          aria-label={"为每个层级固定一个模型部署"}
        />
        <strong className="font-semibold">{"为每个层级固定一个模型部署"}</strong>
      </div>
      <span className="block text-xs mb-3 text-muted-foreground">{"复用每个层级已选择的模型及可用部署，请求仍可切换层级。关闭后，每轮都会重新选择模型并在部署间负载均衡。"}</span>
      <div style={{ maxWidth: 320 }}>
        <label className="block text-sm font-medium mb-1" htmlFor="session-affinity-ttl">{"空闲时保持固定模型的时长（秒）"}</label>
        <Input
          id="session-affinity-ttl"
          inputMode="numeric"
          value={ttlDraft ?? value.session_affinity_ttl_seconds ?? ""}
          placeholder={String(DEFAULT_SESSION_AFFINITY_TTL_SECONDS)}
          onChange={(event) => setTtlDraft(event.target.value)}
          onBlur={(event) => commitTtl(event.target.value)}
        />
        <span className="block text-xs mt-1 text-muted-foreground">
          Refreshes after every request that reuses a pin. Empty tracks the backend default of{" "}
          {DEFAULT_SESSION_AFFINITY_TTL_SECONDS}{" 秒。"}</span>
      </div>
    </>
  );
};
