/**
 * 路径规划和避障算法
 * 支持 A* 和 RRT 算法
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Obstacle {
  position: Vector3;
  radius: number;
}

export interface PathPlanningConfig {
  startPos: Vector3;
  endPos: Vector3;
  obstacles: Obstacle[];
  gridSize: number;
  droneRadius: number;
  maxIterations: number;
}

export interface PathNode {
  position: Vector3;
  g: number; // 从起点到当前节点的成本
  h: number; // 从当前节点到终点的估计成本
  parent: PathNode | null;
}

/**
 * A* 路径规划算法（改进版）
 */
export class AStarPlanner {
  private config: PathPlanningConfig;
  private openSet: PathNode[] = [];
  private closedSet: PathNode[] = [];
  private nodeMap: Map<string, PathNode> = new Map();

  constructor(config: PathPlanningConfig) {
    this.config = config;
  }

  /**
   * 计算两点间的欧几里得距离
   */
  private distance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 获取节点的哈希键
   */
  private getNodeKey(pos: Vector3): string {
    const precision = 1;
    return `${Math.round(pos.x / precision) * precision},${Math.round(pos.y / precision) * precision},${Math.round(pos.z / precision) * precision}`;
  }

  /**
   * 检查点是否在障碍物内
   */
  private isPointClear(point: Vector3): boolean {
    for (const obstacle of this.config.obstacles) {
      const dist = this.distance(point, obstacle.position);
      // 增加安全距离：障碍物半径 + 无人机半径 + 额外缓冲
      if (dist < obstacle.radius + this.config.droneRadius + 2) {
        return false;
      }
    }
    return true;
  }

  /**
   * 检查两点之间的路径是否与障碍物碰撞（改进版）
   */
  private isPathClear(from: Vector3, to: Vector3): boolean {
    // 增加采样点数以提高精度
    const steps = Math.ceil(this.distance(from, to) / 2);
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        z: from.z + (to.z - from.z) * t,
      };

      if (!this.isPointClear(point)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 获取相邻节点（改进版）
   */
  private getNeighbors(node: PathNode): Vector3[] {
    const neighbors: Vector3[] = [];
    const step = this.config.gridSize;

    // 生成 26 个相邻方向（3D）
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;

          const neighbor = {
            x: node.position.x + dx * step,
            y: node.position.y + dy * step,
            z: node.position.z + dz * step,
          };

          // 检查边界、碰撞和路径清晰度
          if (
            neighbor.y >= 0 &&
            neighbor.y <= 100 &&
            this.isPointClear(neighbor) &&
            this.isPathClear(node.position, neighbor)
          ) {
            neighbors.push(neighbor);
          }
        }
      }
    }

    return neighbors;
  }

  /**
   * 执行 A* 搜索
   */
  plan(): Vector3[] {
    // 检查起点和终点是否有效
    if (!this.isPointClear(this.config.startPos) || !this.isPointClear(this.config.endPos)) {
      console.warn("Start or end position is inside an obstacle");
      return [this.config.startPos, this.config.endPos];
    }

    const startNode: PathNode = {
      position: this.config.startPos,
      g: 0,
      h: this.distance(this.config.startPos, this.config.endPos),
      parent: null,
    };

    this.openSet.push(startNode);
    this.nodeMap.set(this.getNodeKey(startNode.position), startNode);

    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      if (this.openSet.length === 0) {
        console.warn("No path found, returning direct path");
        // 尝试直接连接
        if (this.isPathClear(this.config.startPos, this.config.endPos)) {
          return [this.config.startPos, this.config.endPos];
        }
        // 返回带中间点的路径
        return this.getAlternativePath();
      }

      // 找到 f 值最小的节点
      let current: PathNode | null = null;
      let minF = Infinity;
      let minIndex = -1;

      for (let i = 0; i < this.openSet.length; i++) {
        const node = this.openSet[i];
        const f = node.g + node.h;
        if (f < minF) {
          minF = f;
          current = node;
          minIndex = i;
        }
      }

      if (!current) break;

      // 检查是否到达终点
      if (this.distance(current.position, this.config.endPos) < this.config.gridSize * 2) {
        // 尝试直接连接到终点
        if (this.isPathClear(current.position, this.config.endPos)) {
          const path = this.reconstructPath(current);
          path.push(this.config.endPos);
          return path;
        }
      }

      this.openSet.splice(minIndex, 1);
      this.closedSet.push(current);

      // 检查相邻节点
      for (const neighborPos of this.getNeighbors(current)) {
        const key = this.getNodeKey(neighborPos);
        
        // 跳过已在关闭集合中的节点
        if (this.closedSet.some(n => this.getNodeKey(n.position) === key)) {
          continue;
        }

        const tentativeG = current.g + this.distance(current.position, neighborPos);
        const existingNode = this.nodeMap.get(key);

        // 如果已存在且新的 g 值不更优，跳过
        if (existingNode && tentativeG >= existingNode.g) {
          continue;
        }

        const neighbor: PathNode = {
          position: neighborPos,
          g: tentativeG,
          h: this.distance(neighborPos, this.config.endPos),
          parent: current,
        };

        this.openSet.push(neighbor);
        this.nodeMap.set(key, neighbor);
      }
    }

    return this.getAlternativePath();
  }

  /**
   * 获取替代路径（绕过障碍物）
   */
  private getAlternativePath(): Vector3[] {
    const path: Vector3[] = [this.config.startPos];
    
    // 添加中间点以避开障碍物
    const midPoint = {
      x: (this.config.startPos.x + this.config.endPos.x) / 2,
      y: Math.max(this.config.startPos.y, this.config.endPos.y) + 20,
      z: (this.config.startPos.z + this.config.endPos.z) / 2,
    };

    if (this.isPathClear(this.config.startPos, midPoint)) {
      path.push(midPoint);
    }

    path.push(this.config.endPos);
    return path;
  }

  /**
   * 重建路径
   */
  private reconstructPath(node: PathNode): Vector3[] {
    const path: Vector3[] = [];
    let current: PathNode | null = node;

    while (current) {
      path.unshift(current.position);
      current = current.parent;
    }

    return path;
  }
}

