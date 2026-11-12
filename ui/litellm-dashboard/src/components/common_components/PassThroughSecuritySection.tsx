import React from "react";

import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export interface PassThroughSecuritySectionProps {
  authEnabled: boolean;
  onAuthChange: (checked: boolean) => void;
}

const PassThroughSecuritySection: React.FC<PassThroughSecuritySectionProps> = ({ authEnabled, onAuthChange }) => {
  return (
    <Card className="block p-6">
      <h3 className="mb-2 text-lg font-semibold text-foreground">{"安全"}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{"启用后，请求此端点必须提供有效的 LiteLLM 虚拟密钥"}</p>
      <Switch aria-label={"要求 LiteLLM 身份认证"} checked={authEnabled} onCheckedChange={onAuthChange} />
    </Card>
  );
};

export default PassThroughSecuritySection;
