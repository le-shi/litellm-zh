import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import React from "react";
import {
  AdaptiveEligible,
  ComplexityRouterConfigValue,
  DEFAULT_ADAPTIVE_WEIGHTS,
  DEFAULT_TIER_DISTANCE_PENALTY,
} from "./ComplexityRouterConfig";

interface AdaptiveRoutingConfigProps {
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}

const AdaptiveRoutingConfig: React.FC<AdaptiveRoutingConfigProps> = ({ value, onChange }) => {
  const adaptiveWeights = value.adaptive_weights ?? DEFAULT_ADAPTIVE_WEIGHTS;
  const adaptiveEligible = value.adaptive_eligible ?? "all";
  const tierDistancePenalty = value.tier_distance_penalty ?? DEFAULT_TIER_DISTANCE_PENALTY;

  const handleAdaptiveToggle = (adaptive: boolean) => {
    const nextValue: ComplexityRouterConfigValue = {
      ...value,
      adaptive,
      adaptive_weights: adaptiveWeights,
      adaptive_eligible: adaptiveEligible,
      tier_distance_penalty: tierDistancePenalty,
    };
    onChange(nextValue);
  };

  const handleQualityWeightChange = (qualityPercent: number) => {
    const quality = qualityPercent / 100;
    onChange({ ...value, adaptive_weights: { quality, cost: Math.round((1 - quality) * 100) / 100 } });
  };

  const handleAdaptiveEligibleChange = (eligible: AdaptiveEligible) => {
    onChange({ ...value, adaptive_eligible: eligible });
  };

  const handleTierDistancePenaltyChange = (penalty: number | null) => {
    onChange({ ...value, tier_distance_penalty: penalty ?? DEFAULT_TIER_DISTANCE_PENALTY });
  };

  return (
    <>
      <Label className="mb-2">
        <Switch checked={value.adaptive ?? false} onCheckedChange={handleAdaptiveToggle} />
        <strong className="font-semibold">{"启用自适应多臂老虎机选择"}</strong>
      </Label>
      <span className="block text-xs text-muted-foreground">{"关闭后，每个请求始终使用其分类层级所指定的模型。"}</span>

      <Card className="bg-muted mt-4">
        <CardContent>
          <strong className="mb-2 block font-semibold">{"自适应路由工作原理"}</strong>
          <span className="text-[13px] text-muted-foreground">
            It learns from how each conversation actually goes: does the user have to rephrase or correct the model,
            does it get stuck repeating itself, does it run out of tool calls, does the user seem satisfied. Combined
            with cost, this live feedback shifts future routing toward the models that are actually working well, and
            improves as more conversations come in. Until there&apos;s enough feedback, it defaults to the classified
            tier&apos;s model.
          </span>
        </CardContent>
      </Card>

      {value.adaptive && (
        <div className="mt-4 space-y-4">
          <div>
            <strong className="mb-1 block font-semibold">
              Quality vs. Cost ({Math.round(adaptiveWeights.quality * 100)}% quality /{" "}
              {Math.round(adaptiveWeights.cost * 100)}% cost)
            </strong>
            <Slider
              aria-label={"质量与成本权衡"}
              min={0}
              max={100}
              value={[Math.round(adaptiveWeights.quality * 100)]}
              onValueChange={(next) => handleQualityWeightChange(Array.isArray(next) ? next[0] : next)}
            />
            <span className="text-xs text-muted-foreground">{"质量权重越高，越偏向能力更强、价格更高的模型；成本权重越高，在有反馈可供决策时越偏向便宜的模型。建议质量占 30%，成本占 70%。"}</span>
          </div>

          <div>
            <strong className="mb-1 block font-semibold">{"可选模型池"}</strong>
            <RadioGroup
              value={adaptiveEligible}
              onValueChange={(eligible: unknown) => handleAdaptiveEligibleChange(eligible as AdaptiveEligible)}
              className="w-full"
            >
              <div className="flex w-full flex-col items-start gap-2">
                <Label className="items-start font-normal leading-normal">
                  <RadioGroupItem value="all" className="mt-0.5" />
                  <span>
                    <strong className="font-semibold">{"所有层级（软性下限）"}</strong>{" "}
                    <span className="text-muted-foreground">{"路由器可以跨层级选择最适合提示词的模型"}</span>
                  </span>
                </Label>
                <Label className="items-start font-normal leading-normal">
                  <RadioGroupItem value="classified_tier" className="mt-0.5" />
                  <span>
                    <strong className="font-semibold">{"仅使用分类层级"}</strong>{" "}
                    <span className="text-muted-foreground">{"路由器只能选择该层级内的模型"}</span>
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {adaptiveEligible === "all" && (
            <div>
              <strong className="mb-1 block font-semibold">{"跨层级惩罚"}</strong>
              <Input
                type="number"
                value={tierDistancePenalty}
                onChange={(event) =>
                  handleTierDistancePenaltyChange(event.target.value === "" ? null : event.target.valueAsNumber)
                }
                min={0}
                step={0.1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">{"每偏离分类结果一个层级，扣除的分数。"}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AdaptiveRoutingConfig;
