import React from "react";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/shared/MultiSelect";
import TierRowSelect from "./TierRowSelect";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";

const PlanModeOverrideControls: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
  planModeTierOptions: { value: string; label: string }[];
}> = ({ value, onChange, planModeTierOptions }) => (
  <>
    <div className="flex items-center gap-2 mb-2">
      <Switch
        checked={value.plan_mode_min_tier !== undefined}
        disabled={planModeTierOptions.length === 0}
        onCheckedChange={(enabled) =>
          onChange({
            ...value,
            plan_mode_min_tier: enabled ? planModeTierOptions.at(-1)?.value : undefined,
          })
        }
        aria-label={"为计划模式请求设置最低层级"}
      />
      <strong className="font-semibold">{"为计划模式请求设置最低层级"}</strong>
    </div>
    <span className="block text-xs mb-3 text-muted-foreground">{"来自计划模式下编程智能体的请求（Claude Code、GitHub Copilot）至少使用此层级。分类器选择更高层级时仍优先，覆盖仅在计划模式期间生效。"}{planModeTierOptions.length === 0 && " Add models to a tier to enable this."}
    </span>
    {value.plan_mode_min_tier !== undefined && (
      <div style={{ maxWidth: 320 }}>
        <TierRowSelect
          label={"计划模式最低层级"}
          options={planModeTierOptions}
          value={value.plan_mode_min_tier ?? null}
          onValueChange={(tier) => onChange({ ...value, plan_mode_min_tier: tier })}
        />
      </div>
    )}
    <div className="mt-4">
      <strong className="mb-1 block font-semibold">{"附加计划模式识别标记"}</strong>
      <MultiSelect
        options={(value.plan_mode_patterns ?? []).map((pattern) => ({ label: pattern, value: pattern }))}
        value={value.plan_mode_patterns ?? []}
        onValueChange={(patterns) =>
          onChange({ ...value, plan_mode_patterns: patterns.length > 0 ? patterns : undefined })
        }
        placeholder={"例如 enter plan mode"}
        emptyText={"输入以添加识别标记"}
        allowCustomValues
        className="w-full"
      />
      <span className="mt-1 block text-xs text-muted-foreground">{"追加到 Claude Code 和 Copilot 内置计划模式标记中的字符串，区分大小写。"}</span>
    </div>
  </>
);

export default PlanModeOverrideControls;
