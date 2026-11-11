import React, { useId, useState } from "react";
import { toast } from "@/lib/toast";
import { CircleCheck, CircleHelp, Inbox, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/shared/Alert";
import { ragIngestCall } from "@/components/networking";
import { DocumentUpload, RAGIngestResponse } from "@/components/vector_store_management/types";
import DocumentsTable from "./DocumentsTable";
import {
  VectorStoreProviders,
  vectorStoreProviderLogoMap,
  vectorStoreProviderMap,
  getProviderSpecificFields,
  VectorStoreFieldConfig,
} from "@/components/vector_store_providers";
import { Logo } from "@/components/molecules/logo/Logo";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import S3VectorsConfig from "./S3VectorsConfig";

const ACCEPTED_DOCUMENT_EXTENSIONS = ".pdf,.txt,.docx,.md,.doc";

const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/markdown",
];

const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;

const RAG_INGEST_UNSUPPORTED_PROVIDERS = new Set(["valkey", "opensearch"]);

const providerItems = Object.entries(VectorStoreProviders)
  .filter(([providerEnum]) => !RAG_INGEST_UNSUPPORTED_PROVIDERS.has(vectorStoreProviderMap[providerEnum]))
  .map(([providerEnum, providerDisplayName]) => ({
    value: vectorStoreProviderMap[providerEnum],
    label: providerDisplayName,
  }));

const asText = (value: unknown): string => (typeof value === "string" ? value : "");

const IngestSuccessAlert: React.FC<{ ingestResults: RAGIngestResponse[] }> = ({ ingestResults }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <Alert variant="success">
      <CircleCheck />
      <AlertTitle>{"向量存储已创建"}</AlertTitle>
      <AlertDescription>
        <div>
          <p>
            <strong>{"向量存储 ID："}</strong> {ingestResults[0]?.vector_store_id}
          </p>
          <p>
            <strong>{"已导入文档："}</strong> {ingestResults.length}
          </p>
        </div>
      </AlertDescription>
      <AlertAction>
        <Button variant="ghost" size="icon-sm" aria-label={"关闭"} onClick={() => setDismissed(true)}>
          <X className="size-4" />
        </Button>
      </AlertAction>
    </Alert>
  );
};

const labelWithHint = (label: string, hint: string): React.ReactNode => (
  <>
    {label}
    <Tooltip>
      <TooltipTrigger render={<CircleHelp className="size-3.5 shrink-0 cursor-help text-muted-foreground" />} />
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  </>
);

interface CreateVectorStoreProps {
  accessToken: string | null;
  onSuccess?: (vectorStoreId: string) => void;
}

