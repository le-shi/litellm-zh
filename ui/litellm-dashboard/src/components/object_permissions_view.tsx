import React from "react";
import VectorStorePermissions from "./permissions/VectorStorePermissions";
import MCPServerPermissions from "./permissions/MCPServerPermissions";
import AgentPermissions from "./permissions/AgentPermissions";
import type { ObjectPermission } from "./object_permission_types";
import { inheritedGrantTooltip, type InheritedGrant } from "./permissions/inheritedGrants";

interface ObjectPermissionsViewProps {
  objectPermission?: ObjectPermission | null;
  inheritedMcpServers?: InheritedGrant[];
  inheritedAgents?: InheritedGrant[];
  inheritedSkills?: InheritedGrant[];
  unresolvedAccessGroupIds?: string[] | null;
  variant?: "card" | "inline";
  className?: string;
  accessToken?: string | null;
}

export function ObjectPermissionsView({
  objectPermission,
  inheritedMcpServers = [],
  inheritedAgents = [],
  inheritedSkills,
  unresolvedAccessGroupIds,
  variant = "card",
  className = "",
  accessToken,
}: ObjectPermissionsViewProps) {
  const vectorStores = objectPermission?.vector_stores || [];
  const mcpServers = objectPermission?.mcp_servers || [];
  const mcpAccessGroups = objectPermission?.mcp_access_groups || [];
  const mcpToolPermissions = objectPermission?.mcp_tool_permissions || {};
  const mcpToolsets = objectPermission?.mcp_toolsets || [];
  const agents = objectPermission?.agents || [];
  const agentAccessGroups = objectPermission?.agent_access_groups || [];
  const searchTools = objectPermission?.search_tools || [];
  const skills = objectPermission?.skills || [];
  const showsInheritedSkills = inheritedSkills !== undefined;
  const missingAccessGroupIds = unresolvedAccessGroupIds ?? [];
  const inheritedOnlySkills = (inheritedSkills ?? []).filter((grant) => !skills.includes(grant.id));

  const skillsContent = (() => {
    if (missingAccessGroupIds.length > 0) {
      return (
        <p className="mt-1 block text-xs break-words text-destructive">
          Private plugin access is suspended: access group {missingAccessGroupIds.join(", ")} not found. Only enabled
          (public) Claude Code plugins are visible until the id is removed or the group recreated.
        </p>
      );
    }
    if (skills.length === 0 && inheritedOnlySkills.length === 0) {
      return (
        <p className="mt-1 block text-xs text-muted-foreground">
          {showsInheritedSkills
            ? "未授予私有技能权限，仅显示已启用的公开 Claude Code 插件。"
            : "此处未直接授予私有技能权限。本页不列出访问组授予的权限，默认仅显示已启用的公开 Claude Code 插件。"}
        </p>
      );
    }
    return (
      <p className="mt-1 block text-xs break-words text-foreground">
        {skills.join(", ")}
        {skills.length > 0 && inheritedOnlySkills.length > 0 ? ", " : ""}
        {inheritedOnlySkills.map((grant, index) => (
          <span key={grant.id} title={inheritedGrantTooltip(grant)} className="text-muted-foreground">
            {index > 0 ? ", " : ""}
            {grant.id}{" （访问组）"}</span>
        ))}
      </p>
    );
  })();

  const content = (
    <div className={variant === "card" ? "grid grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3 gap-6" : "space-y-4"}>
      <VectorStorePermissions vectorStores={vectorStores} accessToken={accessToken} />
      <MCPServerPermissions
        mcpServers={mcpServers}
        mcpAccessGroups={mcpAccessGroups}
        mcpToolPermissions={mcpToolPermissions}
        mcpToolsets={mcpToolsets}
        inheritedMcpServers={inheritedMcpServers}
        accessToken={accessToken}
      />
      <AgentPermissions
        agents={agents}
        agentAccessGroups={agentAccessGroups}
        inheritedAgents={inheritedAgents}
        accessToken={accessToken}
      />
      <div className="min-w-0 rounded-md border border-border p-4">
        <p className="text-sm font-medium text-foreground">{"搜索工具"}</p>
        {searchTools.length === 0 ? (
          <p className="mt-1 block text-xs text-muted-foreground">{"无限制，此团队可以使用所有已配置的搜索工具。"}</p>
        ) : (
          <p className="mt-1 block text-xs break-words text-foreground">{searchTools.join(", ")}</p>
        )}
      </div>
      <div className="min-w-0 rounded-md border border-border p-4">
        <p className="text-sm font-medium text-foreground">{"技能"}</p>
        {skillsContent}
      </div>
    </div>
  );

  if (variant === "card") {
    return (
      <div className={`@container bg-card border border-border rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-6">
          <div>
            <p className="font-semibold text-foreground">{"对象权限"}</p>
            <p className="text-xs text-muted-foreground">{"向量存储和 MCP 服务器的访问控制"}</p>
          </div>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <p className="font-medium text-foreground mb-3">{"对象权限"}</p>
      {content}
    </div>
  );
}

export default ObjectPermissionsView;
