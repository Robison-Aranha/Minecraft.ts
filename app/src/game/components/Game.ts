import * as THREE from "three";
import { Player } from "./Player/Player";
import { World } from "./world/World";
import Stats from "three/examples/jsm/libs/stats.module.js";


export class Game {
    private stats: Stats | undefined;
    private player: Player = new Player();
    private ref:React.RefObject<HTMLDivElement | null>;
    private world: World;
    private scene: THREE.Scene = new THREE.Scene();
    private renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();

    constructor(chunckQt: number, ref: React.RefObject<HTMLDivElement | null>) {
        this.ref = ref;
        this.world = new World(chunckQt);
    }

    setupWorld() {
        this.world.setupLights();
        this.world.generateWorld();
        console.log(this.world.children);
        this.scene.add(this.world);
    }

    setupPLayer() {
        this.player.setupCamera();
        this.player.setupControls();
    }

    setupGame() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x80a0e0);
        this.ref.current?.appendChild(this.renderer.domElement);
    }

    render() {
        if (this.renderer) {
            requestAnimationFrame(this.render.bind(this));
            this.player.updatePlayerPosition(this.world);
            this.renderer.render(this.scene, this.player.getCamera());
            this.stats?.update();
            this.player.update();
        }
    }

    setUpStats() {
        this.stats = new Stats();
        this.ref.current?.appendChild(this.stats.dom);
    }

    resizeService() {
        window.addEventListener("resize", () => {
          this.player.getCamera().aspect = window.innerWidth / window.innerHeight;
          this.player.getCamera().updateProjectionMatrix();
          this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    };

}