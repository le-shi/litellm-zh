import ClassifierPrimarySettings from "./ClassifierPrimarySettings";
import { AutoRouterAllowanceNote } from "./AutoRouterAvailability";
import { transitionClassifierType } from "./classifier_type_transition";
import JevClassifierConfig from "./JevClassifierConfig";
import { Info } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import React from "react";
import ClassifierPromptEditor from "./ClassifierPromptEditor";
import OpeningPromptEditor, { type OpeningPromptSelection } from "./OpeningPromptEditor";
import { RestrictedSection, restrictedBy } from "./TierRestrictions";
import HeuristicScoringConfig from "./HeuristicScoringConfig";
import ClassifierReasoningEffortSelect from "./ClassifierReasoningEffortSelect";
import ClassifierCircuitBreakerConfig from "./ClassifierCircuitBreakerConfig";
import ClassifierVisionConfig from "./ClassifierVisionConfig";
import { getHeuristicV2SuccessThresholdError } from "./build_complexity_router_config";
import ClassifierPluginTimeoutField from "./ClassifierPluginTimeoutField";
import ClassifierTypeRadios from "./ClassifierTypeRadios";
import { ClassifierMenu, ClassifierOption } from "./AutoRouterClassifierTabs";
import { isHeuristicChain } from "./classifier_types";
import HeuristicKeywordOverrides from "./HeuristicKeywordOverrides";
import type { ReasoningEffort } from "./complexity_router_tiers";
import { useComplexityScorerDefaults } from "@/app/(dashboard)/hooks/autoRouter/useComplexityScorerDefaults";
import {
  ClassifierFallback,
  ClassifierLLMConfig,
  ClassifierType,
  ComplexityRouterConfigValue,
  DEFAULT_CLASSIFIER_CONTEXT_BUDGET_CHARS,
  MIN_QUOTED_CONTEXT_TURN_CHARS,
  DEFAULT_CLASSIFIER_CONTEXT_WINDOW_SIZE,
  DEFAULT_CLASSIFIER_FALLBACK,
  DEFAULT_CLASSIFIER_TIMEOUT_MS,
  DEFAULT_CLASSIFICATION_RUBRIC,
  ClassificationRubric,
  effectiveTierLabel,
  heuristicScoringRole,
  heuristicTuningType,
  usesHeuristicV2,
  usesLlmClassifier,
  usesClassifierContext,
  DEFAULT_HYBRID_BOUNDARY_MARGIN,
  HEURISTIC_FIRST_MAX_TIER_KEYS,
  effectiveClassifierType,
} from "./ComplexityRouterConfig";

const DEFAULT_SCORING_EXPLANATION =
  "The router scores each request across 7 built-in dimensions: token count, code presence, reasoning markers, technical " +
  "terms, simple indicators, multi-step patterns, and question complexity, plus any custom dimensions you add. " +
  "The weighted score determines the tier:";

const HEURISTIC_V2_EXPLANATION =
  "The router estimates success probability for all four tiers with its calibrated model, then selects " +
  "the first tier that meets the success threshold.";

const CLASSIFIER_TIMEOUT_ID = "classifier-timeout-ms";
const CLASSIFIER_CONTEXT_WINDOW_SIZE_ID = "classifier-context-window-size";
const CLASSIFIER_CONTEXT_BUDGET_CHARS_ID = "classifier-context-budget-chars";
const HYBRID_BOUNDARY_MARGIN_ID = "hybrid-boundary-margin";
const HEURISTIC_V2_SUCCESS_THRESHOLD_ID = "heuristic-v2-success-threshold";

/**
 * The three boundaries this card states, as displayed strings, or null until the proxy's shipped defaults
 * have arrived. Kept out of the component so the card cannot state a range the router stopped using, and
 * so the derivation does not add branches to an already dense render.
 */
