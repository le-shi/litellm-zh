import React, { useId } from "react";
import { AutoRouterAllowanceNote } from "./AutoRouterAvailability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ClassifierCircuitBreakerConfig from "./ClassifierCircuitBreakerConfig";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { defaultJevClassifierConfig, fixedClassifierModels } from "./jev_classifier_config";

const providerDescriptions = {
  jev: "Uses TypeSafe System One Choice evaluation with your configured tiers",
  laya: "Uses Laya with your configured tiers. Set LAYA_API_BASE on the gateway to connect your Laya server.",
  bespoke:
    "Uses Bespoke Nimble with your configured tiers. Set BESPOKE_API_BASE on the gateway to connect your Nimble server.",
  databricks:
    "Uses the Databricks ai_decide AI Function, or a decision serving endpoint you name, with your configured tiers. Set DATABRICKS_API_BASE to https://<workspace-host>/serving-endpoints and DATABRICKS_API_KEY on the gateway.",
};

export default function JevClassifierConfig({
  value,
  onChange,
  section = "all",
}: {
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
  section?: "all" | "model" | "advanced";
}) {
  const id = useId();
  const config = value.jev_classifier_config ?? defaultJevClassifierConfig();
  const models = fixedClassifierModels(config.provider);
  const update = (patch: Partial<typeof config>) =>
    onChange({ ...value, jev_classifier_config: { ...config, ...patch } });

  return (
    <div className={section === "model" ? "space-y-3" : "mt-4 space-y-3"}>
      {section !== "advanced" && !config.deployment_name && (
        <>
          <p className="text-sm text-muted-foreground">{providerDescriptions[config.provider ?? "jev"]}</p>
          <div className="space-y-2">
            <Label htmlFor={`${id}-model`}>{"分类器模型"}</Label>
            {models ? (
              <Select value={config.model} onValueChange={(model) => model && update({ model })}>
                <SelectTrigger id={`${id}-model`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={`${id}-model`}
                value={config.model}
                placeholder={
                  config.provider === "databricks"
                    ? "ai_decide，或服务终结点名称，例如 databricks-openjev-qwen35-4b"
                    : undefined
                }
                onChange={(event) => update({ model: event.target.value })}
              />
            )}
          </div>
        </>
      )}
      {section !== "model" && (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${id}-timeout`}>{"分类器超时（毫秒）"}</Label>
            <Input
              id={`${id}-timeout`}
              type="number"
              min={1}
              step={1}
              value={config.timeout_ms}
              onChange={(event) => update({ timeout_ms: Number(event.target.value) })}
            />
          </div>
          <ClassifierCircuitBreakerConfig
            value={config}
            onChange={(next) =>
              update({
                circuit_breaker_enabled: next.circuit_breaker_enabled,
                circuit_breaker_cooldown_seconds: next.circuit_breaker_cooldown_seconds,
              })
            }
          />
          <div className="space-y-2">
            <Label htmlFor={`${id}-instructions`}>{"分类器指令"}</Label>
            <AutoRouterAllowanceNote
              feature="tier_or_classifier_prompt"
              label={"自定义指令共用自定义层级额度"}
            />
            <Textarea
              id={`${id}-instructions`}
              value={config.instructions ?? ""}
              placeholder={"留空使用内置指令"}
              onChange={(event) => update({ instructions: event.target.value || undefined })}
            />
            {config.instructions && (
              <Button variant="outline" type="button" onClick={() => update({ instructions: undefined })}>{"恢复内置指令"}</Button>
            )}
            <p className="text-xs text-muted-foreground">{"内置决策模型分类无需许可证，使用内置层级标准"}</p>
          </div>
        </>
      )}
    </div>
  );
}
