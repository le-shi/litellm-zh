import React from "react";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { Switch } from "@/components/ui/switch";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";

const HousekeepingRoutingControls: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => {
  const enabled = value.route_housekeeping_to_cheapest_tier ?? true;
  const patterns = value.housekeeping_patterns ?? [];
  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <Switch
          checked={enabled}
          onCheckedChange={(next) => onChange({ ...value, route_housekeeping_to_cheapest_tier: next })}
          aria-label={"将辅助任务调用路由到最便宜的层级"}
        />
        <strong className="font-semibold">{"将辅助任务调用路由到最便宜的层级"}</strong>
      </div>
      <span className="mb-3 block text-xs text-muted-foreground">{"生成对话标题等调用跳过分类器，直接使用最便宜的层级。"}</span>
      <strong className="mb-1 block font-semibold">{"附加辅助任务识别标记"}</strong>
      <MultiSelect
        options={patterns.map((pattern) => ({ label: pattern, value: pattern }))}
        value={patterns}
        onValueChange={(next) => onChange({ ...value, housekeeping_patterns: next.length > 0 ? next : undefined })}
        placeholder={"例如 conversation title"}
        emptyText={"输入以添加识别标记"}
        allowCustomValues
        disabled={!enabled}
        className="w-full"
      />
      <span className="mt-1 block text-xs text-muted-foreground">{"追加到内置对话标题识别标记中的字符串，区分大小写。"}{!enabled && " Turn housekeeping routing on for these to take effect."}
      </span>
    </>
  );
};

export default HousekeepingRoutingControls;
