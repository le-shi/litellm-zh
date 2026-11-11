import { Info } from "lucide-react";
import React from "react";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { useWatch } from "react-hook-form";

import { MountedFormField } from "@/components/common_components/MountedFormField";
import UpstreamTokenHeaderField from "./UpstreamTokenHeaderField";
import { requiredRule } from "@/components/common_components/formRules";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Input } from "@/components/ui/input";
import { selectControl, selectTriggerControl, tagsControl, textControl } from "./mcpFieldRules";

interface TokenExchangeFormFieldsProps {
  isEditing?: boolean;
}

const fieldClassName = "rounded-lg border-border focus:border-info focus:ring-ring";

const TOKEN_EXCHANGE_PROFILE_ITEMS = [
  { value: "rfc8693", label: "RFC 8693（标准）" },
  { value: "entra_obo", label: "Microsoft Entra OBO" },
];

const FieldLabel: React.FC<{ label: string; tooltip: string }> = ({ label, tooltip }) => (
  <span className="text-sm font-medium text-foreground flex items-center">
    {label}
    <SimpleTooltip content={tooltip}>
      <Info className="ml-2 size-4 text-info hover:text-info/80 cursor-help" />
    </SimpleTooltip>
  </span>
);

const TokenExchangeFormFields: React.FC<TokenExchangeFormFieldsProps> = ({ isEditing = false }) => {
  const placeholderSuffix = isEditing ? " (leave blank to keep existing)" : "";
  const isEntraObo = useWatch({ name: "token_exchange_profile" }) === "entra_obo";
  const requiredWhenCreating = (message: string) =>
    isEditing ? undefined : { validate: { required: requiredRule(message) } };

  return (
    <>
      <MountedFormField
        label={
          <FieldLabel
            label={"个人资料"}
            tooltip={"令牌交换协议格式。RFC 8693 是标准令牌交换授权。Microsoft Entra OBO 使用 Entra 的代用户授权格式，即 RFC 7523 jwt-bearer 授权和 requested_token_use=on_behalf_of，并通过 api://<app-id>/.default 等权限范围指定目标资源。"}
          />
        }
        name="token_exchange_profile"
        {...(isEditing ? {} : { defaultValue: "rfc8693" })}
      >
        {(control) => (
          <Select {...selectControl<string>(control)} items={TOKEN_EXCHANGE_PROFILE_ITEMS}>
            <SelectTrigger {...selectTriggerControl(control)} className="w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOKEN_EXCHANGE_PROFILE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  <span className="font-medium">{item.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </MountedFormField>
      <MountedFormField
        label={
          <FieldLabel
            label={"令牌交换端点（可选）"}
            tooltip={"RFC 8693 令牌端点。代理在此将用户传入的令牌交换为带权限范围的令牌，用于调用上游 MCP 服务。留空时从上游受保护资源元数据中自动发现，依次使用 RFC 9728 和 RFC 8414。"}
          />
        }
        name="token_exchange_endpoint"
      >
        {(control) => (
          <Input
            {...textControl(control)}
            placeholder="https://idp.example.com/oauth2/token"
            className={fieldClassName}
          />
        )}
      </MountedFormField>
      <MountedFormField
        label={
          <FieldLabel
            label={"客户端 ID"}
            tooltip={"向令牌交换端点认证时使用的 OAuth2 客户端 ID。"}
          />
        }
        name={["credentials", "client_id"]}
        required={!isEditing}
        rules={requiredWhenCreating("Client ID is required for token exchange")}
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
          <FieldLabel
            label={"客户端密钥"}
            tooltip={"向令牌交换端点认证时使用的 OAuth2 客户端密钥。"}
          />
        }
        name={["credentials", "client_secret"]}
        required={!isEditing}
        rules={requiredWhenCreating("Client Secret is required for token exchange")}
      >
        {(control) => (
          <PasswordInput
            {...textControl(control)}
            placeholder={`Enter OAuth client secret${placeholderSuffix}`}
            groupClassName={fieldClassName}
          />
        )}
      </MountedFormField>
      {!isEntraObo && (
        <>
          <MountedFormField
            label={
              <FieldLabel
                label={"受众（可选）"}
                tooltip={"交换后令牌的目标受众（RFC 8693 audience），用于指定令牌面向的上游 MCP 服务。"}
              />
            }
            name="audience"
          >
            {(control) => (
              <Input {...textControl(control)} placeholder="https://upstream.example.com" className={fieldClassName} />
            )}
          </MountedFormField>
          <MountedFormField
            label={
              <FieldLabel
                label={"主体令牌类型（可选）"}
                tooltip={"用户传入令牌的类型（RFC 8693 subject_token_type），默认为 urn:ietf:params:oauth:token-type:access_token。"}
              />
            }
            name="subject_token_type"
          >
            {(control) => (
              <Input
                {...textControl(control)}
                placeholder="urn:ietf:params:oauth:token-type:access_token"
                className={fieldClassName}
              />
            )}
          </MountedFormField>
        </>
      )}
      <MountedFormField
        label={
          <FieldLabel
            label={isEntraObo ? "权限范围" : "权限范围（可选）"}
            tooltip={
              isEntraObo
                ? "Microsoft Entra OBO 通过权限范围指定目标资源，至少需要一项，例如 api://<app-id>/.default。"
                : "令牌交换时请求的可选权限范围。"
            }
          />
        }
        name={["credentials", "scopes"]}
        required={isEntraObo}
        rules={
          isEntraObo
            ? {
                validate: {
                  required: requiredRule("Microsoft Entra OBO requires a scope, e.g. api://<app-id>/.default"),
                },
              }
            : undefined
        }
      >
        {(control) => (
          <MultiSelect
            {...tagsControl(control)}
            placeholder={isEntraObo ? "api://<app-id>/.default" : "添加权限范围"}
            className="rounded-lg"
          />
        )}
      </MountedFormField>
      <UpstreamTokenHeaderField />
    </>
  );
};

export default TokenExchangeFormFields;
