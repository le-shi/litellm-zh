import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

interface CreatedKeyDisplayProps {
  apiKey: string;
}

/**
 * Shared component for displaying a newly-created virtual key.
 * Used on the Virtual Keys page and in the Add Agent wizard.
 */
const CreatedKeyDisplay: React.FC<CreatedKeyDisplayProps> = ({ apiKey }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    toast.success("密钥已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
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
    </div>
  );
};

export default CreatedKeyDisplay;
