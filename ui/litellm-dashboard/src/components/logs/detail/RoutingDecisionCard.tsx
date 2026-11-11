"use client";

import { Waypoints } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cva.config";

export interface RoutingDecisionTierBoundaries {
  simple_medium?: number;
  medium_complex?: number;
  complex_reasoning?: number;
}

export interface RoutingDecision {
  router_model_name?: string;
  router_type?: string;
  routed_model?: string;
  cause?: string;
  tier?: string;
  tier_label?: string;
  request_type?: string;
  score?: number;
  signals?: string[];
  matched_keyword?: string;
  escalation_keyword?: string;
  classifier_model?: string;
  classifier_p_solve?: number;
  classifier_calibrated_p_solve?: number;
  classifier_threshold?: number;
  classifier_capability_boundary?: string;
  classifier_primary_rule?: string;
  classifier_calibration_version?: string;
  classifier_efficient_p_solve?: number;
  classifier_capable_p_solve?: number;
  classifier_calibrated_efficient_p_solve?: number;
  classifier_calibrated_capable_p_solve?: number;
  classifier_max_quality_gap?: number;
  classifier_confidence?: number;
  classifier_probabilities?: Record<string, number>;
  classifier_cost?: number;
  escalated?: boolean;
  tier_boundaries?: RoutingDecisionTierBoundaries;
  reasoning_override_min_score?: number;
  heuristic_v2_forecast?: {
    probabilities: Record<string, number>;
    threshold: number;
    predicted_tier: string;
    request_type: string;
  };
}

const ROUTER_TYPE_LABELS: Record<string, string> = {
  complexity: "Auto-Router v2",
  adaptive: "Adaptive router",
  quality: "Quality router",
};

/**
 * The tier the score alone would have produced, given the boundaries in effect when
 * the decision was made. Rendered as the bracket that explains a score, so it must
 * use the snapshot rather than today's config.
 */
function describeScoreAgainstBoundaries(
  score: number,
  boundaries?: RoutingDecisionTierBoundaries,
  renamed?: boolean,
): string | null {
  if (!boundaries) return null;
  const {
    simple_medium: simpleMedium,
    medium_complex: mediumComplex,
    complex_reasoning: complexReasoning,
  } = boundaries;
  if (simpleMedium === undefined || mediumComplex === undefined || complexReasoning === undefined) return null;

  const named = (range: string, tier: string): string => (renamed ? range : `${range}, ${tier}`);
  if (score < simpleMedium) return named(`below ${simpleMedium}`, "SIMPLE");
  if (score < mediumComplex) return named(`${simpleMedium} to ${mediumComplex}`, "MEDIUM");
  if (score < complexReasoning) return named(`${mediumComplex} to ${complexReasoning}`, "COMPLEX");
  return named(`at or above ${complexReasoning}`, "REASONING");
}

function describePlanModeFloor(matchedKeyword: string | undefined): string {
  if (matchedKeyword === "exit_plan_mode") return "Plan-mode floor (exit_plan_mode tool)";
  if (matchedKeyword) return `Plan-mode floor: "${matchedKeyword}"`;
  return "Plan-mode floor";
}

/**
 * The sentinel is the whole reason this row is worth reading: it is the string an operator
 * would add to housekeeping_patterns to cover another client, so naming it turns the row into
 * the instruction. Without it the drawer says only that the classifier was skipped.
 */
function describeHousekeeping(matchedKeyword: string | undefined): string {
  if (matchedKeyword) return `Client housekeeping call: "${matchedKeyword}"`;
  return "Client housekeeping call, classifier skipped";
}

/** Rows logged before the floor was recorded name what it tracked back then instead of a number. */
function describeReasoningOverride(tierLabel: string | undefined, floor: number | undefined): string {
  const stated = floor === undefined ? "the Simple to Medium boundary" : String(floor);
  return `Heuristic, ${tierLabel ?? "REASONING"} override (2 or more reasoning markers, score of at least ${stated})`;
}

const CONSTANT_CAUSE_LABELS: Record<string, string> = {
  heuristic_scorer: "Heuristic scorer",
  heuristic_v2: "Heuristic v2",
  capability_classifier: "Capability",
  capability_classifier_fallback: "Capable tier, Capability classifier failed",
  llm_v2_classifier: "FUSE v2",
  llm_v2_fallback: "Capable tier, FUSE v2 classifier failed",
  heuristic_first_short_circuit: "Heuristic scorer, classifier skipped",
  hybrid_short_circuit: "Heuristic scorer, score clear of every boundary",
  classifier_plugin: "Custom classifier plugin",
  semantic_keyword_match: "Semantic keyword match",
  session_affinity_pin: "Pinned to session",
  session_affinity_escalation: "Escalated from session pin",
  user_turn_continuation: "Continuation turn, classifier skipped",
  modality_escalation: "Escalated for image input",
  modality_pin_override: "Overrode session pin for image input",
  quality_tier: "Quality tier mapping",
  bandit: "Adaptive bandit",
  default_fallback: "Default model, no route matched",
  classifier_fallback: "Fallback tier, classifier failed",
  default_model_fallback: "Default model, classifier failed",
};

