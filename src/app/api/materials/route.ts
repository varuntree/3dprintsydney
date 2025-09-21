import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import { listMaterials, createMaterial } from "@/server/services/materials";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const limit = Number(searchParams.get("limit") ?? "0");
    const offset = Number(searchParams.get("offset") ?? "0");
    const sort = (searchParams.get("sort") as "name" | "updatedAt" | null) ?? null;
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? null;
    const materials = await listMaterials({
      q,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : undefined,
      sort: sort ?? undefined,
      order: order ?? undefined,
    });
    return ok(materials);
  } catch (error) {
    return handleError(error, "materials.list");
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const material = await createMaterial(payload);
    return ok(material, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid material payload", 422, {
        issues: error.issues,
      });
    }
    return handleError(error, "materials.create");
  }
}
