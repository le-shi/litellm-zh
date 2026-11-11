import { Info } from "lucide-react";
import React from "react";
import { SimpleTooltip } from "@/components/ui/tooltip";

import { MountedFormField } from "@/components/common_components/MountedFormField";
import UpstreamTokenHeaderField from "./UpstreamTokenHeaderField";
import { requiredRule } from "@/components/common_components/formRules";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requiredUnlessSiblingSet, tagsControl, textControl } from "./mcpFieldRules";

interface IdJagFormFieldsProps {
  isEditing?: boolean;
}

const fieldClassName = "rounded-lg border-border focus:border-info focus:ring-ring";

const FieldLabel: React.FC<{ label: string; tooltip: string }> = ({ label, tooltip }) => (
  <span className="text-sm font-medium text-foreground flex items-center">
    {label}
    <SimpleTooltip content={tooltip}>
      <Info className="ml-2 size-4 text-info hover:text-info/80 cursor-help" />
    </SimpleTooltip>
  </span>
);

const PRIVATE_KEY_PATH = ["credentials", "client_private_key"] as const;

const IdJagFormFields: React.FC<IdJagFormFieldsProps> = ({ isEditing = false }) => {
  const placeholderSuffix = isEditing ? " (leave blank to keep existing)" : "";
  const requiredWhenCreating = (message: string) =>
    isEditing ? undefined : { validate: { required: requiredRule(message) } };

  return (
    <>
      <MountedFormField
        label={
          <FieldLabel
            label={"组织令牌端点（第一阶段）"}
            tooltip={"组织身份提供方授权服务器的令牌端点。LiteLLM 在此将用户身份断言交换为 ID-JAG 断言，使用 RFC 8693，requested_token_type=urn:ietf:params:oauth:token-type:id-jag。"}
          />
        }
        name="token_exchange_endpoint"
        required={!isEditing}
        rules={requiredWhenCreating("The org token endpoint is required for ID-JAG")}
      >
        {(control) => (
          <Input
            {...textControl(control)}
            placeholder="https://your-org.okta.com/oauth2/v1/token"
            className={fieldClassName}
          />
        )}
      </MountedFormField>
      <MountedFormField
        label={
          <FieldLabel
            label={"资源令牌端点（第二阶段）"}
            tooltip={"上游资源授权服务器的令牌端点。LiteLLM 将 ID-JAG 断言作为 RFC 7523 jwt-bearer 授权提交到此处，获取 MCP 服务接受的访问令牌。"}
          />
        }
        name={["credentials", "id_jag_resource_token_endpoint"]}
        required={!isEditing}
        rules={requiredWhenCreating("The resource token endpoint is required for ID-JAG")}
      >
        {(control) => (
          <Input
            {...textControl(control)}
            placeholder="https://upstream.example.com/oauth2/token"
            className={fieldClassName}
          />
        )}
      </MountedFormField>
      <MountedFormField
        label={<FieldLabel label={"客户端 ID"} tooltip={"LiteLLM 在两个交换步骤中进行身份认证时使用的 OAuth2 客户端 ID。"} />}
        name={["credentials", "client_id"]}
        required={!isEditing}
        rules={requiredWhenCreating("Client ID is required for ID-JAG")}
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
            tooltip={"通过 client_secret_post 验证 LiteLLM 的 OAuth 客户端身份。改用私钥时可留空，私钥优先于此密钥。"}
          />
        }
        name={["credentials", "client_secret"]}
        rules={
          isEditing
            ? undefined
            : {
                deps: ["credentials.client_private_key"],
                validate: {
                  secretOrPrivateKey: requiredUnlessSiblingSet(
                    PRIVATE_KEY_PATH,
                    "Provide either a client secret or a client private key",
                  ),
                },
              }
        }
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
        label={
          <FieldLabel
            label={"客户端私钥（PEM）"}
            tooltip={"用于签署 RFC 7523 private_key_jwt 客户端断言的 PEM 私钥。Okta 跨应用访问通常需要此项。设置后优先于客户端密钥。"}
          />
        }
        name={PRIVATE_KEY_PATH}
      >
        {(control) => (
          <Textarea
            {...textControl(control)}
            rows={3}
            placeholder={`-----BEGIN PRIVATE KEY-----${placeholderSuffix}`}
            className={fieldClassName}
          />
        )}
      </MountedFormField>
      <MountedFormField
        label={
          <FieldLabel
            label={"私钥 ID（可选）"}
            tooltip={"客户端断言 JWT 请求头中的 kid，供身份提供方选择正确的已注册密钥。"}
          />
        }
        name={["credentials", "client_private_key_id"]}
      >
        {(control) => <Input {...textControl(control)} placeholder="my-signing-key-1" className={fieldClassName} />}
      </MountedFormField>
      <MountedFormField
        label={
          <FieldLabel
            label={"客户端断言签名算法（可选）"}
            tooltip={"签署客户端断言 JWT 的算法，默认为 RS256。"}
          />
        }
        name={["credentials", "client_assertion_signing_alg"]}
      >
        {(control) => <Input {...textControl(control)} placeholder="RS256" className={fieldClassName} />}
      </MountedFormField>
      <MountedFormField
        label={
          <FieldLabel
            label={"受众（可选）"}
            tooltip={"在第一个交换步骤中发送的 RFC 8693 audience，用于指定 ID-JAG 断言面向的上游。"}
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
            label={"资源标识（可选）"}
            tooltip={"在第一个交换步骤中发送的 RFC 8707 resource 标识，与 RFC 8693 的 Audience 参数不同。"}
          />
        }
        name={["credentials", "id_jag_resource"]}
      >
        {(control) => (
          <Input {...textControl(control)} placeholder="https://upstream.example.com/mcp" className={fieldClassName} />
        )}
      </MountedFormField>
      <MountedFormField
        label={
          <FieldLabel
            label={"主体令牌类型（可选）"}
            tooltip={"第一个步骤中交换的身份断言类型，默认为 urn:ietf:params:oauth:token-type:id_token。"}
          />
        }
        name="subject_token_type"
      >
        {(control) => (
          <Input
            {...textControl(control)}
            placeholder="urn:ietf:params:oauth:token-type:id_token"
            className={fieldClassName}
          />
        )}
      </MountedFormField>
      <MountedFormField
        label={<FieldLabel label={"权限范围（可选）"} tooltip={"第一个交换步骤中请求的权限范围。"} />}
        name={["credentials", "scopes"]}
      >
        {(control) => <MultiSelect {...tagsControl(control)} placeholder={"添加权限范围"} className="rounded-lg" />}
      </MountedFormField>
      <UpstreamTokenHeaderField />
    </>
  );
};

export default IdJagFormFields;
