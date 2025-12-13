import * as THREE from "three";
import { Player } from "./Player/Player";
import { World } from "./world/World";
import Stats from "three/examples/jsm/libs/stats.module.js";

export class Game {
    private stats?: Stats;
    private player: Player;
    private ref: React.RefObject<HTMLDivElement | null>;
    private world: World;
    private scene: THREE.Scene = new THREE.Scene();
    private renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
    private clock: THREE.Clock = new THREE.Clock();

    constructor(chunckQt: number, ref: React.RefObject<HTMLDivElement | null>) {
        this.ref = ref;
        this.world = new World(chunckQt);
        this.player = new Player(this.world);
    }

    setupWorld() {
        this.world.setupLights();
        this.world.generateWorld();
        this.scene.add(this.world);
    }

    setupPlayer() {
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
            const delta = this.clock.getDelta() * 60;
            this.player.updatePlayerGround(delta);
            this.player.update(delta);
            this.renderer.render(this.scene, this.player.getCamera());
            this.stats?.update();
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
    }

    setPointingArrow() {
        if (this.ref.current) {
            this.ref.current.style.width = `${window.innerWidth}`;
            this.ref.current.style.height = `${window.innerHeight}`;
            this.ref.current.style.display = "flex";
            this.ref.current.style.justifyContent = "center";
            this.ref.current.style.alignItems = "center";
            this.ref.current.style.margin = "0";
            const arrow = document.createElement("p");
            arrow.textContent = "+";
            arrow.style.fontSize = "20px";
            arrow.style.position = "absolute";
            this.ref.current?.appendChild(arrow);
        }
    }
}
