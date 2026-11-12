"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowUpRight } from "lucide-react";
import { LineChart, STACKED_USAGE_PALETTE, StackedUsageChart } from "@/components/shared/charts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/cva.config";
import { uiHref } from "@/utils/uiHref";
import { ChartSkeleton, Panel, PANEL_INSET_X, Segmented, Stat } from "../overview/Primitives";
import {
  ERROR_ENTITY_KINDS,
  ERROR_ENTITY_LABEL,
  entityRows,
  errorSeries,
  type ErrorRateView,
  type ErrorSeries,
  ERROR_RATE_VIEW_OPTIONS,
  rateByStatusRows,
  errorSummary,
  formatRate,
  statusCodeRows,
  type ErrorEntityKind,
  type RequestErrorActivity,
} from "./errorsData";

interface ErrorsTabProps {
  activity: RequestErrorActivity | null;
  loading: boolean;
  failed: boolean;
  userScoped?: boolean;
}

const ENTITY_OPTIONS = ERROR_ENTITY_KINDS.map((kind) => ({ value: kind, label: ERROR_ENTITY_LABEL[kind].plural }));

const shortDate = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const count = (value: number): string => value.toLocaleString();

function RateBar({ rate, className }: { rate: number | null; className?: string }) {
  const width = rate === null ? 0 : Math.min(100, Math.max(rate, rate > 0 ? 2 : 0));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-destructive" style={{ width: `${width}%` }} />
      </div>
      <span className="tabular-nums">{formatRate(rate)}</span>
    </div>
  );
}

function StatCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="rounded-xl border bg-card p-4">
      {children}
    </div>
  );
}

function PanelBody({
  loading,
  empty,
  height,
  children,
}: {
  loading: boolean;
  empty: string | null;
  height: string;
  children: React.ReactNode;
}) {
  if (loading) return <ChartSkeleton className={height} />;
  if (empty !== null) return <EmptyNote>{empty}</EmptyNote>;
  return <>{children}</>;
}

function rateChartEmpty(rateView: ErrorRateView, series: ErrorSeries, noTraffic: boolean): string | null {
  if (noTraffic || series.rows.length === 0) return "No requests in this range";
  if (rateView === "status" && series.codes.length === 0) return "No failed requests in this range";
  return null;
}

