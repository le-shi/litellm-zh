import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { ChevronDown, ChevronUp } from "lucide-react";
import anthropicLogo from "../../../public/assets/logos/anthropic.svg";
import openaiLogo from "../../../public/assets/logos/openai_small.svg";
import { getProxyBaseUrl } from "@/components/networking";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

interface CreatedKeyDisplayProps {
  apiKey: string;
}

export const buildAgentInstructions = (baseUrl: string, apiKey: string): string => {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const endpointIntroduction =
    "LiteLLM is a gateway that exposes OpenAI and Anthropic compatible APIs. " +
    `Send the virtual key as a Bearer token (Authorization: Bearer ${apiKey}) to:`;

  return [
    "Use this LiteLLM AI gateway for model inference.",
    "",
    `Gateway URL: ${normalizedBaseUrl}`,
    `Virtual key: ${apiKey}`,
    "",
    endpointIntroduction,
    `- POST ${normalizedBaseUrl}/v1/chat/completions (OpenAI Chat Completions)`,
    `- POST ${normalizedBaseUrl}/v1/responses (OpenAI Responses)`,
    `- POST ${normalizedBaseUrl}/v1/messages (Anthropic Messages)`,
    `- GET ${normalizedBaseUrl}/v1/models (models this key can use)`,
    "",
    `To run Claude Code through this gateway, set ANTHROPIC_BASE_URL=${normalizedBaseUrl} and ANTHROPIC_AUTH_TOKEN=${apiKey}.`,
    `To run Codex through this gateway, set OPENAI_BASE_URL=${normalizedBaseUrl}/v1 and OPENAI_API_KEY=${apiKey}.`,
    "",
    "Docs for everything else LiteLLM supports: https://docs.litellm.ai/docs/",
  ].join("\n");
};

/**
 * Shared component for displaying a newly-created virtual key.
 * Used on the Virtual Keys page and in the Add Agent wizard.
 */
const CreatedKeyDisplay: React.FC<CreatedKeyDisplayProps> = ({ apiKey }) => {
  const [copied, setCopied] = useState(false);
  const [instructionsCopied, setInstructionsCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const baseUrl = getProxyBaseUrl().replace(/\/+$/, "");
  const instructions = buildAgentInstructions(baseUrl, apiKey);

  const handleCopy = () => {
    setCopied(true);
    toast.success("密钥已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyInstructions = () => {
    setInstructionsCopied(true);
    toast.success("指令已复制");
    setTimeout(() => setInstructionsCopied(false), 2000);
  };

  return (
    <div>
      <p className="mb-2">{"请将此密钥保存在安全且可访问的位置。出于安全原因，"}{" "}
        <b>{"你将无法再次查看该密钥"}</b>{" 通过 LiteLLM 账户查看。若丢失此密钥，需要重新生成。"}</p>

      <p className="text-sm text-muted-foreground mt-3 mb-1">{"虚拟密钥："}</p>
      <div className="bg-muted rounded-md p-2.5 mb-2.5">
        <pre className="m-0 whitespace-normal break-words text-foreground">{apiKey}</pre>
      </div>

      <CopyToClipboard text={apiKey} onCopy={handleCopy}>
        <Button className="mt-3">{copied ? "已复制！" : "复制虚拟密钥"}</Button>
      </CopyToClipboard>

      <p className="text-sm text-muted-foreground mt-4 mb-1">{"网关地址："}</p>
      <div className="bg-muted rounded-md p-2.5 mb-2.5 flex items-center justify-between gap-2">
        <pre className="m-0 whitespace-normal break-words text-foreground">{baseUrl}</pre>
        <CopyToClipboard text={baseUrl} onCopy={() => toast.success("网关地址已复制到剪贴板")}>
          <Button type="button" variant="outline" className="shrink-0">{"复制链接"}</Button>
        </CopyToClipboard>
      </div>

      <div className="mt-4 rounded-md border border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{"智能体指令"}</p>
            <img src={anthropicLogo.src} alt="Claude Code" title="Claude Code" className="size-5 object-contain" />
            <img src={openaiLogo.src} alt="Codex" title="Codex" className="size-5 object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <CopyToClipboard text={instructions} onCopy={handleCopyInstructions}>
              <Button type="button">{instructionsCopied ? "已复制！" : "复制说明"}</Button>
            </CopyToClipboard>
            <Button
              type="button"
              variant="outline"
              aria-expanded={showInstructions}
              onClick={() => setShowInstructions((expanded) => !expanded)}
            >
              {showInstructions ? "隐藏" : "显示"}
              {showInstructions ? (
                <ChevronUp aria-hidden="true" className="size-4" />
              ) : (
                <ChevronDown aria-hidden="true" className="size-4" />
              )}
            </Button>
          </div>
        </div>
        {showInstructions && (
          <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-foreground">{instructions}</pre>
        )}
      </div>
    </div>
  );
};

export default CreatedKeyDisplay;
