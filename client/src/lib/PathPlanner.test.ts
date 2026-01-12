import { describe, it, expect } from "vitest";
import { AStarPlanner, RRTPlanner, TrajectorySmoothing, type Vector3, type PathPlanningConfig } from "./PathPlanner";

describe("PathPlanner - A* Algorithm", () => {
  it("should find a path from start to end", () => {
    const config: PathPlanningConfig = {
      startPos: { x: 0, y: 0, z: 0 },
      endPos: { x: 10, y: 0, z: 10 },
      obstacles: [],
      gridSize: 2,
      droneRadius: 1,
      maxIterations: 100,
    };

    const planner = new AStarPlanner(config);
    const path = planner.plan();

    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual(config.startPos);
    expect(path[path.length - 1]).toEqual(config.endPos);
  });

  it("should avoid obstacles", () => {
    const config: PathPlanningConfig = {
      startPos: { x: 0, y: 0, z: 0 },
      endPos: { x: 20, y: 0, z: 0 },
      obstacles: [
        { position: { x: 10, y: 0, z: 0 }, radius: 3 },
      ],
      gridSize: 2,
      droneRadius: 1,
      maxIterations: 500,
    };

    const planner = new AStarPlanner(config);
    const path = planner.plan();

    // 检查路径是否避开了障碍物
    for (const point of path) {
      const dist = Math.sqrt(
        Math.pow(point.x - 10, 2) +
        Math.pow(point.y - 0, 2) +
        Math.pow(point.z - 0, 2)
      );
      expect(dist).toBeGreaterThanOrEqual(3 + 1 - 0.1); // 障碍物半径 + 无人机半径
    }
  });

  it("should return direct path when no obstacles", () => {
    const config: PathPlanningConfig = {
      startPos: { x: 0, y: 0, z: 0 },
      endPos: { x: 5, y: 0, z: 5 },
      obstacles: [],
      gridSize: 1,
      droneRadius: 0.5,
      maxIterations: 50,
    };

    const planner = new AStarPlanner(config);
    const path = planner.plan();

    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual(config.startPos);
  });
});

describe("PathPlanner - RRT Algorithm", () => {
  it("should find a path from start to end", () => {
    const config: PathPlanningConfig = {
      startPos: { x: 0, y: 0, z: 0 },
      endPos: { x: 10, y: 0, z: 10 },
      obstacles: [],
      gridSize: 2,
      droneRadius: 1,
      maxIterations: 200,
    };

    const planner = new RRTPlanner(config);
    const path = planner.plan();

    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual(config.startPos);
    expect(path[path.length - 1]).toEqual(config.endPos);
  });

  it("should handle multiple obstacles", () => {
    const config: PathPlanningConfig = {
      startPos: { x: 0, y: 0, z: 0 },
      endPos: { x: 30, y: 0, z: 30 },
      obstacles: [
        { position: { x: 10, y: 0, z: 10 }, radius: 3 },
        { position: { x: 20, y: 0, z: 20 }, radius: 3 },
      ],
      gridSize: 2,
      droneRadius: 1,
      maxIterations: 500,
    };

    const planner = new RRTPlanner(config);
    const path = planner.plan();

    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual(config.startPos);
  });
});

describe("TrajectorySmoothing", () => {
  it("should smooth a path using Catmull-Rom spline", () => {
    const path: Vector3[] = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 10 },
      { x: 20, y: 5, z: 20 },
      { x: 30, y: 10, z: 30 },
    ];

    const smoothed = TrajectorySmoothing.smoothPath(path, 10);

    expect(smoothed.length).toBeGreaterThan(path.length);
    expect(smoothed[0]).toEqual(path[0]);
    expect(smoothed[smoothed.length - 1]).toEqual(path[path.length - 1]);
  });

  it("should maintain start and end points", () => {
    const path: Vector3[] = [
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 5, z: 5 },
    ];

    const smoothed = TrajectorySmoothing.smoothPath(path, 5);

    expect(smoothed[0]).toEqual(path[0]);
    expect(smoothed[smoothed.length - 1]).toEqual(path[path.length - 1]);
  });

  it("should handle single point path", () => {
    const path: Vector3[] = [{ x: 0, y: 0, z: 0 }];

    const smoothed = TrajectorySmoothing.smoothPath(path, 10);

    expect(smoothed).toEqual(path);
  });
});
