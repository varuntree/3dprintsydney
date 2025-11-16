import {
  MaterialsView,
  type MaterialRecord,
} from "@/components/materials/materials-view";
import { listMaterials } from "@/server/services/materials";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const materials = await listMaterials();
  const initial: MaterialRecord[] = materials.map((material) => ({
    ...material,
    createdAt: material.createdAt.toISOString(),
    updatedAt: material.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <MaterialsView initial={initial} />
    </div>
  );
}
