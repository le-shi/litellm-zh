import React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FuseProfilePresets from "./FuseProfilePresets";
import { Switch } from "@/components/ui/switch";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { MultiSelect } from "@/components/shared/MultiSelect";
import {
  type ComplexityRouterConfigValue,
  type ClassificationFrequency,
  classificationFrequency,
  withClassificationFrequency,
  DEFAULT_CLASSIFIER_TIMEOUT_MS,
} from "./ComplexityRouterConfig";
import {
  forecastTierNames,
  forecastModels,
  getForecastConfigError,
  newCapabilitySettings,
  newFuseSettings,
  type CapabilitySettings,
  type FuseSettings,
} from "./forecast_classifier_config";
import ClassifierReasoningEffortSelect from "./ClassifierReasoningEffortSelect";
import ClassifierCircuitBreakerConfig from "./ClassifierCircuitBreakerConfig";
import ClassifierVisionConfig from "./ClassifierVisionConfig";
import TierModelEffortRows from "./TierModelEffortRows";
import { activeTierRows } from "./tier_rows";
import { setTierModels } from "./tier_set_actions";
import { tierRowLabel, setTierModelParam, setTierModelReasoningEffort } from "./complexity_router_tiers";

interface Props {
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
  modelOptions: { value: string; label: string }[];
  effortOptionsByModel: Record<string, string[] | null | undefined>;
  section?: "all" | "required" | "advanced";
}

const NumberField = ({
  label,
  value,
  onChange,
  min,
  max,
  step = "any",
  help,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  help?: string;
}) => {
  const id = React.useId();
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
      />
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
};

export const ForecastSolverModels = ({
  value,
  onChange,
  modelOptions,
  effortOptionsByModel,
  fastModeByModel,
  additionalPoolsOnly = false,
}: Props & { fastModeByModel: Record<string, boolean>; additionalPoolsOnly?: boolean }) => {
  const id = React.useId();
  const names = forecastTierNames(value);
  const additionalRows =
    value.classifier_type === "capability"
      ? activeTierRows(value)
          .filter((row) => !names.includes(row.id) && row.models.length > 0)
          .map((row) => ({ tier: row.id, label: `${tierRowLabel(row, value.tier_labels)} routing pool` }))
      : [];
  const rows = additionalPoolsOnly
    ? additionalRows
    : names.map((tier, index) => ({ tier, label: index === 0 ? "Efficient solver" : "Capable solver" }));
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg border p-4 space-y-4">
      {rows.map(({ tier, label }) => {
        const models = forecastModels(value.tiers, tier);
        const setModels = (next: string[]) => onChange(setTierModels(value, tier, next));
        return (
          <div key={tier} className="space-y-2">
            <Label htmlFor={`${id}-${tier}`} className="block text-sm font-semibold">
              {label}
            </Label>
            {value.classifier_type === "llm_v2" ? (
              <SearchSelect
                options={modelOptions}
                inputId={`${id}-${tier}`}
                value={models[0] ?? ""}
                aria-label={label}
                placeholder={`Select ${label.toLowerCase()}`}
                onValueChange={(model) => setModels(model ? [model] : [])}
              />
            ) : (
              <MultiSelect
                options={modelOptions}
                id={`${id}-${tier}`}
                value={models}
                onValueChange={setModels}
                placeholder={`Select ${label.toLowerCase()} models`}
              />
            )}
            <TierModelEffortRows
              tierLabel={label}
              models={models}
              effortOptionsByModel={Object.fromEntries(
                Object.entries(effortOptionsByModel).map(([model, efforts]) => [model, efforts ?? []]),
              )}
              paramsByModel={value.tier_model_params?.[tier] ?? {}}
              fastModeByModel={fastModeByModel}
              onFastModeChange={(model, enabled) =>
                onChange({
                  ...value,
                  tier_model_params: setTierModelParam(value.tier_model_params, tier, model, [
                    "speed",
                    enabled ? "fast" : undefined,
                  ]),
                })
              }
              onEffortChange={(model, effort) =>
                onChange({
                  ...value,
                  tier_model_params: setTierModelReasoningEffort(value.tier_model_params, tier, model, effort),
                })
              }
            />
          </div>
        );
      })}
      {!additionalPoolsOnly && (
        <p className="text-sm text-muted-foreground">{"预测无效或分类器失败时路由到高能力求解模型"}</p>
      )}
    </div>
  );
};

