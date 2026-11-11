import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SimpleTooltip } from "@/components/ui/tooltip";
import type { ClassifierType } from "./classifier_types";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";
import { restrictedBy } from "./TierRestrictions";

interface ClassifierTypeRadiosProps {
  value: ComplexityRouterConfigValue;
  classifierType: ClassifierType;
  onTypeChange: (classifierType: ClassifierType) => void;
}

const ClassifierTypeRadios: React.FC<ClassifierTypeRadiosProps> = ({ value, classifierType, onTypeChange }) => {
  const scorerLocked = Boolean(value.custom_tier_set);
  const scorerLockedReason = restrictedBy(value, "heuristicClassifier")?.reason;
  return (
    <RadioGroup
      value={classifierType}
      onValueChange={(nextType: unknown) => onTypeChange(nextType as ClassifierType)}
      className="w-full"
    >
      <div className="flex w-full flex-col items-start gap-2">
        <SimpleTooltip content={scorerLockedReason}>
          <Label className="items-start font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
            <RadioGroupItem value="heuristic" className="mt-0.5" disabled={scorerLocked} />
            <span>
              <strong className="font-semibold">{"启发式"}</strong>{" "}
              <span className="text-muted-foreground">
                (default), rule-based scoring with no API calls and &lt;1ms latency
              </span>
            </span>
          </Label>
        </SimpleTooltip>
        <SimpleTooltip content={scorerLockedReason}>
          <Label className="items-start font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
            <RadioGroupItem value="heuristic_v2" className="mt-0.5" disabled={scorerLocked} />
            <span>
              <strong className="font-semibold">{"启发式 v2"}</strong>{" "}
              <span className="text-muted-foreground">{"使用内置校准后的四层级概率，无需调用 API"}</span>
            </span>
          </Label>
        </SimpleTooltip>
        <Label className="items-start font-normal leading-normal">
          <RadioGroupItem value="llm" className="mt-0.5" />
          <span>
            <strong className="font-semibold">{"LLM 分类器"}</strong>{" "}
            <span className="text-muted-foreground">{"调用模型决定层级，例如轻量快速模型"}</span>
          </span>
        </Label>
        <Label className="items-start font-normal leading-normal">
          <RadioGroupItem value="jev" className="mt-0.5" />
          <span>
            <strong className="font-semibold">{"开源分类器"}</strong>{" "}
            <span className="text-muted-foreground">{"使用 Jev、Laya、Bespoke 或 Databricks 决定层级"}</span>
          </span>
        </Label>
        <SimpleTooltip content={scorerLockedReason}>
          <Label className="items-start font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
            <RadioGroupItem value="heuristic_first" className="mt-0.5" disabled={scorerLocked} />
            <span>
              <strong className="font-semibold">{"启发式优先"}</strong>{" "}
              <span className="text-muted-foreground">{"本地评分，仅在无法确信应使用低成本层级时调用付费分类器"}</span>
            </span>
          </Label>
        </SimpleTooltip>
        <SimpleTooltip content={scorerLockedReason}>
          <Label className="items-start font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
            <RadioGroupItem value="hybrid" className="mt-0.5" disabled={scorerLocked} />
            <span>
              <strong className="font-semibold">{"混合"}</strong>{" "}
              <span className="text-muted-foreground">{"所有层级均保留本地评分，仅在分数接近层级边界时调用付费分类器"}</span>
            </span>
          </Label>
        </SimpleTooltip>
      </div>
    </RadioGroup>
  );
};

export default ClassifierTypeRadios;
