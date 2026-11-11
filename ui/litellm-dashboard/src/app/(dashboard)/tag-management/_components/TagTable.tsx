"use client";

import { SortingState, Table } from "@tanstack/react-table";
import { Inbox, SearchX } from "lucide-react";
import React, { useMemo, useState } from "react";

import { DataTable } from "@/components/shared/DataTable";
import { Tag } from "@/components/tag_management/types";
import { Input } from "@/components/ui/input";

import { getTagTableColumns } from "./tagTableColumns";

interface TagTableProps {
  data: Tag[];
  onEdit: (tag: Tag) => void;
  onDelete: (tagName: string) => void;
  onSelectTag: (tagName: string) => void;
  isLoading?: boolean;
}

const DEFAULT_SORTING: SortingState = [{ id: "created_at", desc: true }];

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-1 py-6">
      <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
        <Inbox className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium text-foreground">{"暂无标签"}</div>
      <div className="text-sm text-muted-foreground">{"创建标签以配置模型路由和使用限制。"}</div>
    </div>
  );
}

function NoMatchingTags() {
  return (
    <div className="flex flex-col items-center gap-1 py-6">
      <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
        <SearchX className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium text-foreground">{"没有匹配的标签"}</div>
      <div className="text-sm text-muted-foreground">{"请尝试其他标签名称或描述。"}</div>
    </div>
  );
}

function TagFilters({ table }: { table: Table<Tag> }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        aria-label={"按标签名称筛选"}
        placeholder={"按标签名称筛选…"}
        className="h-8 w-56"
        value={(table.getColumn("name")?.getFilterValue() as string | undefined) ?? ""}
        onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
      />
      <Input
        aria-label={"按描述筛选"}
        placeholder={"按描述筛选…"}
        className="h-8 w-56"
        value={(table.getColumn("description")?.getFilterValue() as string | undefined) ?? ""}
        onChange={(event) => table.getColumn("description")?.setFilterValue(event.target.value)}
      />
    </div>
  );
}

const TagTable: React.FC<TagTableProps> = ({ data, onEdit, onDelete, onSelectTag, isLoading = false }) => {
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);

  const columns = useMemo(() => getTagTableColumns({ onSelectTag, onEdit, onDelete }), [onSelectTag, onEdit, onDelete]);

  return (
    <DataTable
      data={data}
      paginationMode="client"
      columns={columns}
      getRowId={(tag, index) => tag.name || String(index)}
      fillHeight
      sortingMode="client"
      sorting={sorting}
      onSortingChange={setSorting}
      isLoading={isLoading}
      loadingMessage="Loading tags…"
      filterMode="client"
      toolbar={(table) => <TagFilters table={table} />}
      noDataMessage={data.length === 0 ? <EmptyState /> : <NoMatchingTags />}
      size="compact"
    />
  );
};

export default TagTable;
