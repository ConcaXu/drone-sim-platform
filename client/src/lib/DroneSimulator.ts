import * as THREE from "three";

export interface DroneState {
  position: [number, number, number];
  rotation: [number, number, number];
  velocity: [number, number, number];
  battery: number;
  status: "idle" | "flying" | "paused" | "landed";
}

export interface TrajectoryPoint {
  position: [number, number, number];
  timestamp: number;
  velocity: number;
}

export type ViewMode = "free" | "top" | "side" | "follow" | "isometric";

export class DroneSimulator {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private droneGroup: THREE.Group;
  private trajectoryLine: THREE.Line | null = null;
  private trajectoryPoints: TrajectoryPoint[] = [];
  private droneState: DroneState;
  private viewMode: ViewMode = "free";
  private cameraTarget: THREE.Vector3 = new THREE.Vector3();
  private controls: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
  } = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  };

  constructor(canvas: HTMLCanvasElement) {
    // 初始化场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e27);
    this.scene.fog = new THREE.Fog(0x0a0e27, 200, 1000);

    // 初始化相机
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      10000
    );
    this.camera.position.set(50, 50, 50);
    this.camera.lookAt(0, 0, 0);

    // 初始化渲染器
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // 初始化无人机状态
    this.droneState = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      velocity: [0, 0, 0],
      battery: 100,
      status: "idle",
    };

    // 创建无人机组
    this.droneGroup = new THREE.Group();
    this.scene.add(this.droneGroup);

    // 设置场景
    this.setupScene();
    this.setupLights();
    this.createDrone();
    this.setupEventListeners();
    this.animate();
  }

  private setupScene(): void {
    // 创建网格
    const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
    this.scene.add(gridHelper);

    // 创建坐标轴
    const axesHelper = new THREE.AxesHelper(50);
    this.scene.add(axesHelper);

    // 创建地面
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private setupLights(): void {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x00ffff, 0.4);
    this.scene.add(ambientLight);

    // 方向光（太阳）
    const directionalLight = new THREE.DirectionalLight(0xff007f, 0.8);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    this.scene.add(directionalLight);

    // 点光源（霓虹效果）
    const pointLight = new THREE.PointLight(0x00ffff, 1, 300);
    pointLight.position.set(0, 50, 0);
    this.scene.add(pointLight);
  }

  private createDrone(): void {
    // 创建无人机主体
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 3);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xff007f,
      emissive: 0xff007f,
      emissiveIntensity: 0.3,
      metalness: 0.8,
      roughness: 0.2,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    this.droneGroup.add(body);

    // 创建四个螺旋桨
    const propellerPositions = [
      [-1.5, 0.5, -1.5],
      [1.5, 0.5, -1.5],
      [-1.5, 0.5, 1.5],
      [1.5, 0.5, 1.5],
    ];

    propellerPositions.forEach((pos) => {
      const propellerGroup = new THREE.Group();
      propellerGroup.position.set(pos[0], pos[1], pos[2]);

      // 螺旋桨
      const propellerGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32);
      const propellerMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.2,
        metalness: 0.9,
        roughness: 0.1,
      });
      const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
      propeller.castShadow = true;
      propeller.receiveShadow = true;
      propellerGroup.add(propeller);

      this.droneGroup.add(propellerGroup);
    });

    // 创建天线
    const antennaGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3);
    const antennaMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5,
    });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.y = 2;
    antenna.castShadow = true;
    this.droneGroup.add(antenna);
  }

  private setupEventListeners(): void {
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));
    window.addEventListener("resize", () => this.handleResize());
  }

  private handleKeyDown(event: KeyboardEvent): void {
    switch (event.key.toLowerCase()) {
      case "w":
        this.controls.forward = true;
        break;
      case "s":
        this.controls.backward = true;
        break;
      case "a":
        this.controls.left = true;
        break;
      case "d":
        this.controls.right = true;
        break;
      case " ":
        this.controls.up = true;
        event.preventDefault();
        break;
      case "shift":
        this.controls.down = true;
        break;
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    switch (event.key.toLowerCase()) {
      case "w":
        this.controls.forward = false;
        break;
      case "s":
        this.controls.backward = false;
        break;
      case "a":
        this.controls.left = false;
        break;
      case "d":
        this.controls.right = false;
        break;
      case " ":
        this.controls.up = false;
        break;
      case "shift":
        this.controls.down = false;
        break;
    }
  }

  private handleResize(): void {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    // 更新相机
    this.updateCamera();

    // 旋转螺旋桨
    this.droneGroup.children.forEach((child) => {
      if (child instanceof THREE.Group) {
        child.children.forEach((subChild) => {
          if (subChild instanceof THREE.Mesh) {
            subChild.rotation.z += 0.1;
          }
        });
      }
    });

    this.renderer.render(this.scene, this.camera);
  };

  private updateCamera(): void {
    const speed = 0.5;

    if (this.controls.forward) {
      this.camera.position.z -= speed;
    }
    if (this.controls.backward) {
      this.camera.position.z += speed;
    }
    if (this.controls.left) {
      this.camera.position.x -= speed;
    }
    if (this.controls.right) {
      this.camera.position.x += speed;
    }
    if (this.controls.up) {
      this.camera.position.y += speed;
    }
    if (this.controls.down) {
      this.camera.position.y -= speed;
    }

    switch (this.viewMode) {
      case "top":
        this.camera.position.set(
          this.droneState.position[0],
          100,
          this.droneState.position[2]
        );
        this.camera.lookAt(
          this.droneState.position[0],
          0,
          this.droneState.position[2]
        );
        break;
      case "side":
        this.camera.position.set(
          this.droneState.position[0] + 100,
          this.droneState.position[1],
          this.droneState.position[2]
        );
        this.camera.lookAt(
          this.droneState.position[0],
          this.droneState.position[1],
          this.droneState.position[2]
        );
        break;
      case "follow":
        const offset = 20;
        this.camera.position.set(
          this.droneState.position[0] - offset,
          this.droneState.position[1] + offset,
          this.droneState.position[2] + offset
        );
        this.camera.lookAt(
          this.droneState.position[0],
          this.droneState.position[1],
          this.droneState.position[2]
        );
        break;
      case "isometric":
        this.camera.position.set(
          this.droneState.position[0] + 50,
          this.droneState.position[1] + 50,
          this.droneState.position[2] + 50
        );
        this.camera.lookAt(
          this.droneState.position[0],
          this.droneState.position[1],
          this.droneState.position[2]
        );
        break;
    }
  }

  public setDroneState(state: Partial<DroneState>): void {
    this.droneState = { ...this.droneState, ...state };
    this.droneGroup.position.set(
      this.droneState.position[0],
      this.droneState.position[1],
      this.droneState.position[2]
    );
    this.droneGroup.rotation.set(
      this.droneState.rotation[0],
      this.droneState.rotation[1],
      this.droneState.rotation[2]
    );
  }

  public addTrajectoryPoint(point: TrajectoryPoint): void {
    this.trajectoryPoints.push(point);
    this.updateTrajectoryLine();
  }

  public setTrajectory(points: TrajectoryPoint[]): void {
    this.trajectoryPoints = points;
    this.updateTrajectoryLine();
  }

  private updateTrajectoryLine(): void {
    if (this.trajectoryLine) {
      this.scene.remove(this.trajectoryLine);
    }

    if (this.trajectoryPoints.length < 2) return;

    const points = this.trajectoryPoints.map(
      (p) => new THREE.Vector3(p.position[0], p.position[1], p.position[2])
    );

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      linewidth: 2,
      fog: false,
    });

    this.trajectoryLine = new THREE.Line(geometry, material);
    this.scene.add(this.trajectoryLine);
  }

  public setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
  }

  public getDroneState(): DroneState {
    return this.droneState;
  }

  public getTrajectoryPoints(): TrajectoryPoint[] {
    return this.trajectoryPoints;
  }

  public clearTrajectory(): void {
    this.trajectoryPoints = [];
    if (this.trajectoryLine) {
      this.scene.remove(this.trajectoryLine);
      this.trajectoryLine = null;
    }
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
