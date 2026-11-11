import React, { useState, useEffect, useId } from "react";
import { Save, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { toast } from "@/lib/toast";
import {
  getGeneralSettingsCall,
  updateConfigFieldSetting,
  deleteConfigFieldSetting,
  fetchMCPClientIp,
} from "@/components/networking";

interface MCPNetworkSettingsProps {
  accessToken: string | null;
}

/**
 * Given an IP like "203.0.113.45", return "203.0.113.0/24".
 */
function ipToSlash24(ip: string): string {
  const parts = ip.split(".");
  if (parts.length !== 4) return ip + "/32";
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
}

export interface AllowedClient {
  readonly alias: string;
  readonly value: string;
}

interface AllowedClientRow extends AllowedClient {
  readonly key: string;
}

interface ClientDraft extends AllowedClient {
  readonly key: string | null;
}

const isAllowedClient = (entry: unknown): entry is AllowedClient => {
  if (typeof entry !== "object" || entry === null) return false;
  const { alias, value } = entry as Partial<Record<keyof AllowedClient, unknown>>;
  return typeof alias === "string" && typeof value === "string" && !isIncomplete({ alias, value });
};

type StoredAllowlist =
  | { readonly kind: "absent" }
  | { readonly kind: "clients"; readonly clients: AllowedClient[] }
  | { readonly kind: "malformed" };

const ABSENT: StoredAllowlist = { kind: "absent" };

const parseStoredClients = (fieldValue: unknown): StoredAllowlist => {
  if (fieldValue === null || fieldValue === undefined) return ABSENT;
  if (Array.isArray(fieldValue) && fieldValue.every(isAllowedClient)) {
    return { kind: "clients", clients: fieldValue.map(({ alias, value }) => ({ alias, value })) };
  }
  return { kind: "malformed" };
};

let nextRowKey = 0;
const newRow = (client: AllowedClient): AllowedClientRow => ({ ...client, key: `client-${nextRowKey++}` });

const trimClient = ({ alias, value }: AllowedClient): AllowedClient => ({ alias: alias.trim(), value: value.trim() });

const isIncomplete = ({ alias, value }: AllowedClient) => alias === "" || value === "";

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((value, i) => value === b[i]);

const sameClients = (a: AllowedClient[], b: AllowedClient[]) =>
  a.length === b.length && a.every((client, i) => client.alias === b[i].alias && client.value === b[i].value);

const unchangedSinceLoad = (value: string[], stored: string[] | null) =>
  stored === null ? value.length === 0 : value.length > 0 && sameList(value, stored);

const clientsUnchangedSinceLoad = (value: AllowedClient[], stored: StoredAllowlist) => {
  switch (stored.kind) {
    case "absent":
      return value.length === 0;
    case "clients":
      return value.length > 0 && sameClients(value, stored.clients);
    case "malformed":
      return false;
  }
};

const headerUnchangedSinceLoad = (value: string, stored: string | null) =>
  stored === null ? value === "" : value !== "" && value === stored;

interface AllowedClientDialogProps {
  readonly draft: ClientDraft | null;
  readonly onChange: (draft: ClientDraft) => void;
  readonly onCommit: () => void;
  readonly onRemove: () => void;
  readonly onClose: () => void;
}

const AllowedClientDialog: React.FC<AllowedClientDialogProps> = ({ draft, onChange, onCommit, onRemove, onClose }) => {
  const aliasId = useId();
  const valueId = useId();
  if (draft === null) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{draft.key === null ? "添加客户端" : "编辑客户端"}</DialogTitle>
          <DialogDescription>{"别名显示在控制台和网关日志中。值必须与识别客户端的 JWT 声明或请求头值完全一致，例如身份提供商签发的 OAuth 客户端 ID。"}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={aliasId}>{"别名"}</Label>
            <Input
              id={aliasId}
              value={draft.alias}
              placeholder={"例如，编程命令行工具"}
              onChange={(e) => onChange({ ...draft, alias: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={valueId}>{"值"}</Label>
            <Input
              id={valueId}
              value={draft.value}
              placeholder={"例如 0oa1b2c3d4e5f6g7h8i9"}
              className="font-mono"
              onChange={(e) => onChange({ ...draft, value: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          {draft.key !== null && (
            <Button type="button" variant="destructive" className="sm:mr-auto" onClick={onRemove}>{"移除客户端"}</Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>{"取消"}</Button>
          <Button type="button" disabled={isIncomplete(trimClient(draft))} onClick={onCommit}>
            {draft.key === null ? "添加" : "完成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type DisableableCapability = "prompts" | "resources";

const CAPABILITY_TOGGLES: { capability: DisableableCapability; label: string; description: string }[] = [
  { capability: "prompts", label: "Prompts", description: "Advertise prompts and answer prompts/list and prompts/get" },
  {
    capability: "resources",
    label: "Resources",
    description: "Advertise resources and answer resources/list, resources/templates/list and resources/read",
  },
];

const parseDisabledCapabilities = (value: unknown): DisableableCapability[] =>
  Array.isArray(value)
    ? value.filter((name): name is DisableableCapability => name === "prompts" || name === "resources")
    : [];

const MCPNetworkSettings: React.FC<MCPNetworkSettingsProps> = ({ accessToken }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [privateRanges, setPrivateRanges] = useState<string[]>([]);
  const [allowedClients, setAllowedClients] = useState<AllowedClientRow[]>([]);
  const [clientIdHeader, setClientIdHeader] = useState("");
  const [storedRanges, setStoredRanges] = useState<string[] | null>(null);
  const [storedClients, setStoredClients] = useState<StoredAllowlist>(ABSENT);
  const [storedClientIdHeader, setStoredClientIdHeader] = useState<string | null>(null);
  const [disabledCapabilities, setDisabledCapabilities] = useState<DisableableCapability[]>([]);
  const [storedDisabledCapabilities, setStoredDisabledCapabilities] = useState<DisableableCapability[] | null>(null);
  const [currentIp, setCurrentIp] = useState<string | null>(null);
  const [rangeDraft, setRangeDraft] = useState("");
  const [clientDraft, setClientDraft] = useState<ClientDraft | null>(null);
  const capabilityToggleId = useId();

  useEffect(() => {
    loadSettings();
    detectCurrentIp();
  }, [accessToken]);

  const loadSettings = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const settings = await getGeneralSettingsCall(accessToken);
      for (const field of settings) {
        if (field.field_name === "mcp_internal_ip_ranges" && Array.isArray(field.field_value)) {
          setPrivateRanges(field.field_value);
          setStoredRanges(field.field_value);
        }
        if (field.field_name === "mcp_allowed_clients") {
          const stored = parseStoredClients(field.field_value);
          setAllowedClients(stored.kind === "clients" ? stored.clients.map(newRow) : []);
          setStoredClients(stored);
        }
        if (field.field_name === "mcp_client_id_header" && typeof field.field_value === "string") {
          setClientIdHeader(field.field_value);
          setStoredClientIdHeader(field.field_value);
        }
        if (field.field_name === "mcp_disabled_capabilities") {
          const stored = parseDisabledCapabilities(field.field_value);
          setDisabledCapabilities(stored);
          setStoredDisabledCapabilities(stored.length > 0 ? stored : null);
        }
      }
    } catch (error) {
      console.error("Failed to load MCP network settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const detectCurrentIp = async () => {
    if (!accessToken) return;
    const ip = await fetchMCPClientIp(accessToken);
    if (ip) {
      setCurrentIp(ip);
    }
  };

  const persistRanges = async (token: string) => {
    if (unchangedSinceLoad(privateRanges, storedRanges)) return;
    if (privateRanges.length > 0) {
      await updateConfigFieldSetting(token, "mcp_internal_ip_ranges", privateRanges);
      setStoredRanges(privateRanges);
      return;
    }
    await deleteConfigFieldSetting(token, "mcp_internal_ip_ranges");
    setStoredRanges(null);
  };

  const persistAllowedClients = async (token: string) => {
    const clients = allowedClients.map(({ alias, value }) => ({ alias, value }));
    if (clientsUnchangedSinceLoad(clients, storedClients)) return;
    if (clients.length > 0) {
      await updateConfigFieldSetting(token, "mcp_allowed_clients", clients);
      setStoredClients({ kind: "clients", clients });
      return;
    }
    await deleteConfigFieldSetting(token, "mcp_allowed_clients");
    setStoredClients(ABSENT);
  };

  const persistClientIdHeader = async (token: string) => {
    const value = clientIdHeader.trim();
    if (headerUnchangedSinceLoad(value, storedClientIdHeader)) return;
    if (value !== "") {
      await updateConfigFieldSetting(token, "mcp_client_id_header", value);
      setStoredClientIdHeader(value);
      return;
    }
    await deleteConfigFieldSetting(token, "mcp_client_id_header");
    setStoredClientIdHeader(null);
  };

  const persistDisabledCapabilities = async (token: string) => {
    if (unchangedSinceLoad(disabledCapabilities, storedDisabledCapabilities)) return;
    if (disabledCapabilities.length > 0) {
      await updateConfigFieldSetting(token, "mcp_disabled_capabilities", disabledCapabilities);
      setStoredDisabledCapabilities(disabledCapabilities);
      return;
    }
    await deleteConfigFieldSetting(token, "mcp_disabled_capabilities");
    setStoredDisabledCapabilities(null);
  };

  const setCapabilityServed = (capability: DisableableCapability, served: boolean) => {
    setDisabledCapabilities(
      served
        ? disabledCapabilities.filter((name) => name !== capability)
        : [...disabledCapabilities.filter((name) => name !== capability), capability],
    );
  };

  const handleSave = async () => {
    if (!accessToken) return;
    setSaving(true);
    const [rangeResult] = await Promise.allSettled([persistRanges(accessToken)]);
    const [clientResult] = await Promise.allSettled([persistAllowedClients(accessToken)]);
    const [headerResult] = await Promise.allSettled([persistClientIdHeader(accessToken)]);
    const [capabilityResult] = await Promise.allSettled([persistDisabledCapabilities(accessToken)]);
    setSaving(false);
    const failures = [rangeResult, clientResult, headerResult, capabilityResult].filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failures.length === 0) {
      toast.success("MCP 网络设置已保存");
      return;
    }
    failures.forEach((failure) => toast.fromError(failure.reason));
  };

  const addSuggestedRange = (range: string) => {
    if (!privateRanges.includes(range)) {
      setPrivateRanges([...privateRanges, range]);
    }
  };

  // Commas separate entries, matching the old tokenised input.
  const splitDraft = (draft: string, existing: string[]) =>
    draft
      .split(",")
      .map((r) => r.trim())
      .filter((r) => r !== "" && !existing.includes(r));

  const commitDraft = () => {
    const added = splitDraft(rangeDraft, privateRanges);
    if (added.length > 0) {
      setPrivateRanges([...privateRanges, ...added]);
    }
    setRangeDraft("");
  };

  const commitClientDraft = () => {
    if (clientDraft === null) return;
    const client = trimClient(clientDraft);
    setAllowedClients(
      clientDraft.key === null
        ? [...allowedClients, newRow(client)]
        : allowedClients.map((row) => (row.key === clientDraft.key ? { ...row, ...client } : row)),
    );
    setClientDraft(null);
  };

  const removeDraftedClient = () => {
    if (clientDraft === null) return;
    setAllowedClients(allowedClients.filter((row) => row.key !== clientDraft.key));
    setClientDraft(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <UiLoadingSpinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  const suggestedRange = currentIp ? ipToSlash24(currentIp) : null;
  const storedAllowlistIsMalformed = storedClients.kind === "malformed";
  const storedAllowlistIsEmpty = storedClients.kind === "clients" && storedClients.clients.length === 0;

  return (
    <div className="space-y-6 p-4">
      <div>
        <p className="text-lg font-semibold">{"私有 IP 范围"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Define which IP ranges are part of your private network. Callers from these IPs can see all MCP servers.
          Callers from any other IP can only see servers marked &quot;Available on Public Internet&quot;.
        </p>
      </div>

      <Card className="p-6">
        {currentIp && (
          <div className="mb-4 rounded-lg bg-muted p-3">
            <p className="text-sm">{"你当前的 IP： "}<span className="font-mono font-medium">{currentIp}</span>
            </p>
            {suggestedRange && !privateRanges.includes(suggestedRange) && (
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm">{"建议范围： "}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono"
                  onClick={() => addSuggestedRange(suggestedRange)}
                >
                  <Plus />
                  {suggestedRange}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="mb-2 flex items-center">
          <p className="text-sm font-medium">{"你的私有网络范围"}</p>
        </div>
        {privateRanges.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {privateRanges.map((range) => (
              <Badge key={range} variant="secondary" className="font-mono">
                {range}
                <button
                  type="button"
                  aria-label={`Remove ${range}`}
                  onClick={() => setPrivateRanges(privateRanges.filter((r) => r !== range))}
                  className="ml-1 cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <Input
          value={rangeDraft}
          placeholder={"留空使用默认范围：10.0.0.0/8、172.16.0.0/12、192.168.0.0/16、127.0.0.0/8"}
          onChange={(e) => setRangeDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitDraft();
            }
          }}
        />
        <p className="mt-2 text-xs text-muted-foreground">{"输入 CIDR 范围（例如 10.0.0.0/8），留空则使用标准私有 IP 范围。"}</p>
      </Card>

      <div>
        <p className="text-lg font-semibold">{"允许的客户端"}</p>
        <p className="mt-1 text-sm text-muted-foreground">{"仅此处列出的 MCP 客户端可使用网关，留空允许所有客户端。JWT 认证的客户端通过代理配置 litellm_jwtauth.mcp_client_id_jwt_field 指定的声明（例如 azp 或 client_id）识别，该声明由身份提供商确认，客户端无法更改。其他客户端通过下方启用的请求头识别。"}</p>
      </div>

      <Card className="p-6">
        {storedAllowlistIsMalformed && (
          <p className="mb-2 text-sm text-destructive">{"已存储的白名单不是别名和值的配对列表，因此拒绝所有客户端。添加允许的客户端并保存以替换，或保存空列表以移除限制并重新允许所有客户端。"}</p>
        )}
        {storedAllowlistIsEmpty && (
          <p className="mb-2 text-sm text-destructive">{"当前存储的空白名单会拒绝所有客户端。保持列表为空并保存，即可删除此限制并重新允许所有客户端。"}</p>
        )}
        {allowedClients.length > 0 && (
          <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {allowedClients.map((row) => (
              <button
                key={row.key}
                type="button"
                className="flex min-w-0 flex-col items-start gap-1 rounded-lg border border-border bg-background p-3 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onClick={() => setClientDraft(row)}
              >
                <span className="w-full truncate text-sm font-medium">{row.alias}</span>
                <span className="w-full truncate font-mono text-xs text-muted-foreground">{row.value}</span>
              </button>
            ))}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setClientDraft({ key: null, alias: "", value: "" })}
        >
          <Plus />{"添加客户端"}</Button>
        <p className="mt-2 text-xs text-muted-foreground">{"点击客户端以编辑或移除，列表留空允许所有客户端。未列入名单或无法识别身份的客户端，其每次 MCP 请求均返回 403。"}</p>

        <div className="mt-6 mb-2 flex items-center">
          <p className="text-sm font-medium">{"客户端身份请求头（安全性较低）"}</p>
        </div>
        <Input
          aria-label={"客户端身份请求头"}
          value={clientIdHeader}
          placeholder={"留空则仅通过 JWT 识别客户端，例如 x-mcp-client"}
          onChange={(e) => setClientIdHeader(e.target.value)}
        />
        <p className="mt-2 text-xs text-muted-foreground">{"可选请求头，用于识别没有 JWT 身份的客户端。此值由客户端自行填写，仅用于策略控制，不构成安全边界。设置白名单时，如未配置此请求头，缺少 JWT 声明的调用方会被拒绝。"}</p>
      </Card>

      <div>
        <p className="text-lg font-semibold">{"提供的能力"}</p>
        <p className="mt-1 text-sm text-muted-foreground">{"如果 MCP 服务器均不提供提示词或资源，可关闭对应能力。关闭后初始化响应不再包含该能力，列表调用直接返回空列表而不联系上游，获取或读取调用会被拒绝。"}</p>
      </div>

      <Card className="space-y-4 p-6">
        {CAPABILITY_TOGGLES.map(({ capability, label, description }) => (
          <div key={capability} className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor={`${capabilityToggleId}-${capability}`} className="text-sm font-medium">
                {label}
              </Label>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Switch
              id={`${capabilityToggleId}-${capability}`}
              size="sm"
              checked={!disabledCapabilities.includes(capability)}
              onCheckedChange={(served) => setCapabilityServed(capability, served)}
            />
          </div>
        ))}
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save />{"保存"}</Button>
      </div>

      <AllowedClientDialog
        draft={clientDraft}
        onChange={setClientDraft}
        onCommit={commitClientDraft}
        onRemove={removeDraftedClient}
        onClose={() => setClientDraft(null)}
      />
    </div>
  );
};

export default MCPNetworkSettings;
