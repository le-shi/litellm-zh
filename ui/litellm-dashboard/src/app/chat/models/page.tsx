"use client";

import ModelHubTable from "@/components/AIHub/ModelHubTable";
import PublicModelHub from "@/components/public_model_hub";
import { useChatShell } from "@/contexts/ChatShellContext";
import { isAdminRole } from "@/utils/roles";

export default function ChatModelsPage() {
  const { accessToken, userRole, premiumUser } = useChatShell();

  return (
    <div className="moyai-models-page">
      <div className="moyai-models-content">
        <header className="moyai-models-header">
          <p className="text-xs font-medium text-muted-foreground">{"模型中心"}</p>
          <h1>{"模型"}</h1>
          <p className="text-sm text-muted-foreground">{"浏览提供商、比较价格和模型能力，找到适合您的模型。"}</p>
        </header>
        {isAdminRole(userRole) ? (
          <ModelHubTable
            accessToken={accessToken}
            publicPage={false}
            premiumUser={premiumUser}
            userRole={userRole}
            canOpenPlayground={false}
            canAddModels={false}
            variant="chat"
          />
        ) : (
          <PublicModelHub accessToken={accessToken} isEmbedded variant="chat" />
        )}
      </div>
    </div>
  );
}
