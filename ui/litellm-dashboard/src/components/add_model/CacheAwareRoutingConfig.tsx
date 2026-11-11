import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { classificationFrequency, type ComplexityRouterConfigValue } from "./ComplexityRouterConfig";

const blockedReason = (value: ComplexityRouterConfigValue): string | null => {
  if (value.custom_tier_set) return "Use the built-in tiers to enable cache-aware routing.";
  if (value.adaptive) return "Turn off Adaptive Routing to enable cache-aware routing.";
  if (classificationFrequency(value) !== "every_request") {
    return 'Set "How often to classify" to every request to enable cache-aware routing.';
  }
  if (Object.values(value.tiers).some((models) => models.length > 1)) {
    return "Choose one model per tier to enable cache-aware routing.";
  }
  if (
    Object.values(value.tier_model_params ?? {}).some((models) =>
      Object.values(models).some((params) => Object.keys(params).length > 0),
    )
  ) {
    return "Remove per-model parameter overrides to enable cache-aware routing.";
  }
  return null;
};

const optionalInteger = (raw: string, minimum: number): number | undefined => {
  if (raw.trim() === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.trunc(parsed)) : undefined;
};

const CacheAwareRoutingConfig = ({
  value,
  onChange,
}: {
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}) => {
  const enabled = value.cache_aware_routing ?? false;
  const reason = blockedReason(value);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Switch
          checked={enabled}
          disabled={!enabled && reason !== null}
          onCheckedChange={(next) => onChange({ ...value, cache_aware_routing: next })}
          aria-label={"缓存感知路由"}
        />
        <span className="text-sm font-medium">{"考虑提示词缓存节省的费用"}</span>
      </div>
      <p className="text-xs text-muted-foreground">{"默认关闭。模型具有已预热的提示词缓存，且预计总成本更低、能力达到所选层级或更高时，可复用该模型。支持显式提示词缓存的原生 Anthropic Messages，不支持的请求保持原有路由。"}</p>
      {reason && (
        <p className="text-xs text-muted-foreground" role="status">
          {enabled && "Cache-aware routing is currently skipped. "}
          {reason}
        </p>
      )}
      {enabled && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="cache-aware-output-tokens">{"预计输出 Token 数"}</label>
            <Input
              id="cache-aware-output-tokens"
              type="number"
              min={0}
              step={1}
              placeholder="1024"
              value={value.cache_aware_routing_output_tokens ?? ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  cache_aware_routing_output_tokens: optionalInteger(event.target.value, 0),
                })
              }
              aria-describedby="cache-aware-output-help"
            />
            <p id="cache-aware-output-help" className="mt-1 text-xs text-muted-foreground">{"用于估算成本，不限制响应长度。留空时使用默认值 1024。"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="cache-aware-timeout">{"预测超时（毫秒）"}</label>
            <Input
              id="cache-aware-timeout"
              type="number"
              min={1}
              step={1}
              placeholder="2000"
              value={value.cache_aware_routing_timeout_ms ?? ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  cache_aware_routing_timeout_ms: optionalInteger(event.target.value, 1),
                })
              }
              aria-describedby="cache-aware-timeout-help"
            />
            <p id="cache-aware-timeout-help" className="mt-1 text-xs text-muted-foreground">{"比较耗时过长时保留原路由。留空时使用默认值 2000 毫秒。"}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheAwareRoutingConfig;
