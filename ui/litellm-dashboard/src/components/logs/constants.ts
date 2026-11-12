export const ERROR_CODE_OPTIONS: { label: string; value: string }[] = [
  { label: "400 - 请求无效", value: "400" },
  { label: "401 - 认证无效", value: "401" },
  { label: "403 - 无访问权限", value: "403" },
  { label: "404 - 未找到", value: "404" },
  { label: "408 - 请求超时", value: "408" },
  { label: "422 - 无法处理请求实体", value: "422" },
  { label: "429 - 触发限速", value: "429" },
  { label: "500 - 服务内部错误", value: "500" },
  { label: "502 - 网关错误", value: "502" },
  { label: "503 - 服务不可用", value: "503" },
  { label: "529 - 服务过载", value: "529" },
];

/** Call types that represent MCP tool invocations (shared across columns, index, drawer). */
export const MCP_CALL_TYPES = ["call_mcp_tool", "list_mcp_tools"];

/** Call types that represent agent/A2A requests (e.g. asend_message). */
export const AGENT_CALL_TYPES = ["asend_message"];

/** Call types that represent Batch API operations (creation and retrieval, sync and async). */
export const BATCH_CALL_TYPES = ["acreate_batch", "create_batch", "aretrieve_batch", "retrieve_batch"];

export const SPAN_TYPE_LABELS: Record<string, string> = {
  llm: "LLM",
  agent: "Agent",
  mcp: "MCP",
  batch: "Batch",
};

export const CREDENTIAL_LABELS: Record<string, string> = {
  true: "Client OAuth token",
  false: "Configured key",
};

export const KUBERNETES_POD_ROUTING_LABELS = {
  round_robin: "Round robin",
  session_affinity: "Session affinity",
  session_affinity_retry: "Session affinity (retry)",
} as const;

export const QUICK_SELECT_OPTIONS: { label: string; value: number; unit: string }[] = [
  { label: "最近一分钟", value: 1, unit: "minutes" },
  { label: "最近十五分钟", value: 15, unit: "minutes" },
  { label: "最近一小时", value: 1, unit: "hours" },
  { label: "最近四小时", value: 4, unit: "hours" },
  { label: "最近二十四小时", value: 24, unit: "hours" },
  { label: "最近 7 天", value: 7, unit: "days" },
];
