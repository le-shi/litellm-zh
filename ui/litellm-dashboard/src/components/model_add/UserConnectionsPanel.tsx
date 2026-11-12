"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { userConnectionsKeys, useUserConnections } from "@/app/(dashboard)/hooks/credentials/useUserConnections";
import useAuthorized from "@/app/(dashboard)/hooks/useAuthorized";
import { userConnectionDeleteCall, UserProviderConnection } from "@/components/networking";
import { Providers } from "@/components/provider_info_helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/lib/toast";

import GithubCopilotConnectModal from "./GithubCopilotConnectModal";

const providerLabel = (provider: string): string =>
  Providers[provider.toUpperCase() as keyof typeof Providers] ??
  Object.entries(Providers).find(([key]) => key.toLowerCase() === provider.toLowerCase())?.[1] ??
  provider;

export default function UserConnectionsPanel() {
  const { accessToken } = useAuthorized();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useUserConnections();
  const [connectingCredential, setConnectingCredential] = useState<string | null>(null);
  const connections: readonly UserProviderConnection[] = data?.connections ?? [];
  const showEmpty = !isLoading && !isError && connections.length === 0;

  const refreshConnections = useCallback(
    () => queryClient.invalidateQueries({ queryKey: userConnectionsKeys.all }),
    [queryClient],
  );

  const disconnect = async (credentialName: string) => {
    if (!accessToken) {
      return;
    }
    try {
      await userConnectionDeleteCall(accessToken, credentialName);
      toast.success("已断开 GitHub Copilot 连接");
      setConnectingCredential(null);
      await refreshConnections();
    } catch (error) {
      toast.error("断开 GitHub Copilot 连接失败");
    }
  };

  return (
    <section className="mx-auto flex w-full flex-col gap-3 p-2">
      <div>
        <h3 className="text-base font-semibold">{"您的连接"}</h3>
        <p className="text-sm text-muted-foreground">{"使用您个人账号的凭据。连接一次后，对关联模型的请求将使用您的访问权限。"}</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{"凭据"}</TableHead>
            <TableHead>{"提供商"}</TableHead>
            <TableHead>{"状态"}</TableHead>
            <TableHead className="text-right">{"操作"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={4} className="text-sm text-muted-foreground">{"正在加载连接…"}</TableCell>
            </TableRow>
          )}
          {isError && (
            <TableRow>
              <TableCell colSpan={4} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{"无法加载您的连接。"}</span>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>{"重试"}</Button>
                </div>
              </TableCell>
            </TableRow>
          )}
          {showEmpty && (
            <TableRow>
              <TableCell colSpan={4} className="text-sm text-muted-foreground">{"没有需要个人连接的凭据。"}</TableCell>
            </TableRow>
          )}
          {connections.map((connection) => (
            <TableRow key={connection.credential_name}>
              <TableCell>{connection.credential_name}</TableCell>
              <TableCell>{providerLabel(connection.provider)}</TableCell>
              <TableCell>
                {connection.connected ? (
                  <Badge>Connected as @{connection.github_login}</Badge>
                ) : (
                  <Badge variant="outline">{"未连接"}</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {connection.connected ? (
                  <Button variant="outline" size="sm" onClick={() => disconnect(connection.credential_name)}>{"断开连接"}</Button>
                ) : (
                  <Button size="sm" onClick={() => setConnectingCredential(connection.credential_name)}>{"连接"}</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {connectingCredential !== null && (
        <GithubCopilotConnectModal
          credentialName={connectingCredential}
          onClose={() => setConnectingCredential(null)}
          onConnected={refreshConnections}
          onDisconnect={() => disconnect(connectingCredential)}
        />
      )}
    </section>
  );
}
