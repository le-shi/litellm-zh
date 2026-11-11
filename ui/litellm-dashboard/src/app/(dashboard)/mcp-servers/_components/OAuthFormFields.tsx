import { Info } from "lucide-react";
import React from "react";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OAUTH_FLOW } from "@/components/mcp_tools/types";
import { MountedFormField } from "@/components/common_components/MountedFormField";
import { requiredRule } from "@/components/common_components/formRules";
import TokenEndpointAuthMethodField from "./TokenEndpointAuthMethodField";
import UpstreamTokenHeaderField from "./UpstreamTokenHeaderField";
import {
  numberControl,
  parsesAsJson,
  selectControl,
  selectTriggerControl,
  tagsControl,
  textControl,
} from "./mcpFieldRules";

interface OAuthFlowStatus {
  startOAuthFlow: () => void;
  status: string;
  error: string | null;
  tokenResponse: { access_token?: string; expires_in?: number } | null;
}

interface OAuthFormFieldsProps {
  isM2M: boolean;
  isEditing?: boolean;
  oauthFlow?: OAuthFlowStatus;
  initialFlowType?: string;
  /** Link to provider docs for creating an OAuth app (e.g. GitHub). */
  docsUrl?: string | null;
}

const fieldClassName = "rounded-lg border-border focus:border-info focus:ring-ring";

const OAUTH_FLOW_ITEMS = [
  { value: OAUTH_FLOW.M2M, label: "机器到机器（M2M）" },
  { value: OAUTH_FLOW.INTERACTIVE, label: "交互式（PKCE）" },
];

const UPSTREAM_RESOURCE_TOOLTIP =
  "RFC 8707 resource indicator sent to the authorization server so it mints a token audienced for this MCP server. " +
  "Leave blank to send nothing, which is the default and what most providers expect. Use 'auto' to send this server's " +
  "own URL. Set an exact identifier when the authorization server expects a specific one. Some providers reject this " +
  "parameter and take the audience from scopes instead; if you see AADSTS901002, leave it blank. If you see " +
  "invalid_target, the authorization server needs it set.";

const FieldLabel: React.FC<{ label: string; tooltip: string }> = ({ label, tooltip }) => (
  <span className="text-sm font-medium text-foreground flex items-center">
    {label}
    <SimpleTooltip content={tooltip}>
      <Info className="ml-2 size-4 text-info hover:text-info/80 cursor-help" />
    </SimpleTooltip>
  </span>
);

const UpstreamResourceField: React.FC = () => (
  <MountedFormField
    label={<FieldLabel label={"资源标识（可选）"} tooltip={UPSTREAM_RESOURCE_TOOLTIP} />}
    name={["credentials", "upstream_resource"]}
  >
    {(control) => (
      <Input {...textControl(control)} placeholder={"auto，或 https://mcp.example.com/mcp"} className={fieldClassName} />
    )}
  </MountedFormField>
);

