import React from "react";
import type { components } from "@/lib/http/schema";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/components/networking";
import { Button } from "@/components/ui/button";
import { readAgentIdentity } from "./agent_identity";

const authenticationMessage = (error: boolean, lastAuthenticated?: string | null): string => {
  if (error) return "Could not load authentication evidence";
  if (lastAuthenticated) return `Last authenticated identity match: ${new Date(lastAuthenticated).toLocaleString()}`;
  return "Configured, awaiting an authenticated request";
};

export const AgentIdentityDetails = ({
  agentId,
  identity: value,
  accessToken,
  isAdmin,
}: {
  agentId: string;
  identity: unknown;
  accessToken: string | null;
  isAdmin: boolean;
}) => {
  const identity = readAgentIdentity(value);
  const { data, isError, isFetching, refetch } = useQuery({
    queryKey: ["agent-identity", agentId, identity],
    queryFn: () =>
      apiClient.get<components["schemas"]["ManagedAgentIdentityStatus"]>(
        `/v1/agents/${encodeURIComponent(agentId)}/identity`,
        {
          accessToken: accessToken ?? "",
        },
      ),
    enabled: Boolean(isAdmin && accessToken && identity),
  });

  if (!identity || !isAdmin) return null;
  const executionLabel = data?.enabled ? "Enabled" : "Disabled";
  return (
    <section aria-label={"智能体身份"} className="mb-6 space-y-2 rounded-lg border border-border p-4">
      <h3 className="font-medium">{"智能体身份：Microsoft Entra ID"}</h3>
      <p className="text-sm">{"租户： "}<span className="font-mono">{identity.tenant_id}</span>
      </p>
      <>
        <p className="text-sm">{"应用程序（客户端）ID： "}<span className="font-mono">{identity.client_id}</span>
        </p>
        <p className="text-sm">{"企业应用对象 ID： "}{identity.service_principal_id || "Not configured"}</p>
      </>
      <p className="text-sm">{"执行： "}{data ? executionLabel : "加载中"} · Mode: {data?.execution_mode ?? "Loading"}
      </p>
      <p className="text-sm">
        {data?.identity?.active === false
          ? "身份已解绑，执行已禁用"
          : authenticationMessage(isError, data?.last_authenticated_at)}
      </p>
      <p className="text-xs text-muted-foreground">{"最近的验证记录来自与此绑定匹配的有效 Entra 令牌，重启后仍会保留，绑定更改后清除。工具和模型权限单独检查。"}</p>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={() => {
            void refetch();
          }}
        >{"刷新认证验证记录"}</Button>
        <a className="text-sm underline" href="/ui/logs/">{"查看请求日志"}</a>
      </div>
    </section>
  );
};
