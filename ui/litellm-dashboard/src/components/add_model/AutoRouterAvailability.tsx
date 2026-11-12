import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/components/networking";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import type { components } from "@/lib/http/schema";

type Availability = components["schemas"]["AutoRouterAvailabilityResponse"];
type Request = components["schemas"]["AutoRouterAvailabilityRequest"];
export type Allowance = components["schemas"]["AutoRouterAllowance"];

type AvailabilityState = {
  data?: Availability;
  isPending: boolean;
  isError: boolean;
  isChecking?: boolean;
  refetch?: () => unknown;
};

export const AutoRouterAvailabilityContext = createContext<AvailabilityState>({ isPending: true, isError: false });

export const useAutoRouterAvailability = (accessToken: string, body: Request, enabled = true) => {
  const serialized = JSON.stringify(body.complexity_router_config ?? null);
  const [debounced, setDebounced] = useState(serialized);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(serialized), 300);
    return () => clearTimeout(timeout);
  }, [serialized]);
  const options: UseQueryOptions<Availability> = {
    queryKey: ["autoRouterAvailability", accessToken, body.team_id, body.saved_model_id, debounced],
    queryFn: ({ signal }) =>
      apiClient.post<Availability>("/auto_router/availability", {
        accessToken,
        body: { ...body, complexity_router_config: JSON.parse(debounced) },
        signal,
      }),
    enabled: enabled && Boolean(accessToken),
    placeholderData: (previous, previousQuery) => {
      const key = previousQuery?.queryKey;
      return key?.[1] === accessToken && key[2] === body.team_id && key[3] === body.saved_model_id
        ? previous
        : undefined;
    },
    refetchOnMount: "always",
    staleTime: 0,
    retry: false,
  };
  const query = useQuery(options);
  const isChecking = query.isFetching || query.isPlaceholderData || serialized !== debounced;
  const saveBlockedReason = () => {
    if (!enabled) return null;
    if (query.isPending || isChecking) return "Checking availability";
    if (query.isError || !query.data) return "Could not check availability. Retry before saving.";
    return query.data.error ?? null;
  };
  return {
    ...query,
    isPending: query.isPending || (query.isFetching && !query.isFetchedAfterMount),
    isChecking,
    saveBlockedReason: saveBlockedReason(),
  };
};

export const allowanceLabel = (allowance?: Allowance): string | null => {
  if (!allowance?.available) return "Availability unavailable";
  if (allowance.limit == null) return null;
  if (allowance.used_by_this_router) return "Used by this router";
  return `${allowance.remaining} of ${allowance.limit} available`;
};

const availabilityLabel = (state: AvailabilityState, key: string) => {
  if (state.isPending || state.isChecking) return "Checking availability";
  if (state.isError) return "Availability unavailable";
  return allowanceLabel(state.data?.allowances.find((entry) => entry.key === key));
};

export const useAllowanceLabel = (key: string) => availabilityLabel(useContext(AutoRouterAvailabilityContext), key);

export const isAllowanceExhausted = (allowance?: Allowance) =>
  Boolean(allowance?.available && allowance.limit != null && allowance.remaining === 0) &&
  !allowance?.used_by_this_router;

export const AUTO_ROUTER_CONTACT_URL = "https://calendly.com/tin-berri/litellm-auto-router-pricing-discussion";

export const AutoRouterContactLink = ({ features, message }: { features?: string[]; message?: string }) => {
  const state = useContext(AutoRouterAvailabilityContext);
  if (state.isPending || state.isError || state.isChecking) return null;
  const exhausted = state.data?.allowances.some(
    (entry) => (!features || features.includes(entry.key)) && isAllowanceExhausted(entry),
  );
  if (!exhausted) return null;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1 text-xs leading-5 text-muted-foreground">
      {message}
      <a
        href={AUTO_ROUTER_CONTACT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
      >{"联系我们的团队"}</a>
    </span>
  );
};

export const AutoRouterAllowanceLabel = ({ feature }: { feature: string }) => {
  const label = useAllowanceLabel(feature);
  return label ? (
    <span className="shrink-0 whitespace-nowrap text-xs leading-5 tabular-nums text-muted-foreground">{label}</span>
  ) : null;
};

export const AutoRouterAllowanceNote = ({ feature, label }: { feature: string; label: string }) => {
  const availability = useAllowanceLabel(feature);
  return availability ? (
    <p className="text-xs leading-5 text-muted-foreground">
      {label}: {availability} <AutoRouterContactLink features={[feature]} />
    </p>
  ) : null;
};

export const AutoRouterLimits = () => {
  const state = useContext(AutoRouterAvailabilityContext);
  const limits = [
    ["heuristic_v2", "Heuristic v2 routers"],
    ["capability", "Capability routers"],
    ["llm_v2", "Fuse v2 routers"],
    ["tier_or_classifier_prompt", "Custom tiers or prompts"],
    ["heuristic_tuning", "Rule-based tuning"],
  ];
  return (
    <Popover>
      <PopoverTrigger className="shrink-0 whitespace-nowrap text-xs font-normal text-muted-foreground underline underline-offset-4 hover:text-foreground">{"查看限制"}</PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] gap-3">
        <PopoverTitle>{"路由与自定义限制"}</PopoverTitle>
        <p className="text-xs leading-5 text-muted-foreground">{"使用内置设置时，基于规则、复杂度及开源分类器不受限制，可以自由选择或更换层级模型。自定义额度由整个代理共享。"}</p>
        <dl className="space-y-2 text-xs">
          {limits.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <dt>{label}</dt>
              <dd className="shrink-0 tabular-nums text-muted-foreground">
                {availabilityLabel(state, key) ?? "Unlimited"}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs leading-5 text-muted-foreground">{"自定义层级定义和分类器指令共用一份额度。内置提示词和显示名称修改不消耗额度。"}</p>
        <p className="text-xs leading-5 text-muted-foreground">{"修改权重、阈值、关键词、自定义维度等评分规则会消耗基于规则的调优额度，启发式优先和混合模式同样适用。现有路由器保留已保存的设置，新路由器从内置规则开始。"}</p>
        <AutoRouterContactLink message="Need a higher limit?" />
      </PopoverContent>
    </Popover>
  );
};