const boundaryRanges = (
  shipped: Record<string, number> | undefined,
  overrides: Record<string, number> | undefined,
  reasoningOverrideMinScore: number | undefined,
): {
  simpleMedium: string;
  mediumComplex: string;
  complexReasoning: string;
  reasoningOverrideFloor: string;
} | null => {
  const effective: Record<string, number> = { ...shipped, ...overrides };
  const [low, mid, high] = [effective.simple_medium, effective.medium_complex, effective.complex_reasoning];
  if (low === undefined || mid === undefined || high === undefined) return null;
  return {
    simpleMedium: low.toFixed(2),
    mediumComplex: mid.toFixed(2),
    complexReasoning: high.toFixed(2),
    reasoningOverrideFloor: (reasoningOverrideMinScore ?? low).toFixed(2),
  };
};

const HowClassificationWorks: React.FC<{ value: ComplexityRouterConfigValue }> = ({ value }) => {
  // The shipped boundaries come from the proxy, so this card cannot state ranges the router stopped using.
  const { data: scorerDefaults, isError } = useComplexityScorerDefaults();
  const scorerRuns = heuristicScoringRole(value) !== "never";
  const ranges = boundaryRanges(
    scorerDefaults?.tier_boundaries,
    value.tier_boundaries,
    value.reasoning_override_min_score,
  );
  const scorerDefaultsUnavailable = scorerRuns && !ranges && isError;

  if (value.custom_tier_set) return null;

  return (
    <Card className="bg-muted mt-4">
      <CardContent>
        <strong className="block mb-2 font-semibold">{"分类工作原理"}</strong>
        <span className="text-[13px] text-muted-foreground">
          {usesHeuristicV2(value) ? HEURISTIC_V2_EXPLANATION : DEFAULT_SCORING_EXPLANATION}
          {usesHeuristicV2(value) &&
            (isHeuristicChain(value.classifier_type)
              ? " If no tier qualifies, or the local-check policy requires a judge, the judge chooses the tier."
              : " If none qualify, it selects Reasoning. It runs locally with no classifier API call.")}
        </span>
        {scorerRuns && ranges && (
          <ul className="mt-2 pl-5 text-[13px] text-muted-foreground">
            <li>
              <strong>{effectiveTierLabel("SIMPLE", value.tier_labels)}</strong>: Score &lt; {ranges.simpleMedium}
            </li>
            <li>
              <strong>{effectiveTierLabel("MEDIUM", value.tier_labels)}</strong>: Score {ranges.simpleMedium} -{" "}
              {ranges.mediumComplex}
            </li>
            <li>
              <strong>{effectiveTierLabel("COMPLEX", value.tier_labels)}</strong>: Score {ranges.mediumComplex} -{" "}
              {ranges.complexReasoning}
            </li>
            <li>
              <strong>{effectiveTierLabel("REASONING", value.tier_labels)}</strong>: Score &gt;{" "}
              {ranges.complexReasoning} (or 2+ reasoning markers with a score of at least{" "}
              {ranges.reasoningOverrideFloor})
            </li>
          </ul>
        )}
        {scorerDefaultsUnavailable && (
          <span className="text-[13px] block mt-2 text-muted-foreground">{"无法从代理加载层级分数范围。"}</span>
        )}
      </CardContent>
    </Card>
  );
};

interface ClassificationMethodConfigProps {
  jevSection?: "all" | "advanced";
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
  modelOptions: { value: string; label: string }[];
  effortOptionsByModel: Record<string, string[] | null | undefined>;
  customTechnicalKeywords?: string[];
  onCustomTechnicalKeywordsChange?: (keywords: string[]) => void;
  showValidationErrors?: boolean;
  /** The resolved default model - see resolveComplexityDefaultModel. Names and gates the radio. */
  defaultModel?: string;
  advancedOnly?: boolean;
  section?: "selection" | "classifier" | "heuristic";
}

