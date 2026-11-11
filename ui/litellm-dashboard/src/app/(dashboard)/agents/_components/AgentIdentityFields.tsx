import React, { useEffect, useState } from "react";
import { useWatch } from "react-hook-form";
import { apiClient } from "@/components/networking";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgentFormField, type AgentFormValues } from "./AgentFormKit";
import { entraTenantFromIssuer, IDENTITY_UUID_PATTERN } from "./agent_identity";

const PROVIDER_OPTIONS = [
  { value: "none", label: "No explicit identity binding" },
  { value: "microsoft_entra", label: "Microsoft Entra ID" },
];
const EXECUTION_MODE_OPTIONS = [
  { value: "autonomous", label: "Autonomous" },
  { value: "delegated", label: "On behalf of a user" },
  { value: "both", label: "Both" },
];
const EXECUTION_OPTIONS = [
  { value: "enabled", label: "已启用" },
  { value: "disabled", label: "已禁用" },
];

export const AgentIdentityFields = ({ accessToken }: { accessToken: string | null }) => {
  const provider = useWatch<AgentFormValues>({ name: "identity_provider" });
  const mode = useWatch<AgentFormValues>({ name: "execution_mode" });
  const showScopes = mode !== "autonomous" && mode !== undefined;
  const [tenants, setTenants] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || provider !== "microsoft_entra") return;
    let active = true;
    apiClient
      .get<string[]>("/v1/agents/identity/providers", { accessToken })
      .then((issuers) => {
        if (active) {
          setError(null);
          setTenants(
            issuers.flatMap((issuer) => {
              const tenant = entraTenantFromIssuer(issuer);
              return tenant ? [tenant] : [];
            }),
          );
        }
      })
      .catch(() => {
        if (active) setError("Could not load the gateway's trusted identity providers");
      });
    return () => {
      active = false;
    };
  }, [accessToken, provider]);

  return (
    <>
      <section aria-label={"智能体身份"} className="my-6 space-y-4 rounded-lg border border-border p-4">
        <div>
          <h3 className="font-medium">{"智能体身份"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{"将已有身份提供商应用连接到此智能体，其名称和运行地址可独立更改。"}</p>
        </div>
        <AgentFormField name="identity_provider" label={"身份提供商"} defaultValue="none">
          {({ value, onChange, id }) => (
            <Select
              items={PROVIDER_OPTIONS}
              value={typeof value === "string" ? value : "none"}
              onValueChange={onChange}
            >
              <SelectTrigger id={id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </AgentFormField>
        {provider === "microsoft_entra" && (
          <>
            <AgentFormField
              name="identity_tenant_id"
              label={"可信 Entra 租户"}
              rules={{ required: "Select a trusted tenant" }}
            >
              {({ value, onChange, id }) => (
                <Select value={typeof value === "string" ? value : ""} onValueChange={onChange}>
                  <SelectTrigger id={id}>
                    <SelectValue placeholder={"选择网关的可信租户"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant} value={tenant}>
                        {tenant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </AgentFormField>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {!error && tenants.length === 0 && (
              <p className="text-sm text-muted-foreground">{"没有可用的可信 Entra 租户。请先在网关配置 JWT 签发者和受众校验。管理界面的 Microsoft SSO 需单独配置。"}</p>
            )}
            <AgentFormField
              name="identity_client_id"
              label={"应用程序（客户端）ID"}
              rules={{
                required: "Enter the Entra application client ID",
                pattern: { value: IDENTITY_UUID_PATTERN, message: "Enter a valid application client UUID" },
              }}
              description={
                <>{"查找位置："}{" "}
                  <a className="underline" href="https://entra.microsoft.com/" target="_blank" rel="noreferrer">{"Entra 应用注册"}</a>{"，选择智能体应用，再打开概览。此处不需要客户端密钥。"}</>
              }
            >
              {({ value, onChange, ref, ...control }) => (
                <Input
                  {...control}
                  ref={ref}
                  value={typeof value === "string" ? value : ""}
                  onChange={onChange}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              )}
            </AgentFormField>
            <AgentFormField name="execution_mode" label={"执行模式"} defaultValue="autonomous">
              {({ value, onChange, id }) => (
                <Select
                  items={EXECUTION_MODE_OPTIONS}
                  value={typeof value === "string" ? value : "autonomous"}
                  onValueChange={onChange}
                >
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXECUTION_MODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </AgentFormField>
            <AgentFormField
              name="identity_service_principal_id"
              label={"企业应用对象 ID"}
              rules={{
                required: mode !== "delegated" ? "Enter the service principal Object ID" : false,
                pattern: { value: IDENTITY_UUID_PATTERN, message: "Enter a valid service principal UUID" },
              }}
              description={
                <>{"打开"}{" "}
                  <a
                    className="underline"
                    href="https://entra.microsoft.com/#view/Microsoft_AAD_IAM/StartboardApplicationsMenuBlade/~/AppAppsPreview"
                    target="_blank"
                    rel="noreferrer"
                  >{"Entra 企业应用"}</a>{"，选择此应用并复制其对象 ID。此值与应用注册中的对象 ID 不同。"}</>
              }
            >
              {({ value, onChange, ref, ...control }) => (
                <Input {...control} ref={ref} value={typeof value === "string" ? value : ""} onChange={onChange} />
              )}
            </AgentFormField>

            <AgentFormField
              name="identity_required_roles"
              label={"必需的应用角色"}
              description={"自主应用令牌所需的角色值，以逗号分隔"}
            >
              {({ value, onChange, ref, ...control }) => (
                <Input
                  {...control}
                  ref={ref}
                  value={typeof value === "string" ? value : ""}
                  onChange={onChange}
                  placeholder="Agent.Invoke"
                />
              )}
            </AgentFormField>

            {showScopes && (
              <>
                <AgentFormField
                  name="identity_required_scopes"
                  label={"必需的委托权限范围"}
                  defaultValue="user_impersonation"
                  rules={{ required: "Enter a delegated scope" }}
                >
                  {({ value, onChange, ref, ...control }) => (
                    <Input
                      {...control}
                      ref={ref}
                      value={typeof value === "string" ? value : "user_impersonation"}
                      onChange={onChange}
                    />
                  )}
                </AgentFormField>
                <p className="text-sm text-muted-foreground">
                  Users must first sign in through this gateway&apos;s Microsoft SSO. Subsequent delegated calls must
                  satisfy both user and agent permissions.
                </p>
              </>
            )}
            <AgentFormField name="enabled" label={"执行"} defaultValue={true}>
              {({ value, onChange, id }) => (
                <Select
                  items={EXECUTION_OPTIONS}
                  value={value === false ? "disabled" : "enabled"}
                  onValueChange={(next) => onChange(next === "enabled")}
                >
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXECUTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </AgentFormField>
            <p className="text-sm text-muted-foreground">
              LiteLLM verifies the agent&apos;s Entra token before matching this identity. Saving these fields
              configures the binding; an authenticated request provides verification. Runtime authentication headers are
              configured separately.
            </p>
          </>
        )}
      </section>
    </>
  );
};
