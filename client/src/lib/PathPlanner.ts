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
 * A* 路径规划算法
 */
export class AStarPlanner {
  private config: PathPlanningConfig;
  private openSet: PathNode[] = [];
  private closedSet: PathNode[] = [];

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
   * 检查两点之间的路径是否与障碍物碰撞
   */
  private isPathClear(from: Vector3, to: Vector3): boolean {
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        z: from.z + (to.z - from.z) * t,
      };

      // 检查与所有障碍物的碰撞
      for (const obstacle of this.config.obstacles) {
        const dist = this.distance(point, obstacle.position);
        if (dist < obstacle.radius + this.config.droneRadius) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 获取相邻节点
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

          // 检查边界和碰撞
          if (
            this.isPathClear(node.position, neighbor) &&
            neighbor.y >= 0 &&
            neighbor.y <= this.config.gridSize * 10
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
    const startNode: PathNode = {
      position: this.config.startPos,
      g: 0,
      h: this.distance(this.config.startPos, this.config.endPos),
      parent: null,
    };

    this.openSet.push(startNode);

    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      if (this.openSet.length === 0) {
        console.warn("No path found");
        return [this.config.startPos, this.config.endPos];
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
      if (this.distance(current.position, this.config.endPos) < this.config.gridSize) {
        return this.reconstructPath(current);
      }

      this.openSet.splice(minIndex, 1);
      this.closedSet.push(current);

      // 检查相邻节点
      for (const neighborPos of this.getNeighbors(current)) {
        const tentativeG = current.g + this.distance(current.position, neighborPos);

        const neighbor: PathNode = {
          position: neighborPos,
          g: tentativeG,
          h: this.distance(neighborPos, this.config.endPos),
          parent: current,
        };

        this.openSet.push(neighbor);
      }
    }

    return [this.config.startPos, this.config.endPos];
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
 * RRT（快速随机树）路径规划算法
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
   * 检查两点之间的路径是否与障碍物碰撞
   */
  private isPathClear(from: Vector3, to: Vector3): boolean {
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        z: from.z + (to.z - from.z) * t,
      };

      for (const obstacle of this.config.obstacles) {
        const dist = this.distance(point, obstacle.position);
        if (dist < obstacle.radius + this.config.droneRadius) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 生成随机点
   */
  private randomPoint(): Vector3 {
    return {
      x: Math.random() * this.config.gridSize * 2 - this.config.gridSize,
      y: Math.random() * this.config.gridSize * 1.5,
      z: Math.random() * this.config.gridSize * 2 - this.config.gridSize,
    };
  }

  /**
   * 找到最近的节点
   */
  private nearest(point: Vector3): Vector3 {
    let nearest = this.nodes[0];
    let minDist = this.distance(nearest, point);

    for (const node of this.nodes) {
      const dist = this.distance(node, point);
      if (dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    }

    return nearest;
  }

  /**
   * 向目标点方向扩展
   */
  private extend(from: Vector3, to: Vector3): Vector3 {
    const dist = this.distance(from, to);
    const step = Math.min(this.config.gridSize, dist);

    if (dist === 0) return from;

    const direction = {
      x: (to.x - from.x) / dist,
      y: (to.y - from.y) / dist,
      z: (to.z - from.z) / dist,
    };

    return {
      x: from.x + direction.x * step,
      y: from.y + direction.y * step,
      z: from.z + direction.z * step,
    };
  }

  /**
   * 执行 RRT 搜索
   */
  plan(): Vector3[] {
    this.nodes = [this.config.startPos];

    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      const randomPoint = this.randomPoint();
      const nearest = this.nearest(randomPoint);
      const newPoint = this.extend(nearest, randomPoint);

      if (this.isPathClear(nearest, newPoint)) {
        this.nodes.push(newPoint);

        // 检查是否到达终点
        if (this.distance(newPoint, this.config.endPos) < this.config.gridSize * 2) {
          return this.reconstructPath();
        }
      }
    }

    return [this.config.startPos, this.config.endPos];
  }

  /**
   * 重建路径
   */
  private reconstructPath(): Vector3[] {
    // 从起点到终点的最短路径
    const path: Vector3[] = [this.config.startPos];

    let current = this.config.startPos;
    while (this.distance(current, this.config.endPos) > this.config.gridSize * 2) {
      let nearest = current;
      let minDist = Infinity;

      for (const node of this.nodes) {
        const dist = this.distance(node, this.config.endPos);
        if (dist < minDist && this.isPathClear(current, node)) {
          minDist = dist;
          nearest = node;
        }
      }

      if (nearest === current) break;
      path.push(nearest);
      current = nearest;
    }

    path.push(this.config.endPos);
    return path;
  }
}

/**
 * 轨迹平滑化（使用 Catmull-Rom 样条曲线）
 */
export class TrajectorySmoothing {
  /**
   * Catmull-Rom 样条插值
   */
  static smoothPath(path: Vector3[], segmentsPerPoint: number = 10): Vector3[] {
    if (path.length < 2) return path;

    const smoothed: Vector3[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const p0 = path[Math.max(0, i - 1)];
      const p1 = path[i];
      const p2 = path[i + 1];
      const p3 = path[Math.min(path.length - 1, i + 2)];

      for (let t = 0; t < segmentsPerPoint; t++) {
        const u = t / segmentsPerPoint;
        const u2 = u * u;
        const u3 = u2 * u;

        // Catmull-Rom 矩阵
        const point = {
          x:
            0.5 *
            (2 * p1.x +
              (-p0.x + p2.x) * u +
              (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 +
              (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
          y:
            0.5 *
            (2 * p1.y +
              (-p0.y + p2.y) * u +
              (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 +
              (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
          z:
            0.5 *
            (2 * p1.z +
              (-p0.z + p2.z) * u +
              (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * u2 +
              (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * u3),
        };

        smoothed.push(point);
      }
    }

    smoothed.push(path[path.length - 1]);
    return smoothed;
  }
}