const CreateVectorStore: React.FC<CreateVectorStoreProps> = ({ accessToken, onSuccess }) => {
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("bedrock");
  const [vectorStoreName, setVectorStoreName] = useState<string>("");
  const [vectorStoreDescription, setVectorStoreDescription] = useState<string>("");
  const [ingestResults, setIngestResults] = useState<RAGIngestResponse[]>([]);
  const [providerParams, setProviderParams] = useState<Record<string, unknown>>({});
  const documentsInputId = useId();

  const isSupportedDocument = (file: File): boolean => {
    if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type)) {
      toast.error(`${file.name} is not a supported file type. Please upload PDF, TXT, DOCX, or MD files.`);
      return false;
    }
    if (file.size >= MAX_DOCUMENT_BYTES) {
      toast.error(`${file.name} must be smaller than 50MB!`);
      return false;
    }
    return true;
  };

  const handleAddDocuments = (files: readonly File[]) => {
    const accepted: DocumentUpload[] = files.filter(isSupportedDocument).map((file) => ({
      uid: uuidv4(),
      name: file.name,
      status: "done",
      size: file.size,
      type: file.type,
      originFileObj: file,
    }));

    if (accepted.length > 0) {
      setDocuments((prev) => [...prev, ...accepted]);
    }
  };

  const handleRemoveDocument = (uid: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.uid !== uid));
  };

  const handleCreateVectorStore = async () => {
    if (documents.length === 0) {
      toast.warning("请至少上传一份文档");
      return;
    }

    if (!selectedProvider) {
      toast.warning("请选择提供商");
      return;
    }

    // Validate provider-specific required fields
    const requiredFields = getProviderSpecificFields(selectedProvider).filter((field) => field.required);
    for (const field of requiredFields) {
      if (!providerParams[field.name]) {
        toast.warning(`Please provide ${field.label}`);
        return;
      }
    }

    // S3 Vectors specific validation
    if (selectedProvider === "s3_vectors") {
      const bucketName = asText(providerParams.vector_bucket_name);
      const indexName = asText(providerParams.index_name);
      if (bucketName && bucketName.length < 3) {
        toast.warning("向量存储桶名称至少需要 3 个字符");
        return;
      }
      if (indexName && indexName.length > 0 && indexName.length < 3) {
        toast.warning("如填写索引名称，至少需要 3 个字符");
        return;
      }
    }

    if (!accessToken) {
      toast.error("没有可用的访问令牌，请重新登录。");
      return;
    }

    setIsCreating(true);
    const results: RAGIngestResponse[] = [];
    let vectorStoreId: string | undefined;
    let failure: { name: string; error: unknown } | undefined;

    try {
      // Ingest each document
      for (const doc of documents) {
        if (!doc.originFileObj) continue;

        // Update document status to uploading
        setDocuments((prev) => prev.map((d) => (d.uid === doc.uid ? { ...d, status: "uploading" as const } : d)));

        try {
          const result = await ragIngestCall(
            accessToken,
            doc.originFileObj,
            selectedProvider,
            vectorStoreId, // Use the same vector store ID for subsequent uploads
            vectorStoreName || undefined,
            vectorStoreDescription || undefined,
            providerParams,
          );

          // Store the vector store ID from the first successful ingest
          if (!vectorStoreId && result.vector_store_id) {
            vectorStoreId = result.vector_store_id;
          }

          results.push(result);

          // Update document status to done
          setDocuments((prev) => prev.map((d) => (d.uid === doc.uid ? { ...d, status: "done" as const } : d)));
        } catch (error) {
          console.error(`Error ingesting ${doc.name}:`, error);
          // Update document status to error
          setDocuments((prev) => prev.map((d) => (d.uid === doc.uid ? { ...d, status: "error" as const } : d)));
          failure = { name: doc.name, error };
          break;
        }
      }

      if (failure && !vectorStoreId) {
        throw failure.error;
      }

      setIngestResults(results);
      if (failure) {
        toast.warning(
          `Vector store ${vectorStoreId} was created with ${results.length} document(s), but ${failure.name} failed to ingest`,
          { description: failure.error instanceof Error ? failure.error.message : String(failure.error) },
        );
      } else {
        toast.success(
          `Successfully created vector store with ${results.length} document(s). Vector Store ID: ${vectorStoreId}`,
        );
      }

      if (onSuccess && vectorStoreId) {
        onSuccess(vectorStoreId);
      }

      if (failure) {
        return;
      }

      // Clear documents after successful creation
      setTimeout(() => {
        setDocuments([]);
        setIngestResults([]);
      }, 3000);
    } catch (error) {
      console.error("Error creating vector store:", error);
      toast.fromError(`Failed to create vector store: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">{"创建向量存储"}</h3>
          <p className="text-sm text-muted-foreground">{"上传文档并选择提供商，以创建包含向量化内容的向量存储。"}</p>
        </div>

        {/* Upload Area */}
        <Card>
          <CardContent>
            <div className="mb-4">
              <p className="font-medium">{"第一步：上传文档"}</p>
              <p className="text-sm text-muted-foreground block mt-1">{"上传一份或多份文档（PDF、TXT、DOCX、MD），每份最大 50 MB。"}</p>
            </div>
            <label
              htmlFor={documentsInputId}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-input bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary hover:bg-muted/50 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handleAddDocuments(Array.from(event.dataTransfer.files));
              }}
            >
              <Inbox className="size-12 text-primary" />
              <span className="text-base">{"点击或将文件拖到此区域以上传"}</span>
              <span className="text-sm text-muted-foreground">{"支持单个或批量上传，支持 PDF、TXT、DOCX、MD 格式"}</span>
              <input
                id={documentsInputId}
                type="file"
                multiple
                accept={ACCEPTED_DOCUMENT_EXTENSIONS}
                className="sr-only"
                onChange={(event) => {
                  handleAddDocuments(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
            </label>
          </CardContent>
        </Card>

        {/* Documents Table */}
        {documents.length > 0 && (
          <Card>
            <CardContent>
              <div className="mb-4">
                <p className="font-medium">{"已上传的文档（"}{documents.length})</p>
              </div>
              <DocumentsTable documents={documents} onRemove={handleRemoveDocument} />
            </CardContent>
          </Card>
        )}

        {/* Provider Selection and Vector Store Details */}
        <Card>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">{"第二步：配置向量存储"}</p>
              <p className="text-sm text-muted-foreground block mt-1">{"选择提供商，也可为向量存储填写名称和说明。"}</p>
            </div>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="vector-store-name">
                  {labelWithHint("Vector Store Name", "Optional: Give your vector store a meaningful name")}
                </FieldLabel>
                <Input
                  id="vector-store-name"
                  value={vectorStoreName}
                  onChange={(e) => setVectorStoreName(e.target.value)}
                  placeholder={"例如，产品文档、客户支持知识库"}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="vector-store-description">
                  {labelWithHint("Description", "Optional: Describe what this vector store contains")}
                </FieldLabel>
                <Textarea
                  id="vector-store-description"
                  value={vectorStoreDescription}
                  onChange={(e) => setVectorStoreDescription(e.target.value)}
                  placeholder={"例如，包含所有产品文档和用户指南"}
                  rows={2}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="vector-store-provider">
                  {labelWithHint("Provider", "Select the provider for embedding and vector store operations")}
                </FieldLabel>
                <Select
                  items={providerItems}
                  value={selectedProvider}
                  onValueChange={(value: string | null) => value !== null && setSelectedProvider(value)}
                >
                  <SelectTrigger id="vector-store-provider" className="w-full">
                    <SelectValue placeholder={"选择提供商"} />
                  </SelectTrigger>
                  <SelectContent>
                    {providerItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        <Logo src={vectorStoreProviderLogoMap[item.label]} label={item.label} className="w-5 h-5" />
                        <span>{item.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* S3 Vectors Configuration */}
              {selectedProvider === "s3_vectors" && (
                <S3VectorsConfig
                  accessToken={accessToken}
                  providerParams={providerParams}
                  onParamsChange={setProviderParams}
                />
              )}

              {/* Other Provider-specific fields */}
              {selectedProvider !== "s3_vectors" &&
                getProviderSpecificFields(selectedProvider).map((field: VectorStoreFieldConfig) => (
                  <Field key={field.name}>
                    <FieldLabel htmlFor={`vector-store-${field.name}`}>
                      {labelWithHint(field.label, field.tooltip)}
                    </FieldLabel>
                    <Input
                      id={`vector-store-${field.name}`}
                      type={field.type === "password" ? "password" : "text"}
                      value={asText(providerParams[field.name])}
                      onChange={(e) => setProviderParams((prev) => ({ ...prev, [field.name]: e.target.value }))}
                      placeholder={field.placeholder}
                    />
                  </Field>
                ))}
            </FieldGroup>

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleCreateVectorStore}
                disabled={isCreating || documents.length === 0 || !selectedProvider}
              >
                {isCreating && <UiLoadingSpinner className="size-4" />}
                {isCreating ? "正在创建向量存储…" : "创建向量存储"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Success Message */}
        {ingestResults.length > 0 && <IngestSuccessAlert ingestResults={ingestResults} />}
      </div>
    </TooltipProvider>
  );
};

export default CreateVectorStore;
