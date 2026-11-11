import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info } from "lucide-react";

interface ImpactResult {
  affected_keys_count: number;
  affected_teams_count: number;
  sample_keys: string[];
  sample_teams: string[];
}

interface ImpactPreviewAlertProps {
  impactResult: ImpactResult;
  isDefault?: boolean;
}

interface SampleListProps {
  label: string;
  samples: string[];
  totalCount: number;
}

const SampleList: React.FC<SampleListProps> = ({ label, samples, totalCount }) => (
  <div className="mt-1 flex flex-wrap items-center gap-1">
    <span className="text-xs text-muted-foreground">{label}: </span>
    {samples.slice(0, 5).map((sample) => (
      <Badge key={sample} variant="outline">
        {sample}
      </Badge>
    ))}
    {totalCount > 5 && <span className="text-xs text-muted-foreground">{"和 "}{totalCount - 5}{" 更多…"}</span>}
  </div>
);

const ImpactPreviewAlert: React.FC<ImpactPreviewAlertProps> = ({ impactResult, isDefault = false }) => {
  const isGlobal = impactResult.affected_keys_count === -1;
  const qualifier = isDefault ? "up to " : "";

  return (
    <Alert className="mb-4">
      {isGlobal ? <AlertTriangle /> : <Info />}
      <AlertTitle>{"影响预览"}</AlertTitle>
      <AlertDescription>
        {isGlobal ? (
          <span>{"全局范围，将影响 "}<strong>{"所有密钥和团队"}</strong>.
          </span>
        ) : (
          <div>
            <span>{"此关联将影响 "}{qualifier}
              <strong>
                {impactResult.affected_keys_count}{" 密钥"}{impactResult.affected_keys_count !== 1 ? "s" : ""}
              </strong>{" "}{"和"}{" "}
              <strong>
                {impactResult.affected_teams_count}{" 团队"}{impactResult.affected_teams_count !== 1 ? "s" : ""}
              </strong>
              .
            </span>
            {isDefault && (
              <div className="text-xs text-muted-foreground">{"默认关联仅用于未匹配任何非默认关联的请求，因此实际影响的请求可能更少。"}</div>
            )}
            {impactResult.sample_keys.length > 0 && (
              <SampleList
                label={"密钥"}
                samples={impactResult.sample_keys}
                totalCount={impactResult.affected_keys_count}
              />
            )}
            {impactResult.sample_teams.length > 0 && (
              <SampleList
                label={"团队"}
                samples={impactResult.sample_teams}
                totalCount={impactResult.affected_teams_count}
              />
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default ImpactPreviewAlert;