const OAuthFormFields: React.FC<OAuthFormFieldsProps> = ({
  isM2M,
  isEditing = false,
  oauthFlow,
  initialFlowType,
  docsUrl,
}) => {
  const placeholderSuffix = isEditing ? " (leave blank to keep existing)" : "";
  const requiredWhenCreating = (message: string) =>
    isEditing ? undefined : { validate: { required: requiredRule(message) } };

  return (
    <>
      <MountedFormField
        label={
          <FieldLabel
            label={"OAuth 流程类型"}
            tooltip={"选择代理对此 MCP 服务的认证方式。M2M 使用客户端凭据进行服务间通信，交互式 PKCE 用于需要浏览器授权的用户流程。"}
          />
        }
        name="oauth_flow_type"
        {...(initialFlowType ? { defaultValue: initialFlowType } : {})}
      >
        {(control) => (
          <Select {...selectControl<string>(control)} items={OAUTH_FLOW_ITEMS}>
            <SelectTrigger {...selectTriggerControl(control)} className="w-full rounded-lg">
              <SelectValue placeholder={"选择 OAuth 流程"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={OAUTH_FLOW.M2M}>
                <div>
                  <span className="font-medium">{"机器到机器（M2M）"}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{"服务器间通信，无需用户交互"}</span>
                </div>
              </SelectItem>
              <SelectItem value={OAUTH_FLOW.INTERACTIVE}>
                <div>
                  <span className="font-medium">{"交互式（PKCE）"}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{"基于浏览器的用户授权"}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </MountedFormField>

      {isM2M ? (
        <>
          <MountedFormField
            label={<FieldLabel label={"客户端 ID"} tooltip={"用于 client_credentials 授权的 OAuth2 客户端 ID。"} />}
            name={["credentials", "client_id"]}
            required={!isEditing}
            rules={requiredWhenCreating("Client ID is required for M2M OAuth")}
          >
            {(control) => (
              <PasswordInput
                {...textControl(control)}
                placeholder={`Enter OAuth client ID${placeholderSuffix}`}
                groupClassName={fieldClassName}
              />
            )}
          </MountedFormField>
          <MountedFormField
            label={
              <FieldLabel label={"客户端密钥"} tooltip={"用于 client_credentials 授权的 OAuth2 客户端密钥。"} />
            }
            name={["credentials", "client_secret"]}
            required={!isEditing}
            rules={requiredWhenCreating("Client Secret is required for M2M OAuth")}
          >
            {(control) => (
              <PasswordInput
                {...textControl(control)}
                placeholder={`Enter OAuth client secret${placeholderSuffix}`}
                groupClassName={fieldClassName}
              />
            )}
          </MountedFormField>
          <MountedFormField
            label={<FieldLabel label={"令牌地址"} tooltip={"用于 client_credentials 授权的令牌端点 URL。"} />}
            name="token_url"
            required={!isEditing}
            rules={requiredWhenCreating("Token URL is required for M2M OAuth")}
          >
            {(control) => (
              <Input
                {...textControl(control)}
                placeholder="https://auth.example.com/oauth/token"
                className={fieldClassName}
              />
            )}
          </MountedFormField>
          <TokenEndpointAuthMethodField isEditing={isEditing} />
          <MountedFormField
            label={
              <FieldLabel
                label={"权限范围（可选）"}
                tooltip={"使用 client_credentials 授权时请求的可选权限范围。"}
              />
            }
            name={["credentials", "scopes"]}
          >
            {(control) => <MultiSelect {...tagsControl(control)} placeholder={"添加权限范围"} className="rounded-lg" />}
          </MountedFormField>
          <UpstreamResourceField />
          <UpstreamTokenHeaderField />
        </>
      ) : (
        <>
          <MountedFormField
            label={
              <span className="flex items-center justify-between w-full">
                <FieldLabel
                  label={"客户端 ID（可选）"}
                  tooltip={"仅在 MCP 服务不支持动态客户端注册时填写。"}
                />
                {docsUrl && (
                  <a
                    href={docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-info hover:text-info/80 ml-2 font-normal"
                    onClick={(e) => e.stopPropagation()}
                  >{"创建 OAuth 应用"}</a>
                )}
              </span>
            }
            name={["credentials", "client_id"]}
          >
            {(control) => (
              <PasswordInput
                {...textControl(control)}
                placeholder={`Enter client ID${placeholderSuffix}`}
                groupClassName={fieldClassName}
              />
            )}
          </MountedFormField>
          <MountedFormField
            label={
              <FieldLabel
                label={"客户端密钥（可选）"}
                tooltip={"仅在 MCP 服务不支持动态客户端注册时填写。"}
              />
            }
            name={["credentials", "client_secret"]}
          >
            {(control) => (
              <PasswordInput
                {...textControl(control)}
                placeholder={`Enter client secret${placeholderSuffix}`}
                groupClassName={fieldClassName}
              />
            )}
          </MountedFormField>
          <MountedFormField
            label={
              <FieldLabel
                label={"权限范围（可选）"}
                tooltip={"令牌交换时请求的可选权限范围，多个范围用回车或逗号分隔。"}
              />
            }
            name={["credentials", "scopes"]}
          >
            {(control) => <MultiSelect {...tagsControl(control)} placeholder={"添加权限范围"} className="rounded-lg" />}
          </MountedFormField>
          <UpstreamResourceField />
          <UpstreamTokenHeaderField />
          <MountedFormField
            label={
              <FieldLabel
                label={"签发者（可选）"}
                tooltip={"OAuth 2.0 授权服务器的 issuer（RFC 8414）。留空时从上游资源发现端点；填写后固定信任来源，仅使用该 issuer 的元数据文档作为端点来源（RFC 8414 第 3.3 节），覆盖上方授权、令牌和注册 URL。无法获取元数据时将拒绝继续。"}
              />
            }
            name="issuer"
          >
            {(control) => (
              <Input {...textControl(control)} placeholder="https://issuer.example.com" className={fieldClassName} />
            )}
          </MountedFormField>
          <MountedFormField
            label={
              <FieldLabel
                label={"授权地址（可选）"}
                tooltip={"可选，覆盖授权端点。"}
              />
            }
            name="authorization_url"
          >
            {(control) => (
              <Input
                {...textControl(control)}
                placeholder="https://example.com/oauth/authorize"
                className={fieldClassName}
              />
            )}
          </MountedFormField>
          <MountedFormField
            label={<FieldLabel label={"令牌地址（可选）"} tooltip={"可选，覆盖令牌端点。"} />}
            name="token_url"
          >
            {(control) => (
              <Input
                {...textControl(control)}
                placeholder="https://example.com/oauth/token"
                className={fieldClassName}
              />
            )}
          </MountedFormField>
          <TokenEndpointAuthMethodField isEditing={isEditing} />
          <MountedFormField
            label={
              <FieldLabel
                label={"注册地址（可选）"}
                tooltip={"可选，覆盖动态客户端注册端点。"}
              />
            }
            name="registration_url"
          >
            {(control) => (
              <Input
                {...textControl(control)}
                placeholder="https://example.com/oauth/register"
                className={fieldClassName}
              />
            )}
          </MountedFormField>
          <MountedFormField
            label={
              <FieldLabel
                label={"令牌校验规则（可选）"}
                tooltip={"在存储 OAuth 令牌前，对令牌响应进行键值规则校验，规则使用 JSON 对象。支持用点号指定嵌套字段，例如 {\"organization\": \"my-org\", \"team.id\": \"123\"}。校验失败的令牌将被拒绝，返回 HTTP 403。"}
              />
            }
            name="token_validation_json"
            rules={{ validate: { json: parsesAsJson("Must be valid JSON") } }}
          >
            {(control) => (
              <Textarea
                {...textControl(control)}
                placeholder={'{\n  "organization": "my-org",\n  "team.id": "123"\n}'}
                rows={4}
                className="font-mono text-sm rounded-lg border-border focus:border-info focus:ring-ring"
              />
            )}
          </MountedFormField>
          <MountedFormField
            label={
              <FieldLabel
                label={"令牌保存时长（秒，可选）"}
                tooltip={"每位用户的 OAuth 访问令牌在 Redis 中的缓存时长，不会超过令牌自身的 expires_in。留空时根据 expires_in 确定 TTL，无法确定时使用默认的 12 小时。"}
              />
            }
            name="token_storage_ttl_seconds"
          >
            {(control) => (
              <Input {...numberControl(control)} min={1} placeholder="e.g. 3600" className="w-full rounded-lg" />
            )}
          </MountedFormField>
          {oauthFlow && (
            <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
              <p className="text-sm text-muted-foreground">{"通过 OAuth 获取新的访问令牌，并作为认证值临时保留在会话中。"}</p>
              <Button
                variant="secondary"
                onClick={oauthFlow.startOAuthFlow}
                disabled={oauthFlow.status === "authorizing" || oauthFlow.status === "exchanging"}
              >
                {oauthFlow.status === "authorizing"
                  ? "正在等待授权…"
                  : oauthFlow.status === "exchanging"
                    ? "正在交换授权码…"
                    : "授权并获取令牌"}
              </Button>
              {oauthFlow.error && <p className="text-sm text-destructive">{oauthFlow.error}</p>}
              {oauthFlow.status === "success" && oauthFlow.tokenResponse?.access_token && (
                <p className="text-sm text-success">{"已获取令牌，剩余有效期 "}{oauthFlow.tokenResponse.expires_in ?? "?"}{" 秒。"}</p>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default OAuthFormFields;
