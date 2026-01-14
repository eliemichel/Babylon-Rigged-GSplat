import {
    Engine,
    Scene,
    ArcRotateCamera,
    type Camera,
    Vector3,
    Color4,
    GizmoManager,
    Mesh,
    GaussianSplattingMesh,
} from '@babylonjs/core';
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";

import { getElementsByIds } from './utils';
import { mergeGaussianSplattingMeshes } from './gsplat-utils';
import StatusBar from './StatusBar';

// Babylon objects initialized by the app and reused in other methods.
interface BabylonControllers {
    engine: Engine;
    scene: Scene;
    camera: Camera;
    gizmoManager: GizmoManager;
}

// Objects related to the mechanism that regroups all splat meshes together
// to be rendered in a single draw call.
interface MultiSplat {
    renderMesh: GaussianSplattingMesh;
    nextNodeIndex: number;
}

interface AppControllers {
    statusBar: StatusBar;
    babylon: BabylonControllers;
    multiSplat: MultiSplat;
}

// DOM elements that are used in the app.
// NB: When adding an element here, you must also add it to the setupElements method.
interface AppElements {
    app: HTMLElement;
    renderCanvas: HTMLCanvasElement;
}

export default class App {
    elements: AppElements;
    controllers: AppControllers;

    constructor() {
        this.elements = this.setupElements();
        this.controllers = this.setupControllers();
    }

    /* ********** INITIALIZATION ********** */

    private setupElements(): AppElements {
        // NB: This must be synced with AppElements interface.
        return getElementsByIds([
            'app',
            'renderCanvas',
        ]) as unknown as AppElements;
    }

    private setupControllers(): AppControllers {
        const babylon = this.setupBabylon();
        return {
            statusBar: new StatusBar(),
            babylon,
            multiSplat: this.setupMultiSplat(babylon.scene),
        };
    }

    private setupBabylon(): BabylonControllers {
        const { renderCanvas } = this.elements;

        // Register built-in loaders, which are lazily loaded by the engine when a file format is encountered.
        registerBuiltInLoaders();

        // Create engine with adaptToDeviceRatio option
        const engine = new Engine(renderCanvas, true, {
            adaptToDeviceRatio: true
        });

        const scene = new Scene(engine);
        scene.clearColor = new Color4(0, 0, 0, 1);

        const camera = new ArcRotateCamera(
            'Main Camera',
            Math.PI * -0.05, //  angle
            Math.PI / 2 * 0.8, // tilt angle
            2, // distance from target
            new Vector3(0, 0, 0), // target
            scene,
        );
        camera.fov = Math.PI / 2 * 0.65;
        camera.lowerRadiusLimit = 0.1;
        camera.upperRadiusLimit = 100;
        camera.wheelPrecision = 20;
        camera.attachControl(renderCanvas, true);
        scene.activeCamera = camera;

        const gizmoManager = new GizmoManager(scene);
        gizmoManager.positionGizmoEnabled = true;
        gizmoManager.usePointerToAttachGizmos = false;

        gizmoManager.gizmos.positionGizmo?.onDragObservable.add(() => this.onGizmoDrag());

        engine.runRenderLoop(() => scene.render());
        
        window.addEventListener("resize", function () {
            engine.resize();
        });
        engine.resize();

        return {
            engine,
            scene,
            camera,
            gizmoManager,
        };
    }

    private setupMultiSplat(scene: Scene): MultiSplat {
        const renderMesh = new GaussianSplattingMesh(
            "renderMesh",
            null,
            scene,
            true // keepInRam - so we can read back splatsData for appending
        );
        
        return {
            renderMesh,
            nextNodeIndex: 0,
        };
    }

    private onGizmoDrag(): void {
        const { babylon, multiSplat } = this.controllers;
        const { gizmoManager } = babylon;
        const target = gizmoManager.attachedMesh;
        if (target && target.metadata?.nodeIndex !== undefined) {
            const nodeIndex = target.metadata.nodeIndex as number;
            multiSplat.renderMesh.setWorldMatrixForNode(nodeIndex, target.getWorldMatrix());
        }
    }

    /* ********** PUBLIC METHODS ********** */

    /**
     * Load a GSplat model from a path/URL.
     * @param modelPath - The path/URL of the model to load.
     * @param keepInRam - Keep splat data in RAM for access/editing (default: true).
     * @returns The loaded mesh.
     */
    public async loadModel(modelPath: string, keepInRam: boolean = true): Promise<Mesh> {
        const { statusBar, babylon, multiSplat } = this.controllers;
        const { scene } = babylon;

        const statusHandle = statusBar.setStatus(`Loading '${modelPath}'...`);

        // Create mesh manually with keepInRam option to retain splatsData
        const mesh = new GaussianSplattingMesh(
            modelPath, // name
            modelPath, // url
            scene,
            keepInRam  // keepInRam
        );

        // Wait for loading to complete
        const loadingPromise = mesh.getLoadingPromise();
        if (loadingPromise) {
            await loadingPromise;
        }

        // Assign a new fresh node index to the mesh
        const nodeIndex = multiSplat.nextNodeIndex;
        mesh.setNodeIndex(nodeIndex);
        multiSplat.nextNodeIndex++;

        // Add the mesh to the multi-splat render mesh
        multiSplat.renderMesh = mergeGaussianSplattingMeshes(multiSplat.renderMesh, mesh);

        mesh.computeWorldMatrix(true);
        const nodeWorldMatrix = mesh.getWorldMatrix();
        multiSplat.renderMesh.setWorldMatrixForNode(nodeIndex, nodeWorldMatrix);

        // Remove splats from the original mesh
        mesh.dispose();
        const placeholderMesh = new Mesh(modelPath, scene);
        
        // Directly set the world matrix using freezeWorldMatrix
        placeholderMesh.freezeWorldMatrix(nodeWorldMatrix);
        placeholderMesh.metadata = { nodeIndex: nodeIndex };

        statusBar.unsetStatus(statusHandle);

        // Attach gizmo to the latest loaded mesh
        babylon.gizmoManager.attachToMesh(placeholderMesh);

        return placeholderMesh;
    }
}
