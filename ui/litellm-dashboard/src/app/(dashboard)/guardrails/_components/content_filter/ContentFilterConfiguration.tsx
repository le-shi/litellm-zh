import React, { useRef, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { validateBlockedWordsFile } from "@/components/networking";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import PatternModal from "./PatternModal";
import CustomPatternModal from "./CustomPatternModal";
import KeywordModal from "./KeywordModal";
import PatternTable from "./PatternTable";
import KeywordTable from "./KeywordTable";
import ContentCategoryConfiguration from "./ContentCategoryConfiguration";
import CompetitorIntentConfiguration, { CompetitorIntentConfig } from "./CompetitorIntentConfiguration";

interface PrebuiltPattern {
  name: string;
  display_name: string;
  category: string;
  description: string;
}

interface Pattern {
  id: string;
  type: "prebuilt" | "custom";
  name: string;
  display_name?: string;
  pattern?: string;
  action: "BLOCK" | "MASK";
}

interface BlockedWord {
  id: string;
  keyword: string;
  action: "BLOCK" | "MASK";
  description?: string;
}

interface ContentCategory {
  name: string;
  display_name: string;
  description: string;
  default_action: string;
}

interface SelectedContentCategory {
  id: string;
  category: string;
  display_name: string;
  action: "BLOCK" | "MASK";
  severity_threshold: "high" | "medium" | "low";
}

interface ContentFilterConfigurationProps {
  prebuiltPatterns: PrebuiltPattern[];
  categories: string[];
  selectedPatterns: Pattern[];
  blockedWords: BlockedWord[];
  onPatternAdd: (pattern: Pattern) => void;
  onPatternRemove: (id: string) => void;
  onPatternActionChange: (id: string, action: "BLOCK" | "MASK") => void;
  onBlockedWordAdd: (word: BlockedWord) => void;
  onBlockedWordRemove: (id: string) => void;
  onBlockedWordUpdate: (id: string, field: string, value: any) => void;
  onFileUpload?: (content: string) => void;
  accessToken: string | null;
  showStep?: "patterns" | "keywords" | "categories" | "competitor_intent";
  contentCategories?: ContentCategory[];
  selectedContentCategories?: SelectedContentCategory[];
  onContentCategoryAdd?: (category: SelectedContentCategory) => void;
  onContentCategoryRemove?: (id: string) => void;
  onContentCategoryUpdate?: (id: string, field: string, value: any) => void;
  pendingCategorySelection?: string;
  onPendingCategorySelectionChange?: (value: string) => void;
  competitorIntentEnabled?: boolean;
  competitorIntentConfig?: CompetitorIntentConfig | null;
  onCompetitorIntentChange?: (enabled: boolean, config: CompetitorIntentConfig | null) => void;
}

const ContentFilterConfiguration: React.FC<ContentFilterConfigurationProps> = ({
  prebuiltPatterns,
  categories,
  selectedPatterns,
  blockedWords,
  onPatternAdd,
  onPatternRemove,
  onPatternActionChange,
  onBlockedWordAdd,
  onBlockedWordRemove,
  onBlockedWordUpdate,
  onFileUpload,
  accessToken,
  showStep,
  contentCategories = [],
  selectedContentCategories = [],
  onContentCategoryAdd,
  onContentCategoryRemove,
  onContentCategoryUpdate,
  pendingCategorySelection,
  onPendingCategorySelectionChange,
  competitorIntentEnabled = false,
  competitorIntentConfig = null,
  onCompetitorIntentChange,
}) => {
  const [patternModalVisible, setPatternModalVisible] = useState(false);
  const [keywordModalVisible, setKeywordModalVisible] = useState(false);
  const [customPatternModalVisible, setCustomPatternModalVisible] = useState(false);

  const [selectedPatternName, setSelectedPatternName] = useState<string>("");
  const [patternAction, setPatternAction] = useState<"BLOCK" | "MASK">("BLOCK");
  const [customPatternName, setCustomPatternName] = useState<string>("");
  const [customPatternRegex, setCustomPatternRegex] = useState<string>("");
  const [customPatternAction, setCustomPatternAction] = useState<"BLOCK" | "MASK">("BLOCK");
  const [newKeyword, setNewKeyword] = useState<string>("");
  const [newKeywordAction, setNewKeywordAction] = useState<"BLOCK" | "MASK">("BLOCK");
  const [newKeywordDescription, setNewKeywordDescription] = useState<string>("");
  const [uploadValidating, setUploadValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddPrebuiltPattern = () => {
    if (!selectedPatternName) {
      toast.error("请选择匹配规则");
      return;
    }

    const selectedPattern = prebuiltPatterns.find((p) => p.name === selectedPatternName);

    onPatternAdd({
      id: `pattern-${Date.now()}`,
      type: "prebuilt",
      name: selectedPatternName,
      display_name: selectedPattern?.display_name,
      action: patternAction,
    });

    setPatternModalVisible(false);
    setSelectedPatternName("");
    setPatternAction("BLOCK");
  };

  const handleAddCustomPattern = () => {
    if (!customPatternName || !customPatternRegex) {
      toast.error("请填写匹配规则名称和正则表达式");
      return;
    }

    onPatternAdd({
      id: `custom-${Date.now()}`,
      type: "custom",
      name: customPatternName,
      pattern: customPatternRegex,
      action: customPatternAction,
    });

    setCustomPatternModalVisible(false);
    setCustomPatternName("");
    setCustomPatternRegex("");
    setCustomPatternAction("BLOCK");
  };

  const handleAddKeyword = () => {
    if (!newKeyword) {
      toast.error("请输入关键词");
      return;
    }

    onBlockedWordAdd({
      id: `word-${Date.now()}`,
      keyword: newKeyword,
      action: newKeywordAction,
      description: newKeywordDescription || undefined,
    });

    setKeywordModalVisible(false);
    setNewKeyword("");
    setNewKeywordDescription("");
    setNewKeywordAction("BLOCK");
  };

  const handleFileUpload = async (file: File) => {
    setUploadValidating(true);
    try {
      const content = await file.text();

      if (accessToken) {
        const result = await validateBlockedWordsFile(accessToken, content);
        if (result.valid) {
          if (onFileUpload) {
            onFileUpload(content);
          }
          toast.success(result.message || "File uploaded successfully");
        } else {
          const errorMessage = result.error || (result.errors && result.errors.join(", ")) || "Invalid file";
          toast.error(`Validation failed: ${errorMessage}`);
        }
      }
    } catch (error) {
      toast.error(`Failed to upload file: ${error}`);
    } finally {
      setUploadValidating(false);
    }
    return false;
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      handleFileUpload(file);
    }
  };

  const showPatterns = !showStep || showStep === "patterns";
  const showKeywords = !showStep || showStep === "keywords";
  const showCategories = !showStep || showStep === "categories";
  const showCompetitorIntent = !showStep || showStep === "competitor_intent" || showStep === "categories";

  return (
    <div className="space-y-6">
      {!showStep && (
        <div>
          <p className="text-muted-foreground">{"配置匹配规则、关键词和内容分类，以检测和过滤请求及响应中的敏感信息。"}</p>
        </div>
      )}

      {showPatterns && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{"规则匹配检测"}</CardTitle>
              <p className="text-sm font-normal text-muted-foreground">{"通过正则匹配检测敏感信息（社会保障号、信用卡、API 密钥等）"}</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              <Button onClick={() => setPatternModalVisible(true)}>
                <Plus />{"添加预置匹配规则"}</Button>
              <Button variant="outline" onClick={() => setCustomPatternModalVisible(true)}>
                <Plus />{"添加自定义正则表达式"}</Button>
            </div>
            <PatternTable
              patterns={selectedPatterns}
              onActionChange={onPatternActionChange}
              onRemove={onPatternRemove}
            />
          </CardContent>
        </Card>
      )}

      {showKeywords && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{"拦截关键词"}</CardTitle>
              <p className="text-sm font-normal text-muted-foreground">{"拦截或脱敏指定的敏感词和短语"}</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              <Button onClick={() => setKeywordModalVisible(true)}>
                <Plus />{"添加关键词"}</Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".yaml,.yml"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <Button
                variant="outline"
                disabled={uploadValidating}
                aria-busy={uploadValidating}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadValidating ? <UiLoadingSpinner className="size-4" /> : <Upload />}{"上传 YAML 文件"}</Button>
            </div>
            <KeywordTable keywords={blockedWords} onActionChange={onBlockedWordUpdate} onRemove={onBlockedWordRemove} />
          </CardContent>
        </Card>
      )}

      {showCompetitorIntent && onCompetitorIntentChange && (
        <CompetitorIntentConfiguration
          enabled={competitorIntentEnabled}
          config={competitorIntentConfig}
          onChange={onCompetitorIntentChange}
          accessToken={accessToken}
        />
      )}

      {showCategories &&
        contentCategories.length > 0 &&
        onContentCategoryAdd &&
        onContentCategoryRemove &&
        onContentCategoryUpdate && (
          <ContentCategoryConfiguration
            availableCategories={contentCategories}
            selectedCategories={selectedContentCategories}
            onCategoryAdd={onContentCategoryAdd}
            onCategoryRemove={onContentCategoryRemove}
            onCategoryUpdate={onContentCategoryUpdate}
            accessToken={accessToken}
            pendingSelection={pendingCategorySelection}
            onPendingSelectionChange={onPendingCategorySelectionChange}
          />
        )}

      <PatternModal
        visible={patternModalVisible}
        prebuiltPatterns={prebuiltPatterns}
        categories={categories}
        selectedPatternName={selectedPatternName}
        patternAction={patternAction}
        onPatternNameChange={setSelectedPatternName}
        onActionChange={(value) => setPatternAction(value as "BLOCK" | "MASK")}
        onAdd={handleAddPrebuiltPattern}
        onCancel={() => {
          setPatternModalVisible(false);
          setSelectedPatternName("");
          setPatternAction("BLOCK");
        }}
      />

      <CustomPatternModal
        visible={customPatternModalVisible}
        patternName={customPatternName}
        patternRegex={customPatternRegex}
        patternAction={customPatternAction}
        onNameChange={setCustomPatternName}
        onRegexChange={setCustomPatternRegex}
        onActionChange={(value) => setCustomPatternAction(value as "BLOCK" | "MASK")}
        onAdd={handleAddCustomPattern}
        onCancel={() => {
          setCustomPatternModalVisible(false);
          setCustomPatternName("");
          setCustomPatternRegex("");
          setCustomPatternAction("BLOCK");
        }}
      />

      <KeywordModal
        visible={keywordModalVisible}
        keyword={newKeyword}
        action={newKeywordAction}
        description={newKeywordDescription}
        onKeywordChange={setNewKeyword}
        onActionChange={(value) => setNewKeywordAction(value as "BLOCK" | "MASK")}
        onDescriptionChange={setNewKeywordDescription}
        onAdd={handleAddKeyword}
        onCancel={() => {
          setKeywordModalVisible(false);
          setNewKeyword("");
          setNewKeywordDescription("");
          setNewKeywordAction("BLOCK");
        }}
      />
    </div>
  );
};

export default ContentFilterConfiguration;
