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
    MeshBuilder,
    Color3,
    StandardMaterial,
    HemisphericLight,
} from '@babylonjs/core';
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";

import { getElementsByIds } from './utils';
import StatusBar from './StatusBar';

// Babylon objects initialized by the app and reused in other methods.
interface BabylonControllers {
    engine: Engine;
    scene: Scene;
    camera: Camera;
    gizmoManagers: GizmoManager[];
}

// Objects related to the mechanism that regroups all splat meshes together
// to be rendered in a single draw call.
interface MultiSplat {
    renderMesh: GaussianSplattingMesh;
    nextPartIndex: number;
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

        engine.runRenderLoop(() => scene.render());
        
        window.addEventListener("resize", function () {
            engine.resize();
        });
        engine.resize();

        return {
            engine,
            scene,
            camera,
            gizmoManagers :[],
        };
    }

    private setupMultiSplat(scene: Scene): MultiSplat {
        // Also ass a test mesh before the splat mesh.
        const testMesh = MeshBuilder.CreateBox("testMesh", { size: 1 }, scene);
        // Add a flat material to the test mesh.
        const flatMaterial = new StandardMaterial("flatMaterial", scene);
        flatMaterial.diffuseColor = new Color3(1, 0, 0);
        flatMaterial.backFaceCulling = false;
        testMesh.material = flatMaterial;
        // Add sun light to the scene.
        const sunLight = new HemisphericLight("sunLight", new Vector3(0, 1, 0), scene);
        sunLight.intensity = 1;

        const renderMesh = new GaussianSplattingMesh(
            "renderMesh",
            null,
            scene,
            true // keepInRam - so we can read back splatsData for appending
        );
        
        return {
            renderMesh,
            nextPartIndex: 0,
        };
    }

    private createGizmoManager(): GizmoManager {
        const { babylon } = this.controllers;
        const { scene } = babylon;
        const gizmoManager = new GizmoManager(scene);
        gizmoManager.positionGizmoEnabled = true;
        gizmoManager.rotationGizmoEnabled = true;
        gizmoManager.usePointerToAttachGizmos = false;
        babylon.gizmoManagers.push(gizmoManager);
        return gizmoManager;
    }

    /**
     * Load a GaussianSplattingMesh from a path/URL and wait for it to load.
     * @param modelPath - The path/URL of the model to load.
     * @returns The loaded GaussianSplattingMesh.
     */
    async loadGaussianSplattingMesh(modelPath: string): Promise<GaussianSplattingMesh> {
        const { babylon } = this.controllers;
        const { scene } = babylon;

        const mesh = new GaussianSplattingMesh(
            modelPath, // name
            modelPath, // url
            scene,
            true // keepInRam - so we can read back splatsData for appending
        );

        // Wait for loading to complete
        const loadingPromise = mesh.getLoadingPromise();
        if (loadingPromise) {
            await loadingPromise;
        }

        return mesh;
    }

    /* ********** PUBLIC METHODS ********** */

    /**
     * Load a GSplat model from a path/URL.
     * @param modelPath - The path/URL of the model to load.
     * @returns The loaded mesh.
     */
    public async loadModel(modelPath: string): Promise<Mesh> {
        const { statusBar, multiSplat } = this.controllers;

        const statusHandle = statusBar.setStatus(`Loading '${modelPath}'...`);

        const mesh = await this.loadGaussianSplattingMesh(modelPath);

        const placeholderMesh = multiSplat.renderMesh.addPart(mesh);

        statusBar.unsetStatus(statusHandle);

        // Attach gizmo to the latest loaded mesh
        const gizmoManager = this.createGizmoManager();
        gizmoManager.attachToMesh(placeholderMesh);

        return placeholderMesh;
    }
}
