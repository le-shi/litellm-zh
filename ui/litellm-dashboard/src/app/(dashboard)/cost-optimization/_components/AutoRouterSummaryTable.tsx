import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { groupKey, groupLabel, pctLabel, type AutoRouterBenchmarkGroup } from "./autoRouterBenchmarks";
import { usd } from "./costOptimizationUtils";

interface AutoRouterSummaryTableProps {
  groups: readonly AutoRouterBenchmarkGroup[];
  selectedGroup: AutoRouterBenchmarkGroup | null;
}

export default function AutoRouterSummaryTable({ groups, selectedGroup }: AutoRouterSummaryTableProps) {
  const visibleGroups = selectedGroup ? [selectedGroup] : groups;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{"路由用量与节省费用"}</CardTitle>
        <CardDescription>{"按所选 UTC 日期统计。费用包含模型调用和分类，Token 包含路由后模型的输入与输出。"}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table aria-label={"路由用量与节省费用"}>
          <TableHeader>
            <TableRow>
              <TableHead>{"自动路由"}</TableHead>
              <TableHead className="text-right whitespace-normal">{"路由 Token 数"}</TableHead>
              <TableHead className="text-right whitespace-normal">{"路由费用"}</TableHead>
              <TableHead className="text-right whitespace-normal">{"每百万 Token 费用"}</TableHead>
              <TableHead className="text-right whitespace-normal">{"相较高阶模型节省"}</TableHead>
              <TableHead className="text-right">{"节省比例"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{"此时间范围内无自动路由记录"}</TableCell>
              </TableRow>
            ) : (
              visibleGroups.map((group) => (
                <TableRow key={groupKey(group)}>
                  <TableCell className="font-medium">{groupLabel(group, groups)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {group.total_tokens == null ? "暂无数据" : group.total_tokens.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{usd(group.spend)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {group.total_tokens != null && group.total_tokens > 0
                      ? usd((group.spend * 1_000_000) / group.total_tokens)
                      : "暂无数据"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {group.saved_spend == null ? "暂无数据" : usd(group.saved_spend)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {group.saved_pct == null ? "暂无数据" : pctLabel(group.saved_pct)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <p className="mt-3 text-xs text-muted-foreground">
          Savings are estimated against each router&apos;s premium baseline. Token totals and unit costs are unavailable
          for usage recorded before token tracking; unit cost also requires nonzero tokens.
        </p>
      </CardContent>
    </Card>
  );
}
