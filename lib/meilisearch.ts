import { Meilisearch } from "meilisearch";

const globalForMeili = globalThis as unknown as {
  meili: Meilisearch | undefined;
};

export const meili =
  globalForMeili.meili ??
  new Meilisearch({
    host: process.env.MEILI_HOST ?? "http://localhost:7700",
    apiKey: process.env.MEILI_MASTER_KEY,
  });

if (process.env.NODE_ENV !== "production") {
  globalForMeili.meili = meili;
}

export const PRODUCTS_INDEX = "products";

export interface ProductSearchDocument {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  status: string;
  supplierName: string;
}

let indexConfigured = false;

export async function ensureProductsIndex() {
  if (indexConfigured) return;
  await meili.createIndex(PRODUCTS_INDEX, { primaryKey: "id" }).catch(() => {});
  const index = meili.index(PRODUCTS_INDEX);
  await index.updateSearchableAttributes(["name", "description", "sku", "category", "supplierName"]);
  await index.updateFilterableAttributes(["status", "category"]);
  await index.updateSortableAttributes(["priceCents", "createdAt"]);
  indexConfigured = true;
}

export async function indexProduct(doc: ProductSearchDocument) {
  await ensureProductsIndex();
  await meili.index(PRODUCTS_INDEX).addDocuments([doc]);
}

export async function deleteProductFromIndex(id: string) {
  await meili.index(PRODUCTS_INDEX).deleteDocument(id);
}

export async function searchProducts(query: string, limit = 24) {
  await ensureProductsIndex();
  const result = await meili.index<ProductSearchDocument>(PRODUCTS_INDEX).search(query, {
    filter: "status = ACTIVE",
    limit,
  });
  return result.hits;
}
