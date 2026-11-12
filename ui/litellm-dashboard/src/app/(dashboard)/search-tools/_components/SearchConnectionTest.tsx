import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { testSearchToolConnection } from "@/components/networking";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";

interface SearchConnectionTestProps {
  litellmParams: Record<string, any>;
  accessToken: string;
  onTestComplete?: () => void;
}

const SearchConnectionTest: React.FC<SearchConnectionTestProps> = ({ litellmParams, accessToken, onTestComplete }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [testResult, setTestResult] = useState<{
    status: "success" | "error";
    message: string;
    test_query?: string;
    results_count?: number;
    error_type?: string;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const runTest = async () => {
      setIsLoading(true);
      try {
        const result = await testSearchToolConnection(accessToken, litellmParams);
        setTestResult(result);
        if (result.status === "success") {
          toast.success("连接测试成功");
        }
      } catch (error) {
        setTestResult({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          error_type: "NetworkError",
        });
      } finally {
        setIsLoading(false);
        if (onTestComplete) {
          onTestComplete();
        }
      }
    };

    runTest();
  }, [accessToken, litellmParams, onTestComplete]);

  const getCleanErrorMessage = (errorMsg: string) => {
    if (!errorMsg) return "Unknown error";

    const mainError = errorMsg.split("stack trace:")[0].trim();

    const cleanedError = mainError.replace(/^litellm\.(.*?)Error:\s*/, "");

    const finalError = cleanedError.replace(/^AuthenticationError:\s*/, "");

    if (finalError.includes("<html>") || finalError.includes("<!DOCTYPE")) {
      const titleMatch = finalError.match(/<title>(.*?)<\/title>/);
      if (titleMatch) {
        return titleMatch[1];
      }
      if (finalError.includes("401") || finalError.includes("Authorization Required")) {
        return "Authentication failed: Invalid API key or credentials";
      }
      return "Authentication error - please check your API key";
    }

    if (finalError.length > 200) {
      return finalError.substring(0, 200) + "...";
    }

    return finalError;
  };

  const errorMessage = testResult?.message ? getCleanErrorMessage(testResult.message) : "Unknown error";

  if (isLoading) {
    return (
      <div className="rounded-lg bg-card p-6">
        <div className="flex flex-col items-center justify-center px-5 py-8">
          <UiLoadingSpinner className="mb-4 size-8 text-primary" />
          <p className="text-base text-foreground">{"正在测试连接： "}{litellmParams.search_provider || "search provider"}...
          </p>
        </div>
      </div>
    );
  }

  if (!testResult) {
    return null;
  }

  return (
    <div className="rounded-lg bg-card p-6">
      {testResult.status === "success" ? (
        <div className="flex items-center justify-center px-5 py-8">
          <CheckCircle2 className="size-6 text-success" />
          <div className="ml-3">
            <p className="text-lg font-medium text-success">{"连接到 "}{litellmParams.search_provider}{" 成功！"}</p>
            {testResult.test_query && (
              <p className="mt-2 text-sm text-muted-foreground">{"测试查询： "}<code className="rounded bg-muted px-1.5 py-0.5">{testResult.test_query}</code>
              </p>
            )}
            {testResult.results_count !== undefined && (
              <p className="text-sm text-muted-foreground">{"检索结果： "}{testResult.results_count}</p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-5 flex items-center">
            <AlertTriangle className="mr-3 size-6 text-destructive" />
            <p className="text-lg font-medium text-destructive">{"连接到 "}{litellmParams.search_provider || "search provider"}{" 失败"}</p>
          </div>

          <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <p className="mb-2 font-semibold text-foreground">{"错误： "}</p>
            <p className="text-sm leading-relaxed text-destructive">{errorMessage}</p>

            {testResult.error_type && (
              <div className="mt-2">
                <p className="text-[13px] text-muted-foreground">{"错误类型："}{" "}
                  <code className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">
                    {testResult.error_type}
                  </code>
                </p>
              </div>
            )}

            {testResult.message && (
              <div className="mt-3">
                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setShowDetails(!showDetails)}>
                  {showDetails ? "隐藏详情" : "显示详情"}
                </Button>
              </div>
            )}
          </div>

          {showDetails && (
            <div className="mb-5">
              <p className="mb-2 text-[15px] font-semibold text-foreground">{"完整错误详情"}</p>
              <pre className="max-h-52 overflow-auto rounded-lg border border-border bg-muted p-4 text-[13px] leading-relaxed break-words whitespace-pre-wrap">
                {testResult.message}
              </pre>
            </div>
          )}

          <div className="rounded-lg border border-warning/20 border-l-4 border-l-amber-500 bg-warning/10 p-4">
            <p className="mb-2 font-semibold text-warning">{"排查建议："}</p>
            <ul className="my-2 list-disc pl-5 text-warning">
              <li className="mb-1.5">{"请确认 API 密钥正确且有效"}</li>
              <li className="mb-1.5">{"检查搜索提供商的服务是否正常"}</li>
              <li className="mb-1.5">{"请确认提供商账户有足够的余额或配额"}</li>
              <li className="mb-1.5">Review the provider&apos;s documentation for any additional requirements</li>
            </ul>
          </div>
        </div>
      )}
      <Separator className="mt-6 mb-4" />
      <div className="flex items-center justify-between">
        <a
          href="https://docs.litellm.ai/docs/search"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Info className="size-4" />{"查看搜索文档"}</a>
      </div>
    </div>
  );
};

export default SearchConnectionTest;