export default function ErrorsTab({ activity, loading, failed, userScoped = false }: ErrorsTabProps) {
  const [kind, setKind] = useState<ErrorEntityKind>("key");
  const [rateView, setRateView] = useState<ErrorRateView>("total");
  const summary = useMemo(() => (activity ? errorSummary(activity) : null), [activity]);
  const series = useMemo(() => (activity ? errorSeries(activity) : { rows: [], codes: [] }), [activity]);
  const statusRows = useMemo(() => (activity ? statusCodeRows(activity) : []), [activity]);
  const rows = useMemo(() => (activity ? entityRows(activity, kind) : []), [activity, kind]);
  const failedByDate = useMemo(() => new Map(series.rows.map((row) => [row.date, row.failed])), [series]);
  const rateRows = useMemo(
    () =>
      (rateView === "total" ? series.rows : rateByStatusRows(series)).map((row) => ({
        ...row,
        date: shortDate(row.date),
      })),
    [series, rateView],
  );
  const noTraffic = summary !== null && summary.requests === 0;
  const rateEmpty = rateChartEmpty(rateView, series, noTraffic);

  if (userScoped) {
    return (
      <Alert role="status">
        <AlertCircle />
        <AlertTitle>{"错误统计覆盖整个部署"}</AlertTitle>
        <AlertDescription>{"清除全局用量中的用户筛选以查看失败分析"}</AlertDescription>
      </Alert>
    );
  }
  if (failed) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircle />
        <AlertTitle>{"无法加载错误活动"}</AlertTitle>
        <AlertDescription>{"代理未响应失败请求查询，请重新加载页面。"}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-3" data-testid="usage-errors-tab">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCell label={"错误率"}>
          <Stat
            label={"错误率"}
            value={summary ? formatRate(summary.rate) : null}
            pending={loading}
            tone={summary && summary.failed > 0 ? "destructive" : undefined}
            hint={summary ? `${count(summary.failed)} of ${count(summary.requests)} requests` : undefined}
          />
        </StatCell>
        <StatCell label={"失败请求"}>
          <Stat label={"失败请求"} value={summary ? count(summary.failed) : null} pending={loading} />
        </StatCell>
        <StatCell label={"客户端错误（4xx）"}>
          <Stat label={"客户端错误（4xx）"} value={summary ? count(summary.clientErrors) : null} pending={loading} />
        </StatCell>
        <StatCell label={"服务端错误（5xx）"}>
          <Stat label={"服务端错误（5xx）"} value={summary ? count(summary.serverErrors) : null} pending={loading} />
        </StatCell>
        <StatCell label={"触发限速（429）"}>
          <Stat label={"触发限速（429）"} value={summary ? count(summary.rateLimited) : null} pending={loading} />
        </StatCell>
        <StatCell label={"认证或权限失败（401/403）"}>
          <Stat
            label={"认证或权限失败（401/403）"}
            value={summary ? count(summary.authFailures) : null}
            pending={loading}
          />
        </StatCell>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel
          title={"错误率趋势"}
          subtitle="Failed requests as a share of all requests, per day"
          action={<Segmented label={"显示"} value={rateView} options={ERROR_RATE_VIEW_OPTIONS} onChange={setRateView} />}
        >
          <PanelBody loading={loading} height="h-64" empty={rateEmpty}>
            <LineChart
              data={rateRows}
              index="date"
              categories={rateView === "total" ? ["rate"] : series.codes}
              colors={
                rateView === "total"
                  ? ["red"]
                  : series.codes.map((_, index) => STACKED_USAGE_PALETTE[index % STACKED_USAGE_PALETTE.length])
              }
              valueFormatter={(value) => formatRate(value)}
              showLegend={rateView === "status"}
              showDots={rateRows.length === 1}
              className="h-64"
            />
          </PanelBody>
        </Panel>
        <Panel title={"按状态码统计失败请求"} subtitle="Per day, stacked by HTTP status">
          <PanelBody
            loading={loading}
            height="h-64"
            empty={series.rows.every((row) => row.failed === 0) ? "No failed requests in this range" : null}
          >
            <StackedUsageChart
              data={series.rows}
              series={series.codes}
              xKey="date"
              xLabel={shortDate}
              format={count}
              totalFor={(date) => failedByDate.get(date)}
              totalLabel="failed"
              className="h-64"
            />
            <ul
              className={cn("flex flex-wrap gap-x-4 gap-y-1 pb-4 text-xs text-muted-foreground", PANEL_INSET_X)}
              aria-label={"图表中的状态码"}
            >
              {series.codes.map((code, index) => (
                <li key={code} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="inline-block size-2.5 rounded-sm"
                    style={{ backgroundColor: STACKED_USAGE_PALETTE[index % STACKED_USAGE_PALETTE.length] }}
                  />
                  {code}
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title={"按状态码"} subtitle="Share of all failed requests">
          <PanelBody
            loading={loading}
            height="h-48"
            empty={statusRows.length === 0 ? "No failed requests in this range" : null}
          >
            <ul className={cn("grid gap-2 pb-4", PANEL_INSET_X)} aria-label={"按状态码统计失败请求"}>
              {statusRows.map((row) => (
                <li
                  key={row.status_code}
                  className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 text-sm"
                >
                  <span className="font-medium tabular-nums">{row.status_code === 0 ? "—" : row.status_code}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-foreground">{row.label}</span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <span className="block h-full rounded-full bg-destructive" style={{ width: `${row.share}%` }} />
                    </span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {count(row.failed_requests)} · {row.share.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>

        <Panel
          title={"按身份统计失败请求"}
          subtitle="Keys, teams, users and models ranked by failed requests"
          action={<Segmented label={"分组维度"} value={kind} options={ENTITY_OPTIONS} onChange={setKind} />}
        >
          <PanelBody
            loading={loading}
            height="h-48"
            empty={
              rows.length === 0
                ? `No ${ERROR_ENTITY_LABEL[kind].plural.toLowerCase()} with failed requests in this range`
                : null
            }
          >
            <Table aria-label={`${ERROR_ENTITY_LABEL[kind].plural} ranked by failed requests`}>
              <TableHeader>
                <TableRow>
                  <TableHead>{ERROR_ENTITY_LABEL[kind].singular}</TableHead>
                  <TableHead className="text-right">{"请求"}</TableHead>
                  <TableHead className="text-right">{"失败"}</TableHead>
                  <TableHead>{"错误率"}</TableHead>
                  <TableHead>{"主要状态码"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-56">
                      <span className="block truncate font-medium" title={row.name}>
                        {row.name}
                      </span>
                      {row.name !== row.id && (
                        <span className="block truncate font-mono text-xs text-muted-foreground" title={row.id}>
                          {row.id}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{count(row.requests)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{count(row.failed)}</TableCell>
                    <TableCell>
                      <RateBar rate={row.rate} />
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{row.topStatus ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PanelBody>
          <div className={cn("flex justify-end pb-4 pt-2", PANEL_INSET_X)}>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={uiHref("logs")} />}>{"在日志中查看失败请求"}<ArrowUpRight />
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className={cn("pb-4 text-sm text-muted-foreground", PANEL_INSET_X)}>{children}</p>;
}
