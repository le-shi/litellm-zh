import React from "react";
import { UiLoadingSpinner } from "../ui/ui-loading-spinner";

interface ChartLoaderProps {
  isDateChanging?: boolean;
}

export const ChartLoader: React.FC<ChartLoaderProps> = ({ isDateChanging = false }) => (
  <div className="flex items-center justify-center h-40">
    <div className="flex items-center justify-center gap-3">
      <UiLoadingSpinner className="size-5" />
      <div className="flex flex-col">
        <span className="text-muted-foreground text-sm font-medium">
          {isDateChanging ? "正在处理日期选择…" : "正在加载图表数据…"}
        </span>
        <span className="text-muted-foreground text-xs mt-1">
          {isDateChanging ? "请稍候，即将完成" : "正在获取数据"}
        </span>
      </div>
    </div>
  </div>
);

export default ChartLoader;