function describeCause(decision: RoutingDecision): string {
  const {
    cause,
    classifier_model: classifierModel,
    matched_keyword: matchedKeyword,
    tier_label: tierLabel,
    reasoning_override_min_score: overrideFloor,
  } = decision;

  const constant = cause ? CONSTANT_CAUSE_LABELS[cause] : undefined;
  if (constant) return constant;

  switch (cause) {
    case "reasoning_override":
      return describeReasoningOverride(tierLabel, overrideFloor);
    case "llm_classifier":
      return classifierModel ? `LLM classifier (${classifierModel})` : "LLM classifier";
    case "jev_classifier":
      return "OSS classifier";
    case "literal_keyword_match":
    case "keyword":
      return matchedKeyword ? `Keyword match: "${matchedKeyword}"` : "Keyword match";
    case "plan_mode":
      return describePlanModeFloor(matchedKeyword);
    case "housekeeping":
      return describeHousekeeping(matchedKeyword);
    default:
      return cause ?? "Unknown";
  }
}

/**
 * A request can ask to escalate and get nowhere, when its tier is already the highest
 * one configured. That row still has to say the caller asked, otherwise it reads as an
 * ordinary route; it just must not claim a bump that did not happen. Only called when
 * the request escalated or asked to, so there is no "did not escalate" case.
 */
