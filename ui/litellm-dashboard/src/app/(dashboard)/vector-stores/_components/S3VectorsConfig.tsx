import React, { useState, useEffect } from "react";
import { CircleHelp, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { fetchAvailableModels, ModelGroup } from "@/components/llm_calls/fetch_models";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface S3VectorsConfigProps {
  accessToken: string | null;
  providerParams: Record<string, unknown>;
  onParamsChange: (params: Record<string, unknown>) => void;
}

const labelWithHint = (label: string, hint: string): React.ReactNode => (
  <>
    {label}
    <Tooltip>
      <TooltipTrigger render={<CircleHelp className="size-3.5 shrink-0 cursor-help text-muted-foreground" />} />
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  </>
);

const asText = (value: unknown): string => (typeof value === "string" ? value : "");

const S3VectorsConfig: React.FC<S3VectorsConfigProps> = ({ accessToken, providerParams, onParamsChange }) => {
  const [embeddingModels, setEmbeddingModels] = useState<ModelGroup[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const models = await fetchAvailableModels(accessToken);
        const embeddingOnly = models.filter((model) => model.mode === "embedding");
        setEmbeddingModels(embeddingOnly);
      } catch (error) {
        console.error("Error fetching embedding models:", error);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, [accessToken]);

  const handleFieldChange = (fieldName: string, value: string) => {
    onParamsChange({
      ...providerParams,
      [fieldName]: value,
    });
  };

  const bucketName = asText(providerParams.vector_bucket_name);
  const indexName = asText(providerParams.index_name);
  const bucketNameError = bucketName && bucketName.length < 3 ? "Bucket name must be at least 3 characters" : undefined;
  const indexNameError =
    indexName && indexName.length > 0 && indexName.length < 3
      ? "Index name must be at least 3 characters if provided"
      : undefined;

  return (
    <TooltipProvider>
      <Alert variant="info" className="mb-4">
        <Info />
        <AlertTitle>{"AWS S3 Vectors 设置"}</AlertTitle>
        <AlertDescription>
          <div>
            <p>{"AWS S3 Vectors 可直接在 S3 中存储和查询嵌入向量："}</p>
            <ul style={{ marginLeft: "16px", marginTop: "8px" }}>
              <li>Vector buckets and indexes will be automatically created if they don&apos;t exist</li>
              <li>{"向量维度将根据所选嵌入模型自动检测"}</li>
              <li>{"请确认 AWS 凭据具有 S3 Vectors 操作权限"}</li>
              <li>{"了解更多："}{" "}
                <a
                  href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vector-buckets.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >{"AWS S3 Vectors 文档"}</a>
              </li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      <Field data-invalid={bucketNameError !== undefined || undefined}>
        <FieldLabel htmlFor="s3-vector-bucket-name">
          {labelWithHint(
            "Vector Bucket Name",
            "S3 bucket name for vector storage (must be at least 3 characters, lowercase letters, numbers, hyphens, and periods only)",
          )}
        </FieldLabel>
        <Input
          id="s3-vector-bucket-name"
          value={bucketName}
          onChange={(e) => handleFieldChange("vector_bucket_name", e.target.value)}
          placeholder={"my-vector-bucket（至少 3 个字符）"}
          aria-invalid={bucketNameError !== undefined || undefined}
        />
        <FieldError>{bucketNameError}</FieldError>
      </Field>

      <Field data-invalid={indexNameError !== undefined || undefined}>
        <FieldLabel htmlFor="s3-index-name">
          {labelWithHint(
            "Index Name",
            "Name for the vector index (optional, will be auto-generated if not provided). If provided, must be at least 3 characters.",
          )}
        </FieldLabel>
        <Input
          id="s3-index-name"
          value={indexName}
          onChange={(e) => handleFieldChange("index_name", e.target.value)}
          placeholder={"my-vector-index（可选，至少 3 个字符）"}
          aria-invalid={indexNameError !== undefined || undefined}
        />
        <FieldError>{indexNameError}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor="s3-aws-region-name">
          {labelWithHint("AWS Region", "AWS region where the S3 bucket is located (e.g., us-west-2)")}
        </FieldLabel>
        <Input
          id="s3-aws-region-name"
          value={asText(providerParams.aws_region_name)}
          onChange={(e) => handleFieldChange("aws_region_name", e.target.value)}
          placeholder="us-west-2"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="s3-embedding-model">
          {labelWithHint("Embedding Model", "Select the embedding model to use for vector generation")}
        </FieldLabel>
        <Combobox
          value={asText(providerParams.embedding_model) || null}
          onValueChange={(value: string | null) => value !== null && handleFieldChange("embedding_model", value)}
          items={embeddingModels.map((model) => model.model_group)}
        >
          <ComboboxInput id="s3-embedding-model" placeholder={"选择嵌入模型"} />
          <ComboboxContent>
            <ComboboxEmpty>{isLoadingModels ? "正在加载模型..." : "未找到嵌入模型。"}</ComboboxEmpty>
            <ComboboxList>
              {(model: string) => (
                <ComboboxItem key={model} value={model}>
                  {model}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Field>
    </TooltipProvider>
  );
};

export default S3VectorsConfig;
