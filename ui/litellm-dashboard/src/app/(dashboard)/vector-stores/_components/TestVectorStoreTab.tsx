import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { VectorStoreTester } from "./VectorStoreTester";
import { VectorStore } from "@/components/vector_store_management/types";

interface TestVectorStoreTabProps {
  accessToken: string | null;
  vectorStores: VectorStore[];
}

const storeLabel = (store: VectorStore) => store.vector_store_name || store.vector_store_id;

const TestVectorStoreTab: React.FC<TestVectorStoreTabProps> = ({ accessToken, vectorStores }) => {
  const [selectedVectorStore, setSelectedVectorStore] = useState<VectorStore | null>(vectorStores[0] ?? null);

  if (!accessToken) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">{"测试向量存储需要访问令牌。"}</p>
        </CardContent>
      </Card>
    );
  }

  if (vectorStores.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">{"暂无可用向量存储，请先创建后再测试。"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div>
            <h5 className="text-base font-medium text-foreground">{"选择向量存储"}</h5>
            <p className="text-sm text-muted-foreground">{"选择要测试搜索查询的向量存储"}</p>
          </div>

          <Combobox
            items={vectorStores}
            value={selectedVectorStore}
            onValueChange={setSelectedVectorStore}
            itemToStringLabel={storeLabel}
          >
            <ComboboxInput className="w-full" placeholder={"选择向量存储"} />
            <ComboboxContent>
              <ComboboxEmpty>{"没有匹配的向量存储"}</ComboboxEmpty>
              <ComboboxList>
                {(store: VectorStore) => (
                  <ComboboxItem key={store.vector_store_id} value={store}>
                    <div className="flex flex-col">
                      <span className="font-medium">{storeLabel(store)}</span>
                      {store.vector_store_name && (
                        <span className="font-mono text-xs text-muted-foreground">{store.vector_store_id}</span>
                      )}
                    </div>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </CardContent>
      </Card>

      {selectedVectorStore && (
        <VectorStoreTester vectorStoreId={selectedVectorStore.vector_store_id} accessToken={accessToken} />
      )}
    </div>
  );
};

export default TestVectorStoreTab;
