"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { CredentialItem } from "@/components/networking";
import { getProviderLogoAndName } from "@/components/provider_info_helpers";
import { DataTableSortHeader } from "@/components/shared/DataTable";
import { credentialLabel } from "@/components/shared/credentialOptions";
import { IdentityCell, StatusBadge } from "@/components/shared/table_cells";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cva.config";
import { copyToClipboard } from "@/utils/dataUtils";

import { inferAuthMethod } from "./credential_federation";

function CredentialProviderCell({ provider, federated }: { provider: string | undefined; federated: boolean }) {
  if (!provider) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }
  const { displayName, logo } = getProviderLogoAndName(provider);
  return (
    <div className="flex items-center gap-2">
      {logo ? (
        <img
          src={logo}
          alt=""
          className="size-4 shrink-0"
          onError={(event) => {
            (event.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}
      <span className="truncate text-sm">{displayName || provider}</span>
      {federated && <Badge variant="secondary">{"工作负载身份联合"}</Badge>}
    </div>
  );
}

interface CredentialRowActionsProps {
  credential: CredentialItem;
  onEdit: (credential: CredentialItem) => void;
  onDelete: (credential: CredentialItem) => void;
}

function CredentialRowActions({ credential, onEdit, onDelete }: CredentialRowActionsProps) {
  const configOwned = credential.source === "config";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={"打开凭据操作菜单"}
        data-testid={`credential-actions-${credential.credential_name}`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-muted-foreground")}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {configOwned && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel data-testid="credential-config-owned-hint">{"在 config.yaml 中定义。请编辑该文件以修改或删除。"}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          data-testid="credential-action-edit"
          disabled={configOwned}
          onClick={() => onEdit(credential)}
        >
          <Pencil />{"编辑"}</DropdownMenuItem>
        <DropdownMenuItem
          data-testid="credential-action-copy"
          onClick={() => void copyToClipboard(credential.credential_name, "Credential name copied")}
        >
          <Copy />{"复制凭据名称"}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          data-testid="credential-action-delete"
          disabled={configOwned}
          onClick={() => onDelete(credential)}
        >
          <Trash2 />{"删除"}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface CredentialsTableColumnsDeps {
  canModifyCredentials: boolean;
  onEdit: (credential: CredentialItem) => void;
  onDelete: (credential: CredentialItem) => void;
}

export const getCredentialsTableColumns = ({
  canModifyCredentials,
  onEdit,
  onDelete,
}: CredentialsTableColumnsDeps): ColumnDef<CredentialItem>[] => {
  const dataColumns: ColumnDef<CredentialItem>[] = [
    {
      id: "credential_name",
      accessorFn: credentialLabel,
      meta: { title: "凭据名称" },
      header: ({ column }) => <DataTableSortHeader column={column} title={"凭据名称"} />,
      size: 260,
      enableSorting: true,
      cell: ({ row }) => (
        <IdentityCell
          title={credentialLabel(row.original)}
          subtitle={row.original.display_name ? row.original.credential_name : undefined}
          className="max-w-72"
          titleClassName="font-medium"
        />
      ),
    },
    {
      id: "provider",
      accessorKey: "credential_info.custom_llm_provider",
      meta: { title: "提供商" },
      header: "提供商",
      size: 320,
      enableSorting: false,
      cell: ({ row }) => (
        <CredentialProviderCell
          provider={row.original.credential_info?.custom_llm_provider}
          federated={inferAuthMethod(row.original.credential_values) === "federation"}
        />
      ),
    },
    {
      id: "source",
      accessorFn: (row) => row.source ?? "db",
      meta: { title: "来源" },
      header: "来源",
      size: 140,
      enableSorting: false,
      cell: ({ row }) =>
        row.original.source === "config" ? (
          <StatusBadge tone="neutral" label={"配置文件"} />
        ) : (
          <StatusBadge tone="info" label={"数据库"} />
        ),
    },
  ];

  if (!canModifyCredentials) {
    return dataColumns;
  }

  return [
    ...dataColumns,
    {
      id: "actions",
      meta: { className: "text-right", headerClassName: "text-right" },
      header: () => <span className="sr-only">{"操作"}</span>,
      size: 64,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <CredentialRowActions credential={row.original} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ),
    },
  ];
};
