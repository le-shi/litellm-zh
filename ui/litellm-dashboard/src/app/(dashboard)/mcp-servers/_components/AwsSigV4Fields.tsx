import { Info } from "lucide-react";
import React from "react";
import { SimpleTooltip } from "@/components/ui/tooltip";

import { MountedFormField } from "@/components/common_components/MountedFormField";
import { requiredRule } from "@/components/common_components/formRules";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Input } from "@/components/ui/input";
import { requiredWhenSiblingSet, textControl } from "./mcpFieldRules";

const fieldClassName = "rounded-lg border-border focus:border-info focus:ring-ring";

const FieldLabel: React.FC<{ label: string; tooltip: string }> = ({ label, tooltip }) => (
  <span className="text-sm font-medium text-foreground flex items-center">
    {label}
    <SimpleTooltip content={tooltip}>
      <Info className="ml-2 size-4 text-info hover:text-info/80 cursor-help" />
    </SimpleTooltip>
  </span>
);

const ACCESS_KEY_PATH = ["credentials", "aws_access_key_id"] as const;
const SECRET_KEY_PATH = ["credentials", "aws_secret_access_key"] as const;

const AwsSigV4Fields: React.FC = () => (
  <>
    <p className="text-sm text-muted-foreground mb-2">{"适用于托管在 AWS Bedrock AgentCore 上的 MCP 服务器。"}{" "}
      <a
        href="https://docs.litellm.ai/docs/mcp_aws_sigv4"
        target="_blank"
        rel="noopener noreferrer"
        className="text-info hover:text-info/80"
      >{"查看文档"}</a>
    </p>
    <MountedFormField
      label={<FieldLabel label={"AWS 区域"} tooltip={"用于 SigV4 签名的 AWS 区域，例如 us-east-1"} />}
      name={["credentials", "aws_region_name"]}
      required
      rules={{ validate: { required: requiredRule("AWS region is required for SigV4 auth") } }}
    >
      {(control) => <Input {...textControl(control)} placeholder="us-east-1" className={fieldClassName} />}
    </MountedFormField>
    <MountedFormField
      label={
        <FieldLabel
          label={"AWS 服务名称"}
          tooltip={"用于 SigV4 签名的 AWS 服务名称，默认为 bedrock-agentcore。"}
        />
      }
      name={["credentials", "aws_service_name"]}
    >
      {(control) => <Input {...textControl(control)} placeholder="bedrock-agentcore" className={fieldClassName} />}
    </MountedFormField>
    <MountedFormField
      label={
        <FieldLabel
          label={"AWS 访问密钥 ID"}
          tooltip={"可选。留空时使用 boto3 凭据链，例如 IAM 角色、环境变量等。"}
        />
      }
      name={ACCESS_KEY_PATH}
      rules={{
        deps: ["credentials.aws_secret_access_key"],
        validate: {
          pairedWithSecret: requiredWhenSiblingSet(
            SECRET_KEY_PATH,
            "Access Key ID is required when Secret Access Key is provided",
          ),
        },
      }}
    >
      {(control) => (
        <PasswordInput
          {...textControl(control)}
          placeholder={"AKIA...（可选，留空时使用 IAM 角色）"}
          groupClassName={fieldClassName}
        />
      )}
    </MountedFormField>
    <MountedFormField
      label={
        <FieldLabel label={"AWS 秘密访问密钥"} tooltip={"可选。填写 AWS Access Key ID 时，此项必填。"} />
      }
      name={SECRET_KEY_PATH}
      rules={{
        deps: ["credentials.aws_access_key_id"],
        validate: {
          pairedWithAccessKey: requiredWhenSiblingSet(
            ACCESS_KEY_PATH,
            "Secret Access Key is required when Access Key ID is provided",
          ),
        },
      }}
    >
      {(control) => (
        <PasswordInput
          {...textControl(control)}
          placeholder={"输入访问密钥（可选，留空时使用 IAM 角色）"}
          groupClassName={fieldClassName}
        />
      )}
    </MountedFormField>
    <MountedFormField
      label={<FieldLabel label={"AWS 会话令牌"} tooltip={"可选。仅临时 STS 凭据需要此项。"} />}
      name={["credentials", "aws_session_token"]}
    >
      {(control) => (
        <PasswordInput
          {...textControl(control)}
          placeholder={"输入会话令牌（可选）"}
          groupClassName={fieldClassName}
        />
      )}
    </MountedFormField>
    <MountedFormField
      label={
        <FieldLabel
          label={"AWS 角色 ARN"}
          tooltip={"可选。填写签名前通过 STS 扮演的 IAM 角色 ARN。设置后，LiteLLM 调用 sts:AssumeRole 获取临时凭据。若未显式提供密钥，将使用 IAM 角色、环境变量等环境凭据作为来源身份。"}
        />
      }
      name={["credentials", "aws_role_name"]}
    >
      {(control) => (
        <Input
          {...textControl(control)}
          placeholder={"arn:aws:iam::123456789012:role/MyRole（可选）"}
          className={fieldClassName}
        />
      )}
    </MountedFormField>
    <MountedFormField
      label={
        <FieldLabel
          label={"AWS 会话名称"}
          tooltip={"可选。AssumeRole 调用的会话名称，会显示在 CloudTrail 日志中。留空时自动生成。"}
        />
      }
      name={["credentials", "aws_session_name"]}
    >
      {(control) => (
        <Input
          {...textControl(control)}
          placeholder={"litellm-prod（可选，留空时自动生成）"}
          className={fieldClassName}
        />
      )}
    </MountedFormField>
  </>
);

export default AwsSigV4Fields;
