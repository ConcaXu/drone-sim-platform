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

  // 鼠标交互相关
  private mouseDown = false;
  private mouseX = 0;
  private mouseY = 0;
  private targetRotationX = 0;
  private targetRotationY = 0;
  private rotationX = 0;
  private rotationY = 0;
  private distance = 80;
  private targetDistance = 80;
  private panX = 0;
  private panY = 0;
  private targetPanX = 0;
  private targetPanY = 0;
  private cameraTarget = new THREE.Vector3(0, 0, 0);

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

    // 设置鼠标事件
    this.setupMouseControls(canvas);

    // 启动渲染循环
    this.animate();

    // 处理窗口大小变化
    window.addEventListener("resize", () => this.onWindowResize());
  }

  /**
   * 设置鼠标控制
   */
  private setupMouseControls(canvas: HTMLCanvasElement): void {
    // 鼠标按下
    canvas.addEventListener("mousedown", (e: MouseEvent) => {
      this.mouseDown = true;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    // 鼠标移动
    canvas.addEventListener("mousemove", (e: MouseEvent) => {
      if (this.mouseDown && this.viewMode === "free") {
        const deltaX = e.clientX - this.mouseX;
        const deltaY = e.clientY - this.mouseY;

        // 根据鼠标按钮类型处理不同操作
        if (e.buttons === 1) {
          // 左键：旋转
          this.targetRotationY += deltaX * 0.005;
          this.targetRotationX += deltaY * 0.005;

          // 限制 X 轴旋转范围
          this.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotationX));
        } else if (e.buttons === 4) {
          // 中键：平移
          this.targetPanX -= deltaX * 0.1;
          this.targetPanY += deltaY * 0.1;
        }

        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
      }
    });

    // 鼠标抬起
    canvas.addEventListener("mouseup", () => {
      this.mouseDown = false;
    });

    // 鼠标离开
    canvas.addEventListener("mouseleave", () => {
      this.mouseDown = false;
    });

    // 滚轮缩放
    canvas.addEventListener("wheel", (e: WheelEvent) => {
      e.preventDefault();
      const zoomSpeed = 2;
      if (e.deltaY > 0) {
        this.targetDistance *= 1 + zoomSpeed * 0.01;
      } else {
        this.targetDistance /= 1 + zoomSpeed * 0.01;
      }
      // 限制缩放范围
      this.targetDistance = Math.max(10, Math.min(200, this.targetDistance));
    });
  }

  /**
   * 创建无人机模型
   */
  private createDroneModel(): THREE.Group {
    const group = new THREE.Group();

    // 机身
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 3);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xff007f });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);

    // 四个螺旋桨
    const propPositions = [
      [-1.5, 0.5, -1.5],
      [1.5, 0.5, -1.5],
      [-1.5, 0.5, 1.5],
      [1.5, 0.5, 1.5],
    ];

    for (const pos of propPositions) {
      const propGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 8);
      const propMaterial = new THREE.MeshPhongMaterial({ color: 0x00ffff });
      const prop = new THREE.Mesh(propGeometry, propMaterial);
      prop.position.set(pos[0], pos[1], pos[2]);
      prop.castShadow = true;
      group.add(prop);
    }

    // 天线
    const antennaGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
    const antennaMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0, 1.5, 0);
    antenna.castShadow = true;
    group.add(antenna);

    return group;
  }

  /**
   * 设置灯光
   */
  private setupLights(): void {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // 方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    this.scene.add(directionalLight);

    // 点光源
    const pointLight = new THREE.PointLight(0x00ffff, 0.5, 100);
    pointLight.position.set(0, 50, 0);
    this.scene.add(pointLight);
  }

  /**
   * 设置环境
   */
  private setupEnvironment(): void {
    // 地面
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x1a1a2e });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 添加建筑物
    this.addBuildings();

    // 添加树木
    this.addTrees();
  }

  /**
   * 添加建筑物
   */
  private addBuildings(): void {
    const buildings = [
      { x: -50, z: -50, width: 20, depth: 20, height: 30 },
      { x: 50, z: -50, width: 25, depth: 15, height: 40 },
      { x: -50, z: 50, width: 15, depth: 25, height: 35 },
      { x: 50, z: 50, width: 20, depth: 20, height: 25 },
    ];

    for (const building of buildings) {
      const geometry = new THREE.BoxGeometry(building.width, building.height, building.depth);
      const material = new THREE.MeshPhongMaterial({ color: 0x444466 });
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
    if (mode !== "free") {
      this.updateCameraPosition();
    }
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
   * 更新自由视角相机
   */
  private updateFreeCamera(): void {
    // 平滑过渡旋转
    this.rotationX += (this.targetRotationX - this.rotationX) * 0.1;
    this.rotationY += (this.targetRotationY - this.rotationY) * 0.1;

    // 平滑过渡距离
    this.distance += (this.targetDistance - this.distance) * 0.1;

    // 平滑过渡平移
    this.panX += (this.targetPanX - this.panX) * 0.1;
    this.panY += (this.targetPanY - this.panY) * 0.1;

    // 计算相机位置
    const x = Math.sin(this.rotationY) * Math.cos(this.rotationX) * this.distance + this.cameraTarget.x + this.panX;
    const y = Math.sin(this.rotationX) * this.distance + this.cameraTarget.y + this.panY;
    const z = Math.cos(this.rotationY) * Math.cos(this.rotationX) * this.distance + this.cameraTarget.z;

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  /**
   * 渲染循环
   */
  private animate = (): void => {
    requestAnimationFrame(this.animate);

    // 更新相机
    if (this.viewMode === "free") {
      this.updateFreeCamera();
    } else if (this.viewMode === "follow") {
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
