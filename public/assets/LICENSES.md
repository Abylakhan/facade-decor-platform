# Third-party assets

All files below were downloaded from Poly Haven (https://polyhaven.com) through its
official API (api.polyhaven.com → dl.polyhaven.org) and are licensed **CC0 1.0**
(public domain; commercial use allowed, attribution not required).

| Path | Asset | Source page |
|---|---|---|
| assets/hdri/kloofendal_48d_partly_cloudy_puresky_1k.hdr | HDRI, day sky | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky |
| assets/hdri/venice_sunset_1k.hdr | HDRI, sunset | https://polyhaven.com/a/venice_sunset |
| assets/pbr/beige_wall_001/* | plaster (walls, decor relief) | https://polyhaven.com/a/beige_wall_001 |
| assets/pbr/plastered_wall_02/* | concrete/plaster panels | https://polyhaven.com/a/plastered_wall_02 |
| assets/pbr/castle_brick_02_white/* | stone (walls, plinth) | https://polyhaven.com/a/castle_brick_02_white |
| assets/pbr/brick_wall_001/* | brick | https://polyhaven.com/a/brick_wall_001 |
| assets/pbr/grey_roof_tiles_02/* | roof tiles | https://polyhaven.com/a/grey_roof_tiles_02 |
| assets/pbr/patterned_paving/* | paving | https://polyhaven.com/a/patterned_paving |
| assets/pbr/grass_ground/* | lawn | https://polyhaven.com/a/grass_ground |

`renders/product-*.webp` are 3D visualisations rendered by this project from its own
parametric product models (src/components/three/ProductModel.tsx) with the textures
above — not photographs. Regenerate in development: `node scripts/render-save-server.mjs`
and open `/render-lab/` (dev only).

## Home-page scroll sequence (`public/hero/`)

Built from two Pixabay videos by the same author, sharing scene, camera and house:

| Source | Use |
|---|---|
| https://pixabay.com/videos/home-architecture-design-31290/ | wireframe house growing; the blueprint stage is *extracted from these frames* (line mask, recoloured on dark) |
| https://pixabay.com/videos/home-3d-architecture-design-31289/ | the same house built out with materials and a tiled roof |

License: **Pixabay Content License** (free for commercial use, no attribution required;
the clips are not redistributed as standalone stock — they are cut, cross-faded, cropped and
re-encoded into a 124-frame WebP sequence: `hero/d` 1440×810, `hero/m` 800×450).
A credit line is shown on the hero anyway.
