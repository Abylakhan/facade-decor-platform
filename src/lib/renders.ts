import type { Product } from "@/domain/types";
import { asset } from "./site";

/**
 * Studio render of a product, generated from the product's own 3D representation
 * by the render lab (src/components/three/RenderLab.tsx). Not a photograph.
 */
export const productImage = (p: Pick<Product, "slug">) => asset(`/renders/product-${p.slug}.webp`);
