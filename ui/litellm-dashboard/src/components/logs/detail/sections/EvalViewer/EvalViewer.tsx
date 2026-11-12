import React from "react";
import { CircleCheck, CircleX, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EvalVerdict {
  criterion_name: string;
  score: number;
  reasoning: string;
  passed: boolean;
  weight?: number;
}

interface EvalInformation {
  eval_id?: string;
  eval_name: string;
  overall_score: number;
  passed: boolean;
  judge_model: string;
  iteration?: number;
  eval_error?: string | null;
  verdicts?: EvalVerdict[];
  threshold?: number;
}

interface EvalViewerProps {
  data: EvalInformation | EvalInformation[];
}

export default function EvalViewer({ data }: EvalViewerProps) {
  const entries: EvalInformation[] = Array.isArray(data) ? data : [data];

  if (!entries.length) return null;

  return (
    <div className="mb-6">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <FlaskConical className="size-4" style={{ color: "#6366f1" }} />
        <span className="font-semibold" style={{ fontSize: 15 }}>{"大模型评判结果"}</span>
      </div>

      {entries.map((entry, idx) => (
        <EvalEntryCard key={entry.eval_id || idx} entry={entry} />
      ))}
    </div>
  );
}

function EvalEntryCard({ entry }: { entry: EvalInformation }) {
  const passed = entry.passed;
  const scoreColor = passed ? "#52c41a" : "#ff4d4f";

  // Filter out synthetic "Overall" row the judge sometimes appends — it's already in the header
  const verdicts = (entry.verdicts || []).filter((v) => (v.criterion_name || "").toLowerCase() !== "overall");

  const hasWeights = verdicts.some((v) => v.weight != null);
  const weightedTotal = verdicts.reduce((sum, v) => sum + (v.weight != null ? (v.score * v.weight) / 100 : 0), 0);

  return (
    <Card size="sm" className="mb-3" style={{ borderLeft: `3px solid ${scoreColor}` }}>
      <CardHeader>
        <CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {passed ? (
              <CircleCheck className="size-4" style={{ color: "#52c41a" }} />
            ) : (
              <CircleX className="size-4" style={{ color: "#ff4d4f" }} />
            )}
            <span className="font-semibold">{entry.eval_name}</span>
            <Badge variant={passed ? "secondary" : "destructive"}>{passed ? "通过" : "失败"}</Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className="text-muted-foreground"
                      style={{ fontSize: 12, cursor: "help", borderBottom: "1px dashed #aaa" }}
                    />
                  }
                >
                  {entry.overall_score?.toFixed(0)} / 100
                  {entry.threshold != null && ` (threshold: ${entry.threshold})`}
                </TooltipTrigger>
                <TooltipContent>{"所有评估标准得分的加权平均值。各项权重在创建评估时设置，权重越高，对最终得分的影响越大。"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardTitle>
        <CardAction>
          <div className="flex items-center gap-2">
            {entry.judge_model && (
              <span className="text-muted-foreground" style={{ fontSize: 12 }}>{"评判模型： "}{entry.judge_model}
              </span>
            )}
            {entry.iteration != null && (
              <span className="text-muted-foreground" style={{ fontSize: 12 }}>{"迭代： "}{entry.iteration + 1}
              </span>
            )}
          </div>
        </CardAction>
      </CardHeader>

      <CardContent>
        {entry.eval_error && (
          <span className="text-warning" style={{ display: "block", marginBottom: 8, fontSize: 12 }}>{"评判错误： "}{entry.eval_error}
          </span>
        )}

        {verdicts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: 160 }}>{"评估标准"}</TableHead>
                <TableHead style={{ width: 65 }}>{"权重"}</TableHead>
                <TableHead style={{ width: 65 }}>{"得分"}</TableHead>
                <TableHead style={{ width: 75 }}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger render={<span style={{ borderBottom: "1px dashed #aaa", cursor: "help" }} />}>{"加权值"}</TooltipTrigger>
                      <TooltipContent>{"得分 × 权重，表示各项标准对最终得分的贡献"}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead>{"备注"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verdicts.map((row) => {
                const contrib = row.weight != null ? (row.score * row.weight) / 100 : null;
                return (
                  <TableRow key={row.criterion_name}>
                    <TableCell>
                      <span className="font-semibold" style={{ whiteSpace: "nowrap" }}>
                        {row.criterion_name}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.weight != null ? (
                        <span className="text-muted-foreground" style={{ fontSize: 12 }}>
                          {row.weight}%
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span
                        style={{
                          color: row.score >= 70 ? "#52c41a" : row.score >= 50 ? "#faad14" : "#ff4d4f",
                          fontWeight: 600,
                        }}
                      >
                        {row.score}
                      </span>
                    </TableCell>
                    <TableCell>
                      {contrib != null ? (
                        <span className="text-muted-foreground" style={{ fontSize: 12 }}>
                          {contrib % 1 === 0 ? contrib : contrib.toFixed(1)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger render={<span style={{ fontSize: 12 }} />}>{row.reasoning}</TooltipTrigger>
                          <TooltipContent>{row.reasoning}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            {hasWeights && (
              <TableFooter>
                <TableRow>
                  <TableCell>
                    <span className="font-semibold" style={{ fontSize: 12 }}>{"总计"}</span>
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell>
                    <span className="font-semibold" style={{ fontSize: 12, color: scoreColor }}>
                      {weightedTotal % 1 === 0 ? weightedTotal : weightedTotal.toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        ) : (
          <span className="text-muted-foreground" style={{ fontSize: 12 }}>{"得分： "}{entry.overall_score?.toFixed(1)}{" ，暂无各项标准的明细。"}</span>
        )}
      </CardContent>
    </Card>
  );
}