export const InactiveHeuristicV2Threshold: React.FC<Pick<ClassificationMethodConfigProps, "value" | "onChange">> = ({
  value,
  onChange,
}) => {
  const threshold = value.heuristic_v2_success_threshold;
  if (usesHeuristicV2(value) || threshold === undefined) return null;
  const error = getHeuristicV2SuccessThresholdError(threshold);
  if (effectiveClassifierType(value) === "llm" && !error) return null;
  return (
    <section aria-label={"未启用的启发式 v2 阈值"} className="mb-4 space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">{"启发式 v2 成功阈值（未启用）"}{" "}
        <output aria-label={"已保留的启发式 v2 阈值"}>
          {Number.isFinite(threshold) ? threshold : "无效值"}
        </output>
      </p>
      <p className="text-sm text-muted-foreground">{"仅在选择启发式 v2 时使用"}</p>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange({ ...value, heuristic_v2_success_threshold: undefined })}
      >{"清除启发式 v2 阈值"}</Button>
    </section>
  );
};

const ClassificationMethodConfig: React.FC<ClassificationMethodConfigProps> = ({
  value,
  onChange,
  modelOptions,
  effortOptionsByModel,
  customTechnicalKeywords,
  onCustomTechnicalKeywordsChange,
  showValidationErrors = false,
  defaultModel,
  advancedOnly = false,
  jevSection,
  section,
}) => {
  const [draft, setDraft] = React.useState<{ id: string; raw: string } | null>(null);
  const hasDefaultModel = Boolean(defaultModel);
  const classifierType = effectiveClassifierType(value);
  const showSelection = section === undefined || section === "selection";
  const showClassifier = section === undefined || section === "classifier";
  const heuristic = heuristicTuningType(value);
  const showHeuristic = (section === undefined || section === "heuristic") && heuristic !== undefined;
  const showLocalChecks =
    showSelection && advancedOnly && ["llm", "heuristic_first", "hybrid"].includes(classifierType);
  const usesCustomPrompt = Boolean(value.classifier_llm_config?.system_prompt?.trim());
  const contextBudget = value.classifier_context_budget_chars ?? DEFAULT_CLASSIFIER_CONTEXT_BUDGET_CHARS;
  const contextBudgetQuotesNothing = contextBudget > 0 && contextBudget < MIN_QUOTED_CONTEXT_TURN_CHARS;
  const classificationRubric = value.classifier_llm_config?.classification_rubric ?? DEFAULT_CLASSIFICATION_RUBRIC;
  const classifierModel = value.classifier_llm_config?.model ?? "";
  const classifierReasoningEffort = value.classifier_llm_config?.reasoning_effort;
  const explicitlySupportedClassifierEfforts = effortOptionsByModel[classifierModel];
  const successThresholdError = getHeuristicV2SuccessThresholdError(value.heuristic_v2_success_threshold);
  const successThresholdDraft =
    draft?.id === HEURISTIC_V2_SUCCESS_THRESHOLD_ID &&
    Object.is(value.heuristic_v2_success_threshold, draft.raw.trim() === "" ? undefined : Number(draft.raw))
      ? draft.raw
      : null;

  const handleClassifierTypeChange = (classifierType: ClassifierType) => {
    onChange(transitionClassifierType(value, classifierType));
  };

  const handleHeuristicFirstMaxTierChange = (tier: string) => {
    onChange({ ...value, heuristic_first_max_tier: tier });
  };

  const handleHybridBoundaryMarginChange = (raw: string) => {
    setDraft({ id: HYBRID_BOUNDARY_MARGIN_ID, raw });
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    onChange({ ...value, hybrid_boundary_margin: Math.min(1, Math.max(0, parsed)) });
  };

  const handleSuccessThresholdChange = (raw: string) => {
    setDraft({ id: HEURISTIC_V2_SUCCESS_THRESHOLD_ID, raw });
    onChange({
      ...value,
      heuristic_v2_success_threshold: raw.trim() === "" ? undefined : Number(raw),
    });
  };

  // One write for everything the prompt dialog owns. The rubric arrives here rather than through the
  // rubric handler because two onChange calls in one tick would both spread this render's `value`,
  // so whichever landed second would drop the other's edit.
  const handleClassificationPromptChange = ({
    classificationPrompt,
    classificationExamples,
    classificationRubric: selectedRubric,
  }: OpeningPromptSelection) => {
    const rubricConfig: ClassifierLLMConfig = {
      ...value.classifier_llm_config,
      model: value.classifier_llm_config?.model ?? "",
      timeout_ms: value.classifier_llm_config?.timeout_ms ?? DEFAULT_CLASSIFIER_TIMEOUT_MS,
      classification_rubric: selectedRubric,
    };
    const nextValue: ComplexityRouterConfigValue = {
      ...value,
      ...(selectedRubric && { classifier_llm_config: rubricConfig }),
      classification_prompt: classificationPrompt,
      classification_examples: classificationExamples,
    };
    onChange(nextValue);
  };

  const handleClassifierReasoningEffortChange = (reasoningEffort: ReasoningEffort | undefined) => {
    if (!value.classifier_llm_config) return;
    const { reasoning_effort: _reasoningEffort, ...classifierLlmConfig } = value.classifier_llm_config;
    onChange({
      ...value,
      classifier_llm_config:
        reasoningEffort === undefined
          ? classifierLlmConfig
          : { ...classifierLlmConfig, reasoning_effort: reasoningEffort },
    });
  };

  const handleClassifierTimeoutChange = (timeoutMs: number) => {
    onChange({
      ...value,
      classifier_llm_config: {
        ...value.classifier_llm_config,
        model: value.classifier_llm_config?.model ?? "",
        timeout_ms: timeoutMs,
      },
    });
  };

  const handleClassificationRubricChange = (classificationRubric: ClassificationRubric) => {
    onChange({
      ...value,
      classifier_llm_config: {
        ...value.classifier_llm_config,
        model: value.classifier_llm_config?.model ?? "",
        timeout_ms: value.classifier_llm_config?.timeout_ms ?? DEFAULT_CLASSIFIER_TIMEOUT_MS,
        classification_rubric: classificationRubric,
      },
    });
  };

  const handleClassifierSystemPromptChange = (systemPrompt: string | undefined) => {
    onChange({
      ...value,
      classifier_llm_config: {
        ...value.classifier_llm_config,
        model: value.classifier_llm_config?.model ?? "",
        timeout_ms: value.classifier_llm_config?.timeout_ms ?? DEFAULT_CLASSIFIER_TIMEOUT_MS,
        system_prompt: systemPrompt,
      },
    });
  };

  const handleClassifierFallbackChange = (fallback: ClassifierFallback) => {
    onChange({ ...value, classifier_fallback: fallback });
  };

  const handleClassifierContextWindowSizeChange = (windowSize: number) => {
    onChange({
      ...value,
      classifier_context_window_size: windowSize,
    });
  };

  const handleClassifierContextBudgetCharsChange = (budgetChars: number) => {
    onChange({
      ...value,
      classifier_context_budget_chars: budgetChars,
    });
  };

  const handleClassifierIntegerChange = (
    id: string,
    raw: string,
    minimum: number,
    onCommit: (value: number) => void,
  ) => {
    setDraft({ id, raw });
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    onCommit(Math.max(minimum, Math.round(parsed)));
  };

  const handleClassifierContextIncludeAssistantTurnsChange = (includeAssistantTurns: boolean) => {
    onChange({
      ...value,
      classifier_context_include_assistant_turns: includeAssistantTurns,
    });
  };

  return (
    <>
      {!advancedOnly && showSelection && (
        <>
          <ClassifierTypeRadios
            value={value}
            classifierType={classifierType}
            onTypeChange={handleClassifierTypeChange}
          />
          <ClassifierPrimarySettings
            value={value}
            onChange={onChange}
            modelOptions={modelOptions}
            showValidationErrors={showValidationErrors}
          />
        </>
      )}
      {showLocalChecks && (
        <div className="space-y-2">
          <Label htmlFor="auto-router-local-checks">{"评判模型之前的本地检查"}</Label>
          <Select
            items={[
              { value: "llm", label: "Always use the judge" },
              { value: "heuristic_first", label: "Heuristic first" },
              { value: "hybrid", label: "Hybrid" },
            ]}
            value={classifierType}
            onValueChange={(next) => {
              if (next === "llm" || next === "heuristic_first" || next === "hybrid") handleClassifierTypeChange(next);
            }}
          >
            <SelectTrigger id="auto-router-local-checks" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="llm">{"始终使用评判模型"}</SelectItem>
              <SelectItem value="heuristic_first" disabled={Boolean(value.custom_tier_set)}>{"启发式优先"}</SelectItem>
              <SelectItem value="hybrid" disabled={Boolean(value.custom_tier_set)}>{"混合"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {showSelection && isHeuristicChain(classifierType) && (
        <div className="mt-4 space-y-2">
          <Label htmlFor="auto-router-local-heuristic">{"先启发式，再评判"}</Label>
          <ClassifierMenu
            id="auto-router-local-heuristic"
            label={"先启发式，再评判"}
            selectedLabel={value.local_heuristic === "heuristic_v2" ? "Heuristic v2" : "Heuristic v1 (rule-based)"}
            feature={value.local_heuristic === "heuristic_v2" ? "heuristic_v2" : undefined}
            value={value.local_heuristic ?? "heuristic"}
            onValueChange={(next) => {
              if (next === "heuristic" || next === "heuristic_v2") onChange({ ...value, local_heuristic: next });
            }}
          >
            <ClassifierOption
              value="heuristic"
              label={"启发式 v1（基于规则）"}
              description={"使用可配置的权重和关键词为请求评分"}
            />
            <ClassifierOption
              value="heuristic_v2"
              label={"启发式 v2"}
              description={"根据校准后的成功概率选择层级"}
              feature="heuristic_v2"
            />
          </ClassifierMenu>
        </div>
      )}

      {showClassifier && classifierType === "custom" && (
        <ClassifierPluginTimeoutField value={value} onChange={onChange} showValidationErrors={showValidationErrors} />
      )}

      {showHeuristic && heuristic === "heuristic_v2" && (
        <div className="mt-4 space-y-2">
          <Label htmlFor={HEURISTIC_V2_SUCCESS_THRESHOLD_ID} className="block font-semibold">{"成功阈值"}</Label>
          <Input
            id={HEURISTIC_V2_SUCCESS_THRESHOLD_ID}
            type="text"
            inputMode="decimal"
            placeholder={"模型产物默认值"}
            value={successThresholdDraft ?? value.heuristic_v2_success_threshold?.toString() ?? ""}
            onChange={(event) => handleSuccessThresholdChange(event.target.value)}
            onBlur={() => {
              if (!successThresholdError) setDraft(null);
            }}
            aria-invalid={Boolean(successThresholdError)}
            aria-describedby={`${HEURISTIC_V2_SUCCESS_THRESHOLD_ID}-help${successThresholdError ? ` ${HEURISTIC_V2_SUCCESS_THRESHOLD_ID}-error` : ""}`}
          />
          <p id={`${HEURISTIC_V2_SUCCESS_THRESHOLD_ID}-help`} className="text-sm text-muted-foreground">{"最低预测成功概率，取值为 0 到 1。越高越倾向于能力更强的层级。留空使用模型产物默认值"}</p>
          {successThresholdError && (
            <p id={`${HEURISTIC_V2_SUCCESS_THRESHOLD_ID}-error`} className="text-sm text-destructive" role="alert">
              {successThresholdError}
            </p>
          )}
        </div>
      )}

      {showSelection && classifierType === "heuristic_first" && (
        <div className="mt-4 space-y-2">
          <Label htmlFor="auto-router-local-max-tier" className="block font-semibold">{"本地决策上限"}</Label>
          <Select
            value={value.heuristic_first_max_tier}
            onValueChange={(tier: unknown) => handleHeuristicFirstMaxTierChange(tier as string)}
          >
            <SelectTrigger id="auto-router-local-max-tier" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HEURISTIC_FIRST_MAX_TIER_KEYS.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {effectiveTierLabel(tier, value.tier_labels)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {usesHeuristicV2(value)
              ? "达到成功阈值且不高于此上限的层级在本地路由。更高层级或没有符合条件层级的请求交由评判模型"
              : "评分器判断为此层级或更低的请求在本地路由。更高层级或没有启发式信号的请求交由评判模型"}
          </p>
        </div>
      )}

      {showSelection && classifierType === "hybrid" && (
        <div className="mt-4 space-y-2">
          <Label htmlFor={HYBRID_BOUNDARY_MARGIN_ID} className="block font-semibold">
            {usesHeuristicV2(value) ? "成功阈值余量" : "边界余量"}
          </Label>
          <Input
            id={HYBRID_BOUNDARY_MARGIN_ID}
            type="text"
            inputMode="decimal"
            value={
              draft?.id === HYBRID_BOUNDARY_MARGIN_ID
                ? draft.raw
                : String(value.hybrid_boundary_margin ?? DEFAULT_HYBRID_BOUNDARY_MARGIN)
            }
            onChange={(event) => handleHybridBoundaryMarginChange(event.target.value)}
            onBlur={() => setDraft(null)}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            {usesHeuristicV2(value)
              ? "所选层级或更低层级的成功概率与成功阈值之差在此余量内，或没有层级达到阈值时，使用评判模型"
              : "分数与所有层级边界的距离都大于此值时，按评分器的层级路由。距离更近或没有启发式信号时，交由评判模型"}
          </p>
        </div>
      )}

      {showClassifier && classifierType === "jev" && (
        <JevClassifierConfig value={value} onChange={onChange} section={jevSection} />
      )}
      {showClassifier && usesLlmClassifier(classifierType) && (
        <div className="mt-4 space-y-3">
          <ClassifierReasoningEffortSelect
            model={classifierModel}
            value={classifierReasoningEffort}
            explicitlySupported={explicitlySupportedClassifierEfforts}
            onChange={handleClassifierReasoningEffortChange}
          />
          <div>
            <Label htmlFor={CLASSIFIER_TIMEOUT_ID} className="block mb-1 font-semibold">{"超时（毫秒）"}</Label>
            <Input
              id={CLASSIFIER_TIMEOUT_ID}
              type="text"
              inputMode="numeric"
              value={
                draft?.id === CLASSIFIER_TIMEOUT_ID
                  ? draft.raw
                  : String(value.classifier_llm_config?.timeout_ms ?? DEFAULT_CLASSIFIER_TIMEOUT_MS)
              }
              onChange={(event) =>
                handleClassifierIntegerChange(
                  CLASSIFIER_TIMEOUT_ID,
                  event.target.value,
                  1,
                  handleClassifierTimeoutChange,
                )
              }
              onBlur={() => setDraft(null)}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">{"分类器调用允许的时长，超时后使用下方的回退方式。"}</span>
          </div>
          <ClassifierCircuitBreakerConfig
            value={value.classifier_llm_config ?? { model: "", timeout_ms: DEFAULT_CLASSIFIER_TIMEOUT_MS }}
            onChange={(classifier_llm_config) => onChange({ ...value, classifier_llm_config })}
          />
          <ClassifierVisionConfig
            value={value.classifier_llm_config ?? { model: "", timeout_ms: DEFAULT_CLASSIFIER_TIMEOUT_MS }}
            onChange={(classifier_llm_config) => onChange({ ...value, classifier_llm_config })}
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <strong className="font-semibold">{"分类器提示词"}</strong>
              <SimpleTooltip content="Every rubric uses the same four tiers. They differ in the worked examples that show the classifier where the boundary between tiers sits, and the Business rubric also rewrites the tier definitions for business traffic. Pick the rubric, and write your own opening instructions and calibration examples, inside the prompt editor.">
                <Info className="size-4 text-muted-foreground" />
              </SimpleTooltip>
            </div>
            <AutoRouterAllowanceNote
              feature="tier_or_classifier_prompt"
              label={"自定义指令和示例共用自定义层级额度"}
            />
            {!value.custom_tier_set && usesCustomPrompt ? (
              <ClassifierPromptEditor
                systemPrompt={value.classifier_llm_config?.system_prompt}
                onChange={handleClassifierSystemPromptChange}
                contextWindowSize={value.classifier_context_window_size ?? DEFAULT_CLASSIFIER_CONTEXT_WINDOW_SIZE}
                tierLabels={value.tier_labels}
                classificationRubric={classificationRubric}
              />
            ) : (
              <OpeningPromptEditor
                classificationPrompt={value.classification_prompt}
                classificationExamples={value.classification_examples}
                onChange={handleClassificationPromptChange}
                tierSource={
                  value.custom_tier_set
                    ? { kind: "custom", tierRows: value.custom_tier_set.tiers }
                    : {
                        kind: "builtIn",
                        tierLabels: value.tier_labels,
                        classificationRubric,
                        rubricRestriction: restrictedBy(value, "classificationRubric")?.reason,
                      }
                }
                contextWindowSize={value.classifier_context_window_size ?? DEFAULT_CLASSIFIER_CONTEXT_WINDOW_SIZE}
              />
            )}
          </div>
        </div>
      )}
      {showClassifier && usesClassifierContext(classifierType) && (
        <div className="mt-4 space-y-3">
          <RestrictedSection heading="If the classifier fails" by={restrictedBy(value, "classifierFallback")}>
            <RadioGroup
              value={value.classifier_fallback ?? DEFAULT_CLASSIFIER_FALLBACK}
              onValueChange={(fallback: unknown) => handleClassifierFallbackChange(fallback as ClassifierFallback)}
            >
              <div className="inline-flex flex-col gap-2">
                <Label className="items-start font-normal leading-normal">
                  <RadioGroupItem value="heuristic" className="mt-0.5" />
                  <span>
                    <span>{"使用启发式评分"}</span>{" "}
                    <span className="text-muted-foreground">{"适用于分类器同样评估复杂度的情况"}</span>
                  </span>
                </Label>
                <Label className="items-start font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
                  <RadioGroupItem value="default_model" disabled={!hasDefaultModel} className="mt-0.5" />
                  <SimpleTooltip
                    content={
                      hasDefaultModel
                        ? "Change it from the Default Model select."
                        : "Set a default model on this router to use this option"
                    }
                  >
                    <span>
                      <span>{"路由到默认模型"}{defaultModel ? ` (${defaultModel})` : ""}</span>{" "}
                      <span className="text-muted-foreground">{"适用于提示词评估的内容不是复杂度的情况"}</span>
                    </span>
                  </SimpleTooltip>
                </Label>
              </div>
            </RadioGroup>
            <span className="block text-xs text-muted-foreground">{"分类器调用失败、超时或返回无法解析的响应时使用。"}</span>
          </RestrictedSection>
          <div>
            <Label htmlFor={CLASSIFIER_CONTEXT_WINDOW_SIZE_ID} className="block mb-1 font-semibold">{"上下文轮数"}</Label>
            <Input
              id={CLASSIFIER_CONTEXT_WINDOW_SIZE_ID}
              type="text"
              inputMode="numeric"
              value={
                draft?.id === CLASSIFIER_CONTEXT_WINDOW_SIZE_ID
                  ? draft.raw
                  : String(value.classifier_context_window_size ?? DEFAULT_CLASSIFIER_CONTEXT_WINDOW_SIZE)
              }
              onChange={(event) =>
                handleClassifierIntegerChange(
                  CLASSIFIER_CONTEXT_WINDOW_SIZE_ID,
                  event.target.value,
                  0,
                  handleClassifierContextWindowSizeChange,
                )
              }
              onBlur={() => setDraft(null)}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">{"发送给分类器提供商的历史用户轮数，不包含工具输出和框架提醒。LLM 和决策模型分类器默认使用 3 轮。设为 0 可不发送历史对话，当前消息和选定的系统文本仍会发送。"}</span>
          </div>
          <div>
            <Label htmlFor={CLASSIFIER_CONTEXT_BUDGET_CHARS_ID} className="block mb-1 font-semibold">{"上下文字符预算"}</Label>
            <Input
              id={CLASSIFIER_CONTEXT_BUDGET_CHARS_ID}
              type="text"
              inputMode="numeric"
              value={
                draft?.id === CLASSIFIER_CONTEXT_BUDGET_CHARS_ID
                  ? draft.raw
                  : String(value.classifier_context_budget_chars ?? DEFAULT_CLASSIFIER_CONTEXT_BUDGET_CHARS)
              }
              onChange={(event) =>
                handleClassifierIntegerChange(
                  CLASSIFIER_CONTEXT_BUDGET_CHARS_ID,
                  event.target.value,
                  0,
                  handleClassifierContextBudgetCharsChange,
                )
              }
              onBlur={() => setDraft(null)}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">{"发送给分类器的历史对话字符总数。优先选取最新轮次，能容纳时保留整轮内容，不会截断较短的对话。"}</span>
            {contextBudgetQuotesNothing && (
              <span className="block text-xs text-destructive">
                Under {MIN_QUOTED_CONTEXT_TURN_CHARS} characters there is no room to quote a turn that does not already
                fit, so a long conversation reaches the classifier with no context at all. Set Context Window Size to 0
                to turn context off deliberately.
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Switch
                checked={value.classifier_context_include_assistant_turns ?? false}
                onCheckedChange={handleClassifierContextIncludeAssistantTurnsChange}
                size="sm"
                aria-label={"包含助手轮次"}
              />
              <strong className="font-semibold">{"包含助手轮次"}</strong>
              <SimpleTooltip content="Off by default. Enabling it changes tier decisions, and therefore spend, for an existing router, and sends assistant text to the classifier model, which may be a different provider than the routed model.">
                <Info className="size-4 text-muted-foreground" />
              </SimpleTooltip>
            </div>
            <span className="text-xs text-muted-foreground">
              Let the classifier read the assistant&apos;s replies, so difficulty the model stated rather than the user
              stays visible: a plan the assistant calls complex, approved with &quot;yes&quot;, is classified on the
              work being approved. Context Window Size then counts the last N turns across both roles rather than the
              last N user turns.
            </span>
          </div>
        </div>
      )}

      {showHeuristic && heuristic === "heuristic" && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-1">
            <strong className="font-semibold">{"自定义技术关键词"}</strong>
            <SimpleTooltip content="Domain-specific terms appended to the built-in technical keyword list. Prompts containing these terms score higher on the technical dimension and route to more capable models.">
              <Info className="size-4 text-muted-foreground" />
            </SimpleTooltip>
          </div>
          <span className="block mb-2 text-xs text-muted-foreground">{"可选。向内置列表添加术语以提高技术维度分类准确性，例如 udp、kafka、terraform。"}</span>
          <MultiSelect
            options={(customTechnicalKeywords ?? []).map((keyword) => ({ label: keyword, value: keyword }))}
            value={customTechnicalKeywords ?? []}
            onValueChange={(keywords: string[]) =>
              onCustomTechnicalKeywordsChange?.(
                Array.from(
                  new Set(keywords.flatMap((keyword) => keyword.split(",").map((part) => part.trim())).filter(Boolean)),
                ),
              )
            }
            placeholder={"输入关键词并按回车"}
            emptyText={"输入以添加关键词"}
            allowCustomValues
            className="w-full"
          />
        </div>
      )}

      {showHeuristic && heuristic === "heuristic" && (
        <>
          {heuristicScoringRole(value) === "decides" && (
            <AutoRouterAllowanceNote feature="heuristic_tuning" label={"自定义评分规则"} />
          )}
          <HeuristicScoringConfig value={value} onChange={onChange} />
          <section className="mt-4 space-y-3">
            <h4 className="font-semibold">{"启发式关键词覆盖"}</h4>
            <HeuristicKeywordOverrides value={value} onChange={onChange} />
          </section>
        </>
      )}
      {showHeuristic && <HowClassificationWorks value={value} />}
    </>
  );
};

export default ClassificationMethodConfig;
