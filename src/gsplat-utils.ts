import { GaussianSplattingMesh } from "@babylonjs/core";

/**
 * Merge two Gaussian Splatting meshes into a single mesh.
 * @param meshA - The first mesh to merge.
 * @param meshB - The second mesh to merge.
 * @returns The merged mesh, which might be the meshA. Note that meshB is left untouched.
 */
export function mergeGaussianSplattingMeshes(meshA: GaussianSplattingMesh, meshB: GaussianSplattingMesh): GaussianSplattingMesh {
    const scene = meshA.getScene();

    const splatCountA = meshA.splatCount || 0;
    const splatsDataA = meshA.splatsData || new ArrayBuffer(0);
    const shDataA = meshA.shData;
    const rigNodeIndicesA = meshA.rigNodeIndices || new Uint32Array(0);

    const splatsDataB = meshB.splatsData || new ArrayBuffer(0);
    const shDataB = meshB.shData;
    const rigNodeIndicesB = meshB.rigNodeIndices || new Uint32Array(0);

    const mergedShDataLength = Math.max(shDataA?.length || 0, shDataB?.length || 0);
    const hasMergedShData = shDataA !== null && shDataB !== null;

    const layoutChanged = true;
    let mergedMesh: GaussianSplattingMesh;
    if (layoutChanged) {
        mergedMesh = new GaussianSplattingMesh(
            "mergedMesh",
            null,
            scene,
            true // keepInRam - so we can read back splatsData for appending
        );
    } else {
        mergedMesh = meshA;
    }

    // Concatenate splatsData (ArrayBuffer)
    const mergedSplatsData = new Uint8Array(splatsDataA.byteLength + splatsDataB.byteLength);
    mergedSplatsData.set(new Uint8Array(splatsDataA), 0);
    mergedSplatsData.set(new Uint8Array(splatsDataB), splatsDataA.byteLength);

    let mergedShData: Uint8Array[] | undefined = undefined;
    if (hasMergedShData) {
        // Note: We need to calculate the texture size and pad accordingly
        // Each SH texture texel stores 16 bytes (4 RGBA uint32 components)
        const bytesPerTexel = 16;
        
        mergedShData = [];
        for (let i = 0; i < mergedShDataLength; i++) {
            const mergedShDataItem = new Uint8Array(mergedShDataLength * 16);
            if (i < (shDataA?.length ?? 0)) {
                mergedShDataItem.set(shDataA![i], 0);
            }
            if (i < (shDataB?.length ?? 0)) {
                const byteOffset = bytesPerTexel * splatCountA;
                mergedShDataItem.set(shDataB![i], byteOffset);
            }
            mergedShData.push(mergedShDataItem);
        }
    }

    // Concatenate rigNodeIndices (Uint32Array)
    const mergedRigNodeIndices = new Uint32Array(rigNodeIndicesA.length + rigNodeIndicesB.length);
    mergedRigNodeIndices.set(rigNodeIndicesA, 0);
    mergedRigNodeIndices.set(rigNodeIndicesB, rigNodeIndicesA.length);

    mergedMesh.updateData(mergedSplatsData.buffer, mergedShData, { flipY: false }, mergedRigNodeIndices);

    // Preserve the original node world matrices
    for (let i = 0; i < meshA.getRigNodeWorldLength(); i++) {
        const originalWorldMatrix = meshA.getWorldMatrixForNode(i);
        mergedMesh.setWorldMatrixForNode(i, originalWorldMatrix);
    }

    return mergedMesh;
}
