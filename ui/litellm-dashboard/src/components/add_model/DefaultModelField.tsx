import React from "react";
import { Info } from "lucide-react";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { SimpleTooltip } from "@/components/ui/tooltip";
import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";
import { isForecastClassifier } from "./forecast_classifier_config";
import { resolveComplexityDefaultModel } from "./tier_rows";

interface DefaultModelFieldProps {
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
  modelOptions: { value: string; label: string }[];
}

const defaultModelPlaceholderFor = (derivedDefaultModel: string | undefined, isCustomSet: boolean): string => {
  if (derivedDefaultModel) return `Derived from tiers: ${derivedDefaultModel}`;
  return isCustomSet ? "Add a model to your fallback tier" : "Add a model to the Simple or Medium tier";
};

const DefaultModelField = ({ value, onChange, modelOptions }: DefaultModelFieldProps) => {
  const defaultModelPlaceholder = defaultModelPlaceholderFor(
    resolveComplexityDefaultModel(value),
    Boolean(value.custom_tier_set),
  );
  // Clearing the select drops the key entirely rather than storing "", so an emptied pin reads as
  // "track the tiers" everywhere downstream instead of as a blank model name.
  const handleDefaultModelChange = (model: string | null | undefined) => {
    onChange({ ...value, default_model: model || undefined });
  };

  return (
    <div className="mt-4 mb-2" role="group" aria-label={"默认模型配置"}>
      <div className="flex items-center gap-2 mb-2">
        <strong className="text-base font-semibold">{"默认模型"}</strong>
        <SimpleTooltip content="Leave empty to follow the tiers. A model chosen here is pinned: it stays the default however the tiers change.">
          <Info className="size-4 text-muted-foreground" />
        </SimpleTooltip>
      </div>
      <SearchSelect
        options={modelOptions}
        value={value.default_model ?? ""}
        onValueChange={handleDefaultModelChange}
        placeholder={defaultModelPlaceholder}
        emptyText={"未找到模型"}
        aria-label={"默认模型"}
      />
      <span className="block mt-1 text-xs text-muted-foreground">
        {isForecastClassifier(value.classifier_type)
          ? "路由无法找到合适模型时使用。分类器失败时路由到高能力求解模型。"
          : "请求对应的层级没有模型，或选择路由到默认模型且分类器失败时使用。"}
      </span>
    </div>
  );
};

export default DefaultModelField;
