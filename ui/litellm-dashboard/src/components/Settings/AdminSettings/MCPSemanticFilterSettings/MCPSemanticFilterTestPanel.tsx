import { Code, CircleAlert, CirclePlay, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import ModelSelector from "@/components/common_components/ModelSelector";
import { TestResult } from "./semanticFilterTestUtils";

interface MCPSemanticFilterTestPanelProps {
  accessToken: string | null;
  testQuery: string;
  setTestQuery: (value: string) => void;
  testModel: string | null;
  setTestModel: (value: string | null) => void;
  isTesting: boolean;
  onTest: () => void;
  filterEnabled: boolean;
  testResult: TestResult | null;
  testError: string | null;
  curlCommand: string;
}

export default function MCPSemanticFilterTestPanel({
  accessToken,
  testQuery,
  setTestQuery,
  testModel,
  setTestModel,
  isTesting,
  onTest,
  filterEnabled,
  testResult,
  testError,
  curlCommand,
}: MCPSemanticFilterTestPanelProps) {
  const canRunTest = testQuery && testModel && filterEnabled;
  const testDisabled = isTesting || !canRunTest;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{"测试配置"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="test">
          <TabsList>
            <TabsTrigger value="test" className="flex-none">{"测试"}</TabsTrigger>
            <TabsTrigger value="api" className="flex-none">{"API 用量"}</TabsTrigger>
          </TabsList>

          <TabsContent value="test">
            <div className="flex w-full flex-col gap-6">
              <div>
                <p className="mb-2 flex items-center gap-1.5 font-medium">
                  <CirclePlay className="size-4" />{" 测试查询"}</p>
                <Textarea
                  className="field-sizing-fixed"
                  placeholder={"输入测试查询，查看将选中的工具..."}
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  rows={4}
                  disabled={isTesting}
                />
              </div>

              <div>
                <ModelSelector
                  accessToken={accessToken || ""}
                  value={testModel}
                  onChange={setTestModel}
                  disabled={isTesting}
                  showLabel={true}
                  labelText="Select Model"
                />
              </div>

              <Button className="w-full" onClick={onTest} disabled={testDisabled}>
                <CirclePlay />{"测试筛选"}</Button>

              {!filterEnabled && (
                <Alert>
                  <Info />
                  <AlertTitle>{"语义筛选已禁用"}</AlertTitle>
                  <AlertDescription>{"启用语义筛选并保存设置后即可测试。"}</AlertDescription>
                </Alert>
              )}

              {testError && (
                <Alert variant="destructive" className="mb-4">
                  <CircleAlert />
                  <AlertTitle>{"语义筛选未执行"}</AlertTitle>
                  <AlertDescription>{testError}</AlertDescription>
                </Alert>
              )}

              {testResult && (
                <div>
                  <h5 className="mb-2 text-base font-medium">{"结果"}</h5>
                  <Alert className="mb-4">
                    <Info />
                    <AlertTitle>
                      {testResult.selectedTools}{" / "}{testResult.totalTools}{" 个工具已选择"}</AlertTitle>
                    <AlertDescription>
                      {testResult.totalTools - testResult.selectedTools}{" 个工具已筛除"}</AlertDescription>
                  </Alert>
                  <div>
                    <p className="mb-2 block font-medium">{"已选工具："}</p>
                    <ul className="m-0 list-disc pl-5">
                      {testResult.tools.map((tool, index) => (
                        <li key={index} className="mb-1">
                          <span>{tool}</span>
                        </li>
                      ))}
                    </ul>
                    {testResult.selectedTools > testResult.tools.length && (
                      <p className="mt-2 block text-sm text-muted-foreground">
                        +{testResult.selectedTools - testResult.tools.length}{" 个已选工具未显示"}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="api">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Code className="size-4" />
                <p className="font-medium">{"API 用量"}</p>
              </div>
              <p className="mb-2 block text-sm text-muted-foreground">{"使用此 curl 命令测试当前配置的语义筛选。"}</p>
              <p className="mb-2 block font-medium">{"需要检查的响应头："}</p>
              <ul className="mt-0 mr-0 mb-3 ml-0 list-disc pl-5">
                <li>
                  <span>{"x-litellm-semantic-filter：显示工具总数和所选工具数"}</span>
                  <span className="block text-sm text-muted-foreground">{"示例：从 10 个筛选为 3 个"}</span>
                </li>
                <li>
                  <span>{"x-litellm-semantic-filter-tools：所选工具名称的 CSV 列表"}</span>
                  <span className="block text-sm text-muted-foreground">{"示例：wikipedia-fetch,github-search,slack-post"}</span>
                </li>
              </ul>
              <pre className="m-0 overflow-auto rounded-sm bg-muted p-3 text-xs">{curlCommand}</pre>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
