# Multi-GSplat BabylonJS Example

This example demonstrates how to use multiple Gaussian Splatting meshes with proper depth sorting using the rig node support in BabylonJS.

## Problem

Gaussian Splatting relies on a pass that sorts all the splats in order to correctly draw them. The default `GaussianSplattingMesh` provided by BabylonJS only sorts splats locally, for each object independently. This leads to incorrect ordering when a scene contains multiple `GaussianSplattingMesh` objects.

## Solution

This example uses the rig node support added to `GaussianSplattingMesh`. Each splat has an extra integer telling which object (rig node) it belongs to. The mesh receives a list of matrices to transform the various parts, enabling correct global sorting across all merged meshes.

## Setup

This example uses the locally modified Babylon.js from `../Babylon.js/`.

1. Build Babylon.js packages first:
   ```bash
   cd ../Babylon.js
   npm install
   npm run build:dev
   ```

2. Install dependencies in this directory:
   ```bash
   npm install
   ```

## Running

### Development

```bash
# Start dev server
npm run dev

# Browse to http://localhost:5173/
```

### Build

```bash
# Build without type checking
npm run build

# Build with type checking
npm run build:check

# The built files will be in dist/
```

## Usage

The key pattern demonstrated in `App.ts`:

1. Create a single `GaussianSplattingMesh` as the "render mesh"
2. For each model loaded:
   - Load it into a temporary `GaussianSplattingMesh`
   - Assign it a unique rig node index via `setNodeIndex()`
   - Merge it into the render mesh using `mergeGaussianSplattingMeshes()`
   - Set the world matrix for that node via `setWorldMatrixForNode()`
3. When transforming objects, update the world matrix via `setWorldMatrixForNode()`

This approach ensures all splats from multiple models are sorted together correctly.
