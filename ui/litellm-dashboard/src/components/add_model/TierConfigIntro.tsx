import React from "react";

import { type ComplexityRouterConfigValue, usesLlmClassifier } from "./ComplexityRouterConfig";
import { restrictedBy } from "./TierRestrictions";

const TierConfigIntro: React.FC<{ value: ComplexityRouterConfigValue }> = ({ value }) => (
  <div className="mb-4 space-y-2 text-sm text-muted-foreground">
    <p>{"为每个层级选择一个或多个模型，请求使用其所属层级的模型"}</p>
    <p className="text-xs">
      {restrictedBy(value, "displayNames")?.reason ?? "Display names appear in the dashboard and spend logs"}
      {!value.custom_tier_set &&
        usesLlmClassifier(value.classifier_type) &&
        ". Your judge model also uses these names to classify requests"}
    </p>
  </div>
);

export default TierConfigIntro;
