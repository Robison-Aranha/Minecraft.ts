import * as THREE from "three";
import { World } from "../world/World";

export class Player {
    private camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    private direction: THREE.Vector3 = new THREE.Vector3();
    private moveForward = false;
    private moveBackward = false;
    private moveLeft = false;
    private moveRight = false;
    private speed = 0.1;

    private yaw = 0;
    private pitch = 0;
    private mouseSensitivity = 0.002;

    
    private playerHeight = 1.8;
    private raycaster: THREE.Raycaster = new THREE.Raycaster();

    private downVector: THREE.Vector3 = new THREE.Vector3(0, -1, 0);

    setupCamera() {
        window.addEventListener('mousemove', (event) => {
      
            const deltaX = event.movementX || event.movementX  || 0;
            const deltaY = event.movementY || event.movementY || 0;

            this.yaw -= deltaX * this.mouseSensitivity;
            this.pitch -= deltaY * this.mouseSensitivity;

            const maxPitch = Math.PI / 2 - 0.1;
            this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

            // Math.sin(yaw) → Lado esquerdo/direito
            // Math.cos(yaw) → Frente/trás
            // Math.sin(pitch) → Controla o quão "para cima/baixo" você está olhando
            // Math.cos(pitch) → Diminui o movimento no chão conforme você olha mais para cima/baixo
            const direction = new THREE.Vector3();
            direction.set(
                Math.cos(this.pitch) * Math.sin(this.yaw),
                Math.sin(this.pitch),
                Math.cos(this.pitch) * Math.cos(this.yaw)
            );

            this.camera.lookAt(this.camera.position.clone().add(direction));
        });
        window.addEventListener('click', () => {
            document.body.requestPointerLock();
        });
        
        this.camera.position.set(100, 500, 32);
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'KeyD':
                    this.moveRight = true;
                    break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'KeyD':
                    this.moveRight = false;
                    break;
            }
        });
    }

    updatePlayerPosition(world: World) {

        const playerPos = this.camera.position.clone();
        playerPos.y -= this.playerHeight;

        this.raycaster.set(playerPos, this.downVector);

        const intersectsDown = this.raycaster.intersectObject(world, true); 

        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);

        let frontCord;
        let rightCord;
        let isXHigher = true;
    
        if (Math.abs(cameraDirection.x) > Math.abs(cameraDirection.z)) {
            if (cameraDirection.x > 0) {
                frontCord = 1;
                rightCord = 1;
            } else {
                frontCord = -1;
                rightCord = -1;
            }
        } else {
            isXHigher = false;
            if (cameraDirection.z > 0) {
                frontCord = 1;
                rightCord = -1;
            } else {
                frontCord = -1;
                rightCord = 1;
            }
        }

        
        
        if (intersectsDown.length > 0 && intersectsDown[0].point.y < playerPos.y) {
            const targetY = intersectsDown[0].point.y + this.playerHeight; 
            this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetY, 0.2);
        } else {
            if (this.moveForward) {
                
            }
        }
    }

    getCamera() : THREE.PerspectiveCamera {
        return this.camera;
    }

    update() {
        this.direction.set(0, 0, 0); 

        const front = new THREE.Vector3(
            Math.sin(this.yaw),
            0,
            Math.cos(this.yaw)
        );
        const right = new THREE.Vector3().crossVectors(front, new THREE.Vector3(0, 1, 0)).normalize();

        if (this.moveForward) this.direction.add(front);
        if (this.moveBackward) this.direction.sub(front);
        if (this.moveRight) this.direction.add(right);
        if (this.moveLeft) this.direction.sub(right);

        this.direction.normalize().multiplyScalar(this.speed);
        this.camera.position.add(this.direction);
    }

}