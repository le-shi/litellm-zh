"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ShieldOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { fetchMCPServerUserCredentials, revokeMCPServerUserCredential } from "@/components/networking";
import type { MCPServerUserCredentialListItem } from "@/components/mcp_tools/types";
import { createQueryKeys } from "@/app/(dashboard)/hooks/common/queryKeysFactory";

const mcpServerUserCredentialKeys = createQueryKeys("mcpServerUserCredentials");

export function credentialTypeLabel(credentialType: MCPServerUserCredentialListItem["credential_type"]): string {
  return credentialType === "oauth2" ? "OAuth2" : "BYOK API key";
}

export function formatTimestamp(value: string | null): string {
  if (value === null) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function CredentialsBody({
  items,
  error,
  isLoading,
  onRevoke,
}: {
  items: MCPServerUserCredentialListItem[] | undefined;
  error: Error | null;
  isLoading: boolean;
  onRevoke: ((item: MCPServerUserCredentialListItem) => void) | null;
}) {
  if (isLoading) {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card p-12"
      >
        <UiLoadingSpinner className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{"正在加载用户凭据…"}</p>
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{"无法加载用户凭据"}</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }
  if (!items) return null;
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">{"没有用户为此服务器存储凭据。"}</p>
      </div>
    );
  }
  return (
    <section aria-label={"已存储的用户凭据"} className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{"用户"}</TableHead>
            <TableHead>{"类型"}</TableHead>
            <TableHead>{"已连接"}</TableHead>
            <TableHead>{"到期时间"}</TableHead>
            <TableHead>{"已更新"}</TableHead>
            {onRevoke ? <TableHead className="text-right">{"操作"}</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.user_id}>
              <TableCell className="font-mono text-xs">{item.user_id}</TableCell>
              <TableCell>
                <Badge variant="secondary">{credentialTypeLabel(item.credential_type)}</Badge>
              </TableCell>
              <TableCell className="text-xs">{formatTimestamp(item.connected_at)}</TableCell>
              <TableCell className="text-xs">{formatTimestamp(item.expires_at)}</TableCell>
              <TableCell className="text-xs">{formatTimestamp(item.updated_at)}</TableCell>
              {onRevoke ? (
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRevoke(item)}
                    aria-label={`Revoke credential for user ${item.user_id}`}
                  >
                    <ShieldOff className="size-4" />{"撤销"}</Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

interface MCPServerUserCredentialsPanelProps {
  serverId: string;
  accessToken: string | null;
  canRevoke: boolean;
}

export function MCPServerUserCredentialsPanel({
  serverId,
  accessToken,
  canRevoke,
}: MCPServerUserCredentialsPanelProps) {
  const queryClient = useQueryClient();
  const [pendingItem, setPendingItem] = useState<MCPServerUserCredentialListItem | null>(null);
  const queryKey = mcpServerUserCredentialKeys.detail(serverId);
  const { data, error, isLoading, isFetching, refetch } = useQuery<MCPServerUserCredentialListItem[], Error>({
    queryKey,
    queryFn: () => fetchMCPServerUserCredentials(accessToken!, serverId),
    enabled: !!accessToken,
  });
  const revoke = useMutation<void, Error, MCPServerUserCredentialListItem>({
    mutationFn: (item) => revokeMCPServerUserCredential(accessToken!, serverId, item.user_id, item.credential_type),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
  const confirmRevoke = () => {
    if (pendingItem === null) return;
    revoke.mutate(pendingItem);
    setPendingItem(null);
  };

  return (
    <div className="space-y-4" data-testid="mcp-server-user-credentials-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">{"用户凭据"}</h2>
          <p className="text-sm text-muted-foreground">{"此服务器存储的用户级 OAuth2 令牌和自带 API 密钥。撤销会从数据库删除并清除缓存，用户必须重新连接，网关才能代表其调用此服务器。"}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label={"刷新用户凭据"}
        >
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />{"刷新"}</Button>
      </div>

      {revoke.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{"无法撤销凭据"}</AlertTitle>
          <AlertDescription>{revoke.error.message}</AlertDescription>
        </Alert>
      ) : null}
      {revoke.isSuccess ? (
        <Alert>
          <AlertTitle>{"凭据已撤销"}</AlertTitle>
          <AlertDescription>{"已保存的 "}{credentialTypeLabel(revoke.variables.credential_type)}{" 凭据，所属用户"}{" "}
            {revoke.variables.user_id}{" 已删除。"}</AlertDescription>
        </Alert>
      ) : null}

      <CredentialsBody items={data} error={error} isLoading={isLoading} onRevoke={canRevoke ? setPendingItem : null} />

      <AlertDialog open={pendingItem !== null} onOpenChange={(open) => !open && setPendingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{"撤销已存储凭据"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingItem
                ? `This deletes the ${credentialTypeLabel(pendingItem.credential_type)} credential stored for user ${pendingItem.user_id}. `
                : ""}{"在重新连接前，他们发往此服务器的下一次 MCP 请求将失败。"}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPendingItem(null)}>{"取消"}</Button>
            <Button variant="destructive" onClick={confirmRevoke} disabled={revoke.isPending}>{"撤销"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MCPServerUserCredentialsPanel;