/**
 * RRT（快速随机树）路径规划算法（改进版）
 */
export class RRTPlanner {
  private config: PathPlanningConfig;
  private nodes: Vector3[] = [];

  constructor(config: PathPlanningConfig) {
    this.config = config;
  }

  /**
   * 计算两点间的欧几里得距离
   */
  private distance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 检查点是否在障碍物内
   */
  private isPointClear(point: Vector3): boolean {
    for (const obstacle of this.config.obstacles) {
      const dist = this.distance(point, obstacle.position);
      // 增加安全距离
      if (dist < obstacle.radius + this.config.droneRadius + 2) {
        return false;
      }
    }
    return true;
  }

  /**
   * 检查两点之间的路径是否与障碍物碰撞
   */
  private isPathClear(from: Vector3, to: Vector3): boolean {
    const steps = Math.ceil(this.distance(from, to) / 2);
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        z: from.z + (to.z - from.z) * t,
      };

      if (!this.isPointClear(point)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 生成随机点
   */
  private randomPoint(): Vector3 {
    return {
      x: Math.random() * 200 - 100,
      y: Math.random() * 50 + 5,
      z: Math.random() * 200 - 100,
    };
  }

  /**
   * 找到最近的节点
   */
  private nearestNode(point: Vector3): Vector3 {
    let nearest = this.nodes[0];
    let minDist = this.distance(point, nearest);

    for (const node of this.nodes) {
      const dist = this.distance(point, node);
      if (dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    }

    return nearest;
  }

  /**
   * 沿着方向移动一步
   */
  private step(from: Vector3, to: Vector3, stepSize: number): Vector3 {
    const dist = this.distance(from, to);
    if (dist < stepSize) {
      return to;
    }

    const ratio = stepSize / dist;
    return {
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio,
      z: from.z + (to.z - from.z) * ratio,
    };
  }

  /**
   * 执行 RRT 搜索
   */
  plan(): Vector3[] {
    this.nodes = [this.config.startPos];

    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      // 有 10% 的概率直接朝向终点
      const randomPoint = Math.random() < 0.1 ? this.config.endPos : this.randomPoint();

      const nearest = this.nearestNode(randomPoint);
      const newPoint = this.step(nearest, randomPoint, this.config.gridSize * 2);

      if (this.isPointClear(newPoint) && this.isPathClear(nearest, newPoint)) {
        this.nodes.push(newPoint);

        // 检查是否到达终点
        if (this.distance(newPoint, this.config.endPos) < this.config.gridSize * 3) {
          if (this.isPathClear(newPoint, this.config.endPos)) {
            return this.reconstructPath(newPoint);
          }
        }
      }
    }

    // 返回最接近终点的路径
    let closest = this.nodes[0];
    let minDist = this.distance(this.nodes[0], this.config.endPos);

    for (const node of this.nodes) {
      const dist = this.distance(node, this.config.endPos);
      if (dist < minDist) {
        minDist = dist;
        closest = node;
      }
    }

    return this.reconstructPath(closest);
  }

  /**
   * 重建路径
   */
  private reconstructPath(endPoint: Vector3): Vector3[] {
    const path: Vector3[] = [];
    let current = endPoint;

    while (current) {
      path.unshift(current);

      // 找到到达当前点的前一个节点
      let nearest = this.nodes[0];
      let minDist = Infinity;

      for (const node of this.nodes) {
        if (node === current) continue;
        const dist = this.distance(node, current);
        if (dist < minDist && this.isPathClear(node, current)) {
          minDist = dist;
          nearest = node;
        }
      }

      if (minDist === Infinity) break;
      current = nearest;
    }

    path.push(this.config.endPos);
    return path;
  }
}

/**
 * 轨迹平滑算法
 */
export class TrajectorySmoothing {
  /**
   * 使用 Catmull-Rom 样条曲线平滑路径
   */
  static smoothPath(path: Vector3[], pointsPerSegment: number = 10): Vector3[] {
    if (path.length < 2) return path;

    const smoothed: Vector3[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const p0 = path[Math.max(0, i - 1)];
      const p1 = path[i];
      const p2 = path[i + 1];
      const p3 = path[Math.min(path.length - 1, i + 2)];

      for (let t = 0; t < pointsPerSegment; t++) {
        const s = t / pointsPerSegment;
        const s2 = s * s;
        const s3 = s2 * s;

        // Catmull-Rom 基函数
        const q = 0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * s +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3
        );

        const r = 0.5 * (
          (2 * p1.y) +
          (-p0.y + p2.y) * s +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * s2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * s3
        );

        const w = 0.5 * (
          (2 * p1.z) +
          (-p0.z + p2.z) * s +
          (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * s2 +
          (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * s3
        );

        smoothed.push({ x: q, y: r, z: w });
      }
    }

    // 添加最后一个点
    smoothed.push(path[path.length - 1]);

    return smoothed;
  }
}
