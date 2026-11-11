import { Badge } from "@/components/ui/badge";
import { hasRouterSettings } from "./routerSettingsPayload";

interface RouterSettingsSummaryProps {
  routerSettings: Record<string, unknown> | null | undefined;
  emptyText?: string;
}

const fallbackEntries = (fallbacks: unknown): Array<[string, string[]]> => {
  if (!Array.isArray(fallbacks)) return [];
  return fallbacks.flatMap((entry) =>
    entry && typeof entry === "object" ? (Object.entries(entry) as Array<[string, string[]]>) : [],
  );
};

export default function RouterSettingsSummary({
  routerSettings,
  emptyText = "No router settings configured",
}: RouterSettingsSummaryProps) {
  if (!hasRouterSettings(routerSettings)) {
    return <div className="text-muted-foreground">{emptyText}</div>;
  }

  const settings = routerSettings as Record<string, unknown>;
  const fallbacks = fallbackEntries(settings.fallbacks);

  return (
    <div className="space-y-1 text-sm">
      {settings.routing_strategy != null && (
        <div>{"路由策略： "}<Badge variant="secondary">{String(settings.routing_strategy)}</Badge>
        </div>
      )}
      {settings.num_retries != null && <div>{"重试次数： "}{String(settings.num_retries)}</div>}
      {settings.allowed_fails != null && <div>{"允许的失败次数： "}{String(settings.allowed_fails)}</div>}
      {settings.cooldown_time != null && <div>{"冷却时间： "}{String(settings.cooldown_time)}s</div>}
      {settings.timeout != null && <div>{"超时时间： "}{String(settings.timeout)}s</div>}
      {settings.retry_after != null && <div>{"重试等待时间： "}{String(settings.retry_after)}s</div>}
      {Boolean(settings.enable_tag_filtering) && <div>{"标签筛选：已启用"}</div>}
      {fallbacks.length > 0 && (
        <div>
          <div>{"回退模型："}</div>
          <div className="mt-1 space-y-1">
            {fallbacks.map(([model, targets]) => (
              <div key={model} className="text-xs text-muted-foreground">
                <span className="font-medium">{model}</span>
                <span className="mx-1 text-muted-foreground">-&gt;</span>
                {Array.isArray(targets) ? targets.join(", ") : String(targets)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
