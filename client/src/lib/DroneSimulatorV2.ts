import * as THREE from "three";
import { AStarPlanner, RRTPlanner, TrajectorySmoothing, type Vector3, type Obstacle, type PathPlanningConfig } from "./PathPlanner";

export type ViewMode = "free" | "top" | "side" | "follow" | "isometric";

export interface DroneState {
  position: [number, number, number];
  rotation: [number, number, number];
  velocity: [number, number, number];
  battery: number;
  status: "idle" | "flying" | "paused";
}

export interface TrajectoryPoint {
  position: [number, number, number];
  timestamp: number;
  velocity: number;
}

/**
 * 增强版 3D 无人机仿真器
 * 包含完整的 3D 环境、避障和路径规划
 */
export class DroneSimulatorV2 {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private drone: THREE.Group;
  private droneState: DroneState;
  private trajectoryPoints: TrajectoryPoint[] = [];
  private trajectoryLine: THREE.Line | null = null;
  private viewMode: ViewMode = "free";
  private obstacles: Obstacle[] = [];
  private obstaclesMeshes: THREE.Mesh[] = [];
  private gridHelper: THREE.GridHelper;
  private axesHelper: THREE.AxesHelper;

  constructor(canvas: HTMLCanvasElement) {
    // 初始化场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e27); // 深黑色背景
    this.scene.fog = new THREE.Fog(0x0a0e27, 200, 500);

    // 初始化相机
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(50, 50, 50);
    this.camera.lookAt(0, 0, 0);

    // 初始化渲染器
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
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

    // 创建无人机模型
    this.drone = this.createDroneModel();
    this.scene.add(this.drone);

    // 添加灯光
    this.setupLights();

    // 添加环境
    this.setupEnvironment();

    // 添加网格和坐标轴
    this.gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
    this.scene.add(this.gridHelper);

    this.axesHelper = new THREE.AxesHelper(50);
    this.scene.add(this.axesHelper);

    // 启动渲染循环
    this.animate();

    // 处理窗口大小变化
    window.addEventListener("resize", () => this.onWindowResize());
  }

