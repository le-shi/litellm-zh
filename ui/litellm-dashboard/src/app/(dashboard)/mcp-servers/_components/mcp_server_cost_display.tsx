import React from "react";
import { MCPServerCostInfo } from "@/components/mcp_tools/types";

interface MCPServerCostDisplayProps {
  costConfig?: MCPServerCostInfo | null;
}

const MCPServerCostDisplay: React.FC<MCPServerCostDisplayProps> = ({ costConfig }) => {
  const hasDefaultCost =
    costConfig?.default_cost_per_query !== undefined && costConfig?.default_cost_per_query !== null;
  const hasToolCosts =
    costConfig?.tool_name_to_cost_per_query && Object.keys(costConfig.tool_name_to_cost_per_query).length > 0;
  const hasCostConfig = hasDefaultCost || hasToolCosts;

  if (!hasCostConfig) {
    return (
      <div className="mt-6 border-t border-border pt-6">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted p-4">
            <p className="text-sm text-muted-foreground">{"此服务器尚未配置费用，工具调用费用为每次 0.00 美元。"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-border pt-6">
      <div className="space-y-4">
        {hasDefaultCost &&
          costConfig?.default_cost_per_query !== undefined &&
          costConfig?.default_cost_per_query !== null && (
            <div>
              <p className="text-sm font-medium">{"默认每次查询费用"}</p>
              <div className="font-mono text-sm">${costConfig.default_cost_per_query.toFixed(4)}</div>
            </div>
          )}

        {hasToolCosts && costConfig?.tool_name_to_cost_per_query && (
          <div>
            <p className="text-sm font-medium">{"工具独立费用"}</p>
            <div className="mt-2 space-y-2">
              {Object.entries(costConfig.tool_name_to_cost_per_query).map(
                ([toolName, cost]) =>
                  cost !== null &&
                  cost !== undefined && (
                    <div key={toolName} className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <p className="text-sm font-medium">{toolName}</p>
                      <p className="font-mono text-sm">${cost.toFixed(4)}{" 每次查询"}</p>
                    </div>
                  ),
              )}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-lg border border-border bg-muted p-4">
          <p className="text-sm font-medium">{"费用汇总："}</p>
          <div className="mt-2 space-y-1">
            {hasDefaultCost &&
              costConfig?.default_cost_per_query !== undefined &&
              costConfig?.default_cost_per_query !== null && (
                <p className="text-sm text-muted-foreground">{"• 默认费用：$"}{costConfig.default_cost_per_query.toFixed(4)}{" 每次查询"}</p>
              )}
            {hasToolCosts && costConfig?.tool_name_to_cost_per_query && (
              <p className="text-sm text-muted-foreground">
                • {Object.keys(costConfig.tool_name_to_cost_per_query).length}{" 个工具使用自定义定价"}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCPServerCostDisplay;
