import {
  ProductsView,
  type TemplateRecord,
} from "@/components/products/products-view";
import { listProductTemplates } from "@/server/services/product-templates";
import { listMaterials } from "@/server/services/materials";

export default async function ProductsPage() {
  const [templates, materials] = await Promise.all([
    listProductTemplates(),
    listMaterials(),
  ]);

  const initialTemplates: TemplateRecord[] = templates.map((template) => ({
    ...template,
    basePrice: template.basePrice,
    calculatorConfig: template.calculatorConfig,
    materialName: template.materialName,
    materialId: template.materialId,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }));

  const materialOptions = materials.map((material) => ({
    id: material.id,
    name: material.name,
  }));

  return (
    <div className="space-y-6">
      <ProductsView
        initialTemplates={initialTemplates}
        materials={materialOptions}
      />
    </div>
  );
}