  /**
   * 创建无人机模型
   */
  private createDroneModel(): THREE.Group {
    const group = new THREE.Group();

    // 机身
    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.4);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xff007f });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 四个螺旋桨
    const propPositions = [
      [0.2, 0.1, 0.2],
      [-0.2, 0.1, 0.2],
      [0.2, 0.1, -0.2],
      [-0.2, 0.1, -0.2],
    ];

    for (const pos of propPositions) {
      const propGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8);
      const propMaterial = new THREE.MeshPhongMaterial({ color: 0x00ffff });
      const prop = new THREE.Mesh(propGeometry, propMaterial);
      prop.position.set(pos[0], pos[1], pos[2]);
      prop.castShadow = true;
      group.add(prop);
    }

    // 天线
    const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
    const antennaMaterial = new THREE.MeshPhongMaterial({ color: 0xff007f });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.y = 0.15;
    antenna.castShadow = true;
    group.add(antenna);

    return group;
  }

  /**
   * 设置灯光
   */
  private setupLights(): void {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // 方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    this.scene.add(directionalLight);

    // 点光源（霓虹效果）
    const pointLight = new THREE.PointLight(0xff007f, 0.5);
    pointLight.position.set(0, 50, 0);
    this.scene.add(pointLight);
  }

  /**
   * 设置环境（地形、建筑物、树木等）
   */
  private setupEnvironment(): void {
    // 地面
    const groundGeometry = new THREE.PlaneGeometry(300, 300);
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 添加一些建筑物作为障碍物
    this.addBuildings();

    // 添加树木
    this.addTrees();
  }

  /**
   * 添加建筑物
   */
  private addBuildings(): void {
    const buildingPositions = [
      { x: 30, z: 30, width: 20, height: 40, depth: 20 },
      { x: -40, z: 20, width: 25, height: 35, depth: 25 },
      { x: 0, z: -50, width: 30, height: 50, depth: 20 },
      { x: -60, z: -30, width: 20, height: 30, depth: 30 },
    ];

    for (const building of buildingPositions) {
      const geometry = new THREE.BoxGeometry(building.width, building.height, building.depth);
      const material = new THREE.MeshPhongMaterial({ color: 0x333366 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(building.x, building.height / 2, building.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.obstaclesMeshes.push(mesh);

      // 添加到障碍物列表
      this.obstacles.push({
        position: { x: building.x, y: building.height / 2, z: building.z },
        radius: Math.max(building.width, building.depth) / 2 + 5,
      });
    }
  }

  /**
   * 添加树木
   */
  private addTrees(): void {
    const treePositions = [
      { x: 50, z: 0 },
      { x: -50, z: 50 },
      { x: 20, z: -60 },
      { x: -30, z: -40 },
      { x: 70, z: -30 },
    ];

    for (const tree of treePositions) {
      // 树干
      const trunkGeometry = new THREE.CylinderGeometry(2, 3, 15, 8);
      const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.set(tree.x, 7.5, tree.z);
      trunk.castShadow = true;
      this.scene.add(trunk);

      // 树冠
      const foliageGeometry = new THREE.SphereGeometry(12, 8, 8);
      const foliageMaterial = new THREE.MeshPhongMaterial({ color: 0x228b22 });
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.set(tree.x, 25, tree.z);
      foliage.castShadow = true;
      this.scene.add(foliage);

      // 添加到障碍物列表
      this.obstacles.push({
        position: { x: tree.x, y: 25, z: tree.z },
        radius: 15,
      });
    }
  }

  /**
   * 设置无人机状态
   */
  setDroneState(state: Partial<DroneState>): void {
    this.droneState = { ...this.droneState, ...state };
    this.drone.position.set(
      this.droneState.position[0],
      this.droneState.position[1],
      this.droneState.position[2]
    );
    this.drone.rotation.set(
      this.droneState.rotation[0],
      this.droneState.rotation[1],
      this.droneState.rotation[2]
    );
  }

  /**
   * 获取无人机状态
   */
  getDroneState(): DroneState {
    return this.droneState;
  }

  /**
   * 设置轨迹
   */
  setTrajectory(points: TrajectoryPoint[]): void {
    this.trajectoryPoints = points;
    this.updateTrajectoryVisualization();
  }

  /**
   * 添加轨迹点
   */
  addTrajectoryPoint(point: TrajectoryPoint): void {
    this.trajectoryPoints.push(point);
    this.updateTrajectoryVisualization();
  }

  /**
   * 获取轨迹点
   */
  getTrajectoryPoints(): TrajectoryPoint[] {
    return this.trajectoryPoints;
  }

  /**
   * 清除轨迹
   */
  clearTrajectory(): void {
    this.trajectoryPoints = [];
    if (this.trajectoryLine) {
      this.scene.remove(this.trajectoryLine);
      this.trajectoryLine = null;
    }
  }

  /**
   * 更新轨迹可视化
   */
  private updateTrajectoryVisualization(): void {
    if (this.trajectoryLine) {
      this.scene.remove(this.trajectoryLine);
    }

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];

    for (const point of this.trajectoryPoints) {
      positions.push(point.position[0], point.position[1], point.position[2]);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));

    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      linewidth: 2,
    });

    this.trajectoryLine = new THREE.Line(geometry, material);
    this.scene.add(this.trajectoryLine);
  }

  /**
   * 设置视角模式
   */
  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.updateCameraPosition();
  }

  /**
   * 更新相机位置
   */
  private updateCameraPosition(): void {
    const dronePos = this.drone.position;
    const distance = 50;

    switch (this.viewMode) {
      case "top":
        this.camera.position.set(dronePos.x, dronePos.y + distance, dronePos.z);
        this.camera.lookAt(dronePos);
        break;
      case "side":
        this.camera.position.set(dronePos.x + distance, dronePos.y, dronePos.z);
        this.camera.lookAt(dronePos);
        break;
      case "follow":
        this.camera.position.set(
          dronePos.x - 30,
          dronePos.y + 20,
          dronePos.z - 30
        );
        this.camera.lookAt(dronePos);
        break;
      case "isometric":
        this.camera.position.set(
          dronePos.x + distance * 0.7,
          dronePos.y + distance * 0.7,
          dronePos.z + distance * 0.7
        );
        this.camera.lookAt(dronePos);
        break;
      case "free":
      default:
        break;
    }
  }

  /**
   * 规划路径（使用 A* 或 RRT）
   */
  planPath(startPos: [number, number, number], endPos: [number, number, number], algorithm: "astar" | "rrt" = "astar"): Vector3[] {
    const config: PathPlanningConfig = {
      startPos: { x: startPos[0], y: startPos[1], z: startPos[2] },
      endPos: { x: endPos[0], y: endPos[1], z: endPos[2] },
      obstacles: this.obstacles,
      gridSize: 5,
      droneRadius: 2,
      maxIterations: 1000,
    };

    let path: Vector3[];

    if (algorithm === "rrt") {
      const planner = new RRTPlanner(config);
      path = planner.plan();
    } else {
      const planner = new AStarPlanner(config);
      path = planner.plan();
    }

    // 平滑路径
    path = TrajectorySmoothing.smoothPath(path, 20);

    return path;
  }

  /**
   * 生成轨迹点（基于规划的路径）
   */
  generateTrajectoryFromPath(path: Vector3[], speed: number = 10): TrajectoryPoint[] {
    const trajectory: TrajectoryPoint[] = [];
    let totalDistance = 0;

    // 计算总距离
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      const dz = path[i].z - path[i - 1].z;
      totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    const totalTime = totalDistance / speed;
    const pointsCount = Math.max(100, Math.floor(totalTime * 10));

    for (let i = 0; i < pointsCount; i++) {
      const progress = i / pointsCount;
      const distanceAlongPath = totalDistance * progress;

      let currentDistance = 0;
      let position: Vector3 = path[0];

      for (let j = 1; j < path.length; j++) {
        const dx = path[j].x - path[j - 1].x;
        const dy = path[j].y - path[j - 1].y;
        const dz = path[j].z - path[j - 1].z;
        const segmentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (currentDistance + segmentDistance >= distanceAlongPath) {
          const segmentProgress = (distanceAlongPath - currentDistance) / segmentDistance;
          position = {
            x: path[j - 1].x + (path[j].x - path[j - 1].x) * segmentProgress,
            y: path[j - 1].y + (path[j].y - path[j - 1].y) * segmentProgress,
            z: path[j - 1].z + (path[j].z - path[j - 1].z) * segmentProgress,
          };
          break;
        }

        currentDistance += segmentDistance;
      }

      trajectory.push({
        position: [position.x, position.y, position.z],
        timestamp: (i / pointsCount) * totalTime,
        velocity: speed,
      });
    }

    return trajectory;
  }

  /**
   * 处理窗口大小变化
   */
  private onWindowResize(): void {
    const width = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * 渲染循环
   */
  private animate = (): void => {
    requestAnimationFrame(this.animate);

    // 更新相机位置（跟随模式）
    if (this.viewMode === "follow") {
      this.updateCameraPosition();
    }

    this.renderer.render(this.scene, this.camera);
  };

  /**
   * 清理资源
   */
  dispose(): void {
    this.renderer.dispose();
  }
}
