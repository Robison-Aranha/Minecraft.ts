import * as THREE from "three";
import { Player } from "./player/Player";
import { World } from "./world/World";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { ChunkMsgTypes } from "./enums/ChunkMsgTypes.ts";
import { getNearChunksKeysGen } from "./utils/Utils.ts";


export class Game {
    private stats?: Stats;
    private player: Player;
    private ref: React.RefObject<HTMLDivElement | null>;
    private world: World;
    private scene: THREE.Scene = new THREE.Scene();
    private renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
    private clock: THREE.Clock = new THREE.Clock();
    private seed: number | undefined;
    private generating = false;

    constructor(chunkQt: number, ref: React.RefObject<HTMLDivElement | null>) {
        this.ref = ref;
        this.world = new World(chunkQt);
        this.player = new Player(this.world);
        this.world.setPlayer(this.player)
    }

    setSeed(seed: number) {
        this.seed = seed;
    }

    async setupWorld() {
        this.world.setupLights();
        if (this.seed) {
            this.world.setSeed(this.seed);
        }
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
            if (!this.generating) {
                this.updateChunks();
            }
        }
    }

   async updateChunks() {
        this.generating = true;
        const playerPosition = this.player.getCamera().position.clone();
        const chunksToRender = this.world.getChunksToRender(playerPosition);
        
        if (chunksToRender && chunksToRender.length > 0) {
            
            const blocksToGenerate = new Set<string>(chunksToRender);
            const meshesToGenerate = new Set<string>(chunksToRender);

            for (const chunk of chunksToRender) {
                const [x, y] = chunk.split(":").map(Number);
                const neighbours = getNearChunksKeysGen(x, y);

                for (const neighborKey of neighbours) {
                    if (this.world.getChunkMan().getChunkBlocksMap().has(neighborKey)) {
                        meshesToGenerate.add(neighborKey);
                    } else {
                        blocksToGenerate.add(neighborKey);
                    }
                }
            }

            const blocksArray = Array.from(blocksToGenerate);
            if (blocksArray.length > 0) {
                await this.world.generateWorld(ChunkMsgTypes.GEN_BLOCK, blocksArray);
            }

            for (const chunkKey of meshesToGenerate) {
                await this.world.generateWorld(ChunkMsgTypes.GEN_MESH, [chunkKey]);

                await new Promise(resolve => requestAnimationFrame(resolve));
            }
        }
        
        this.generating = false;
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