const CalibrationFields = ({
  label,
  value,
  onChange,
  bounded = false,
}: {
  label: string;
  bounded?: boolean;
  value: { slope: number; intercept: number };
  onChange: (value: { slope: number; intercept: number }) => void;
}) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <NumberField
      label={`${label} slope`}
      value={value.slope}
      min={0}
      max={bounded ? 20 : undefined}
      onChange={(slope) => onChange({ ...value, slope })}
    />
    <NumberField
      label={`${label} intercept`}
      value={value.intercept}
      min={bounded ? -20 : undefined}
      max={bounded ? 20 : undefined}
      onChange={(intercept) => onChange({ ...value, intercept })}
    />
  </div>
);

const emptyCoefficients = () => ({ slope: Number.NaN, intercept: Number.NaN });

const ForecastClassifierConfig = ({ value, onChange, modelOptions, effortOptionsByModel, section = "all" }: Props) => {
  const id = React.useId();
  const isCapability = value.classifier_type === "capability";
  const capability = value.capability_classifier_config ?? newCapabilitySettings();
  const fuse = value.llm_v2_config ?? newFuseSettings();
  const config = isCapability ? capability : fuse;
  const llm = value.classifier_llm_config ?? { model: "", timeout_ms: DEFAULT_CLASSIFIER_TIMEOUT_MS };
  const updateCapability = (next: CapabilitySettings) => onChange({ ...value, capability_classifier_config: next });
  const updateFuse = (next: FuseSettings) => onChange({ ...value, llm_v2_config: next });
  const updateTransport = (patch: { max_output_tokens?: number; response_format?: "json_schema" | "json_object" }) =>
    isCapability ? updateCapability({ ...capability, ...patch }) : updateFuse({ ...fuse, ...patch });
  const setCalibrationVersion = (version: string) => {
    if (isCapability && capability.calibration)
      updateCapability({ ...capability, calibration: { ...capability.calibration, version } });
    if (!isCapability && fuse.calibration) updateFuse({ ...fuse, calibration: { ...fuse.calibration, version } });
  };
  const error = getForecastConfigError(value);
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        {isCapability
          ? "使用内置能力说明预测高效求解模型能否完成任务"
          : "预测两个求解模型的成功率，并在预计质量差距处于允许范围内时选择高效模型"}
      </p>
      {section === "all" && (
        <>
          <div className="space-y-1">
            <Label htmlFor={`${id}-judge`}>{"评判模型"}</Label>
            <SearchSelect
              inputId={`${id}-judge`}
              aria-label={"评判模型"}
              options={modelOptions}
              value={llm.model}
              placeholder={"选择评判模型"}
              onValueChange={(model) => {
                if (model === llm.model) return;
                onChange({
                  ...value,
                  classifier_llm_config: { ...llm, model: model ?? "", reasoning_effort: undefined },
                });
              }}
            />
          </div>
        </>
      )}
      {section !== "advanced" && (
        <>
          {isCapability ? (
            <>
              <NumberField
                label={"求解成功概率阈值"}
                value={capability.base_threshold}
                min={0}
                max={1}
                help="Minimum estimated chance of whole-task success required to use the efficient solver"
                onChange={(base_threshold) => updateCapability({ ...capability, base_threshold })}
              />
            </>
          ) : (
            <>
              <FuseProfilePresets value={fuse} onChange={updateFuse} />
              <NumberField
                label={"最大质量差距"}
                value={fuse.max_quality_gap}
                min={0}
                max={1}
                help="Allowed difference between capable and efficient success probabilities, from 0 to 1. Tune on held-out tasks from your workload; this estimate is not a measured quality guarantee. A gap of 0 still selects efficient on tied or higher forecasts. Route directly to one model to avoid judging when you do not want model selection"
                onChange={(max_quality_gap) => updateFuse({ ...fuse, max_quality_gap })}
              />
            </>
          )}
        </>
      )}
      {section !== "required" && (
        <Collapsible
          open={section === "advanced" ? true : undefined}
          className={section === "advanced" ? undefined : "rounded-lg border"}
        >
          {section === "all" && (
            <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left font-medium">
              <ChevronRight className="size-4 transition-transform group-data-panel-open:rotate-90" />{"分类器选项"}</CollapsibleTrigger>
          )}
          <CollapsibleContent className="space-y-4 px-4 pb-4">
            <ClassifierReasoningEffortSelect
              model={llm.model}
              value={llm.reasoning_effort}
              explicitlySupported={effortOptionsByModel[llm.model]}
              onChange={(reasoning_effort) =>
                onChange({ ...value, classifier_llm_config: { ...llm, reasoning_effort } })
              }
            />
            <NumberField
              label={"超时（毫秒）"}
              min={1}
              step={1}
              value={llm.timeout_ms}
              help="Allow enough time for the judge to produce its forecast"
              onChange={(timeout_ms) => onChange({ ...value, classifier_llm_config: { ...llm, timeout_ms } })}
            />
            <ClassifierCircuitBreakerConfig
              value={llm}
              onChange={(classifier_llm_config) => onChange({ ...value, classifier_llm_config })}
            />
            <ClassifierVisionConfig
              value={llm}
              onChange={(classifier_llm_config) => onChange({ ...value, classifier_llm_config })}
            />
            {isCapability && (
              <NumberField
                label={"能力边界步长"}
                value={capability.threshold_step ?? 0}
                min={0}
                max={0.5}
                help="Added once for uncertain or unmatched tasks and twice for unsupported tasks; the final threshold cannot exceed 1"
                onChange={(threshold_step) => updateCapability({ ...capability, threshold_step })}
              />
            )}
            <NumberField
              label={"分类器输出 Token 上限"}
              min={1}
              step={1}
              value={config.max_output_tokens ?? (isCapability ? 4096 : 1024)}
              onChange={(max_output_tokens) => updateTransport({ max_output_tokens })}
            />
            <div className="space-y-1">
              <Label htmlFor={`${id}-format`}>{"预测响应格式"}</Label>
              <SearchSelect
                inputId={`${id}-format`}
                aria-label={"预测响应格式"}
                value={config.response_format ?? "json_schema"}
                allowClear={false}
                options={[
                  { value: "json_schema", label: "Strict JSON schema" },
                  { value: "json_object", label: "JSON object (for judges without strict schema support)" },
                ]}
                onValueChange={(response_format) => {
                  if (response_format === "json_schema" || response_format === "json_object")
                    updateTransport({ response_format });
                }}
              />
            </div>
            <div className="space-y-3 rounded-md border p-3">
              <Label>
                <Switch
                  checked={Boolean(config.calibration)}
                  onCheckedChange={(enabled) =>
                    isCapability
                      ? updateCapability({
                          ...capability,
                          calibration: enabled ? { version: "", ...emptyCoefficients() } : undefined,
                        })
                      : updateFuse({
                          ...fuse,
                          calibration: enabled
                            ? {
                                version: "",
                                prompt_version: "llm-v2-1",
                                efficient: emptyCoefficients(),
                                capable: emptyCoefficients(),
                              }
                            : undefined,
                        })
                  }
                />{"使用拟合校准"}</Label>
              <p className="text-xs text-muted-foreground">{"可选，针对评判模型、求解模型和运行框架拟合的系数。关闭时使用原始预测"}</p>
              {config.calibration && (
                <div className="space-y-1">
                  <Label htmlFor={`${id}-version`}>{"校准版本"}</Label>
                  <Input
                    id={`${id}-version`}
                    value={config.calibration.version}
                    maxLength={isCapability ? 128 : 512}
                    onChange={(event) => setCalibrationVersion(event.target.value)}
                  />
                </div>
              )}
              {isCapability && capability.calibration && (
                <CalibrationFields
                  label={"高效"}
                  bounded
                  value={capability.calibration}
                  onChange={(next) =>
                    updateCapability({
                      ...capability,
                      calibration: { version: capability.calibration?.version ?? "", ...next },
                    })
                  }
                />
              )}
              {!isCapability &&
                fuse.calibration &&
                (["efficient", "capable"] as const).map((role) => (
                  <CalibrationFields
                    key={role}
                    label={role === "efficient" ? "高效" : "高能力"}
                    value={fuse.calibration![role]}
                    onChange={(next) => {
                      if (fuse.calibration) updateFuse({ ...fuse, calibration: { ...fuse.calibration, [role]: next } });
                    }}
                  />
                ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      {section === "all" && (
        <>
          <div className="space-y-1">
            <Label htmlFor={`${id}-frequency`}>{"分类频率"}</Label>
            <SearchSelect
              inputId={`${id}-frequency`}
              aria-label={"分类频率"}
              value={classificationFrequency(value)}
              allowClear={false}
              options={[
                { value: "every_request", label: "Every request" },
                { value: "user_turn", label: "Every new user message" },
                { value: "session", label: "Once per session" },
              ]}
              onValueChange={(frequency) => {
                if (frequency) onChange(withClassificationFrequency(value, frequency as ClassificationFrequency));
              }}
            />
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground">{"分类器使用内置提示词，并始终回退到高能力求解模型"}</p>
      {section !== "advanced" && error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};

export default ForecastClassifierConfig;