function describeEscalation(escalated: boolean, keyword: string | undefined): string {
  if (escalated) return keyword ? `Yes, keyword "${keyword}"` : "Yes";
  return keyword ? `Requested via "${keyword}"; already at the highest tier` : "Requested; already at the highest tier";
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function PercentageRow({ label, value, unit = "%" }: { label: string; value?: number; unit?: string }) {
  if (value === undefined) return null;
  return (
    <Row label={label}>
      <span className="tabular-nums">{`${(value * 100).toFixed(1)}${unit}`}</span>
    </Row>
  );
}

function CapabilityForecast({ decision }: { decision: RoutingDecision }) {
  const {
    classifier_p_solve: raw,
    classifier_calibrated_p_solve: calibrated,
    classifier_threshold: threshold,
    classifier_capability_boundary: boundary,
    classifier_primary_rule: rule,
    classifier_calibration_version: version,
  } = decision;
  if ([raw, calibrated, threshold, boundary, rule].every((value) => value === undefined)) return null;

  return (
    <div className="mt-3 border-t pt-3">
      <div className="mb-1 text-sm font-medium">{"能力估计"}</div>
      <div className="mb-2 text-xs text-muted-foreground">{"高效率模型的解决概率"}</div>
      <PercentageRow label={"原始内容"} value={raw} />
      <PercentageRow label={"已校准"} value={calibrated} />
      <PercentageRow label={"阈值"} value={threshold} />
      {boundary && <Row label={"边界"}>{boundary}</Row>}
      {rule && <Row label={"规则"}>{rule}</Row>}
      {version && <Row label={"校准"}>{version}</Row>}
    </div>
  );
}

function FuseV2Forecast({ decision }: { decision: RoutingDecision }) {
  const {
    classifier_efficient_p_solve: rawEfficient,
    classifier_capable_p_solve: rawCapable,
    classifier_calibrated_efficient_p_solve: calibratedEfficient,
    classifier_calibrated_capable_p_solve: calibratedCapable,
    classifier_max_quality_gap: allowedGap,
    classifier_calibration_version: version,
  } = decision;
  if ([rawEfficient, rawCapable, calibratedEfficient, calibratedCapable, allowedGap].every((v) => v === undefined)) {
    return null;
  }
  const isCalibrated = [calibratedEfficient, calibratedCapable, version].some((value) => value !== undefined);
  const efficient = isCalibrated ? calibratedEfficient : rawEfficient;
  const capable = isCalibrated ? calibratedCapable : rawCapable;
  const gap = efficient !== undefined && capable !== undefined ? capable - efficient : undefined;

  return (
    <div className="mt-3 border-t pt-3">
      <div className="mb-1 text-sm font-medium">{"FUSE v2 估计值"}</div>
      <PercentageRow label={"高效率模型（原始值）"} value={rawEfficient} />
      <PercentageRow label={"高能力模型（原始值）"} value={rawCapable} />
      <PercentageRow label={"高效率模型（已校准）"} value={calibratedEfficient} />
      <PercentageRow label={"高能力模型（已校准）"} value={calibratedCapable} />
      <PercentageRow label={"实际采用的差距"} value={gap} unit=" percentage points" />
      <PercentageRow label={"允许的差距"} value={allowedGap} unit=" percentage points" />
      {version && <Row label={"校准"}>{version}</Row>}
    </div>
  );
}

export function RoutingDecisionCard({
  decision,
  className,
}: {
  decision?: RoutingDecision | null;
  className?: string;
}) {
  if (!decision || !decision.cause) return null;

  const {
    router_model_name: routerModelName,
    router_type: routerType,
    routed_model: routedModel,
    tier,
    tier_label: tierLabel,
    request_type: requestType,
    score,
    signals,
    escalated,
    escalation_keyword: escalationKeyword,
    tier_boundaries: tierBoundaries,
    heuristic_v2_forecast: forecast,
  } = decision;

  // On an override row the score did not decide the tier, so showing it against a
  // boundary would claim something untrue. Keyed off the cause rather than a marker
  // inside `signals`, which redaction can remove.
  const scoreExplanation =
    score !== undefined && decision.cause !== "reasoning_override" && decision.cause !== "plan_mode"
      ? describeScoreAgainstBoundaries(score, tierBoundaries, tierLabel !== undefined)
      : null;

  return (
    <div className={cn("mb-6 w-full max-w-full overflow-hidden rounded-lg bg-card shadow-sm", className)}>
      <div className="border-b px-4 py-2.5 text-sm font-medium">{"路由"}</div>
      <div className="px-4 py-3">
        {routerModelName && (
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Waypoints size={14} aria-hidden />
            <span>{routerModelName}</span>
            {routerType && (
              <span className="font-normal text-muted-foreground">
                ({ROUTER_TYPE_LABELS[routerType] ?? routerType})
              </span>
            )}
          </div>
        )}

        {tier && (
          <Row label={"层级"}>
            <Badge variant="secondary" className="font-normal">
              {tierLabel ?? tier}
            </Badge>
          </Row>
        )}

        {requestType && <Row label={"请求类型"}>{requestType}</Row>}

        <Row label={"决策来源"}>{describeCause(decision)}</Row>
        {decision.classifier_model && <Row label={"分类器模型"}>{decision.classifier_model}</Row>}
        {decision.classifier_confidence != null && (
          <Row label={"置信度"}>{(decision.classifier_confidence * 100).toFixed(1)}%</Row>
        )}
        {decision.classifier_probabilities && (
          <Row label={"概率"}>
            {Object.entries(decision.classifier_probabilities).map(([name, probability]) => (
              <div key={name}>
                {name}: {(probability * 100).toFixed(1)}%
              </div>
            ))}
          </Row>
        )}
        {decision.classifier_cost != null && <Row label={"分类器费用"}>${decision.classifier_cost.toFixed(8)}</Row>}

        {score !== undefined && (
          <Row label={"得分"}>
            <span className="tabular-nums">{score.toFixed(2)}</span>
            {scoreExplanation && <span className="ml-2 text-muted-foreground">({scoreExplanation})</span>}
          </Row>
        )}

        {routedModel && <Row label={"路由至"}>{routedModel}</Row>}

        {escalated !== undefined && <Row label={"已升级处理"}>{describeEscalation(escalated, escalationKeyword)}</Row>}

        {forecast && (
          <div className="mt-3 border-t pt-3">
            <div className="mb-1 text-sm font-medium">{"启发式 v2 估计值"}</div>
            <Row label={"各层级成功率"}>
              <span className="flex flex-wrap gap-1">
                {["SIMPLE", "MEDIUM", "COMPLEX", "REASONING"].map((predictedTier) => (
                  <Badge key={predictedTier} variant="outline" className="font-normal tabular-nums">
                    {predictedTier} {(forecast.probabilities[predictedTier] * 100).toFixed(1)}%
                  </Badge>
                ))}
              </span>
            </Row>
            <Row label={"阈值"}>
              <span className="tabular-nums">{(forecast.threshold * 100).toFixed(1)}%</span>
            </Row>
            <Row label={"预测层级"}>{forecast.predicted_tier}</Row>
            <Row label={"请求类型"}>{forecast.request_type}</Row>
          </div>
        )}

        <CapabilityForecast decision={decision} />
        <FuseV2Forecast decision={decision} />

        {signals && signals.length > 0 && (
          <Row label={"信号"}>
            <span className="flex flex-wrap gap-1">
              {signals.map((signal) => (
                <Badge key={signal} variant="outline" className="font-normal">
                  {signal}
                </Badge>
              ))}
            </span>
          </Row>
        )}
      </div>
    </div>
  );
}

export default RoutingDecisionCard;
