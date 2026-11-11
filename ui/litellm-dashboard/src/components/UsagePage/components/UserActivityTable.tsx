import React from "react";

import { formatCompact } from "@/app/(dashboard)/usage/_components/components/overview/overviewData";

import type { UserActivityRow } from "../dailyActivityApi";
import { formatUserSpend, userPrimaryLabel, userRowKey, userSecondaryLabel } from "./userActivityData";

const USER_ROW_GRID = "grid w-full grid-cols-[minmax(0,1fr)_5.5rem_4.5rem_5rem_4.5rem_5.5rem] items-center gap-3";

interface UserActivityTableProps {
  rows: readonly UserActivityRow[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  failed: boolean;
  onLoadMore: () => void;
  onRetryFirstPage: () => void;
  onRetryNextPage: () => void;
}

export const UserCell: React.FC<{ row: UserActivityRow }> = ({ row }) => {
  const secondary = userSecondaryLabel(row);
  return (
    <div className="min-w-0">
      <div className="truncate text-sm text-foreground">{userPrimaryLabel(row)}</div>
      {secondary && <div className="truncate text-xs text-muted-foreground">{secondary}</div>}
    </div>
  );
};

const UserActivityTable: React.FC<UserActivityTableProps> = ({
  rows,
  total,
  hasMore,
  loading,
  loadingMore,
  failed,
  onLoadMore,
  onRetryFirstPage,
  onRetryNextPage,
}) => {
  const firstPageFailed = failed && rows.length === 0;
  const body = (() => {
    if (firstPageFailed) {
      return (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">{"无法加载此时间范围的用户。"}{" "}
          <button type="button" className="font-medium text-foreground underline" onClick={onRetryFirstPage}>{"重试"}</button>
        </p>
      );
    }
    if (loading) {
      return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{"正在加载用户…"}</p>;
    }
    if (rows.length === 0) {
      return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{"此日期范围内无用户活动"}</p>;
    }
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[40rem]">
          <div
            aria-hidden="true"
            className={`${USER_ROW_GRID} border-y bg-muted/40 py-2 pl-10 pr-4 text-xs font-medium text-muted-foreground`}
          >
            <span>{"用户"}</span>
            <span className="text-right">{"费用"}</span>
            <span className="text-right">{"请求"}</span>
            <span className="text-right">{"成功"}</span>
            <span className="text-right">{"失败"}</span>
            <span className="text-right">{"Token 总数"}</span>
          </div>
          <ul>
            {rows.map((row) => (
              <li key={userRowKey(row)} className={`${USER_ROW_GRID} border-b py-2.5 pl-10 pr-4 last:border-b-0`}>
                <UserCell row={row} />
                <span className="text-right text-sm tabular-nums text-foreground">{formatUserSpend(row.spend)}</span>
                <span className="text-right text-sm tabular-nums text-foreground">
                  {row.api_requests.toLocaleString()}
                </span>
                <span className="text-right text-sm tabular-nums text-foreground">
                  {row.successful_requests.toLocaleString()}
                </span>
                <span
                  className={`text-right text-sm tabular-nums ${row.failed_requests > 0 ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {row.failed_requests.toLocaleString()}
                </span>
                <span className="text-right text-sm tabular-nums text-muted-foreground">
                  {formatCompact(row.total_tokens)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  })();

  const nextPageFailed = failed && !firstPageFailed;
  const showFooter = hasMore || loadingMore || nextPageFailed;
  const canLoadMore = hasMore && !loadingMore && !failed;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {total.toLocaleString()}{" 个用户"}</span>
      </div>
      <div>{body}</div>
      {showFooter && (
        <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
          {loadingMore && <p>{"正在加载更多用户…"}</p>}
          {failed && !firstPageFailed && (
            <p>{"无法加载更多用户。"}{" "}
              <button type="button" className="font-medium text-foreground underline" onClick={onRetryNextPage}>{"重试"}</button>
            </p>
          )}
          {canLoadMore && (
            <button type="button" className="font-medium text-foreground underline" onClick={onLoadMore}>{"加载更多"}</button>
          )}
        </div>
      )}
    </div>
  );
};

export default UserActivityTable;
