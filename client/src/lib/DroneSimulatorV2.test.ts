import { describe, it, expect, beforeEach, vi } from "vitest";
import { DroneSimulatorV2, type DroneState, type TrajectoryPoint } from "./DroneSimulatorV2";

describe("DroneSimulatorV2 - Mouse Interaction", () => {
  let canvas: HTMLCanvasElement;
  let simulator: DroneSimulatorV2;

  beforeEach(() => {
    // 创建模拟的 canvas 元素
    canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);

    // 创建模拟的 WebGL 上下文
    const mockWebGLContext = {
      getParameter: vi.fn(),
      getExtension: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockWebGLContext as any);

    simulator = new DroneSimulatorV2(canvas);
  });

  it("should initialize with free view mode", () => {
    expect(simulator).toBeDefined();
  });

  it("should handle drone state updates", () => {
    const newState: Partial<DroneState> = {
      position: [10, 20, 30],
      velocity: [1, 2, 3],
      battery: 75,
      status: "flying",
    };

    simulator.setDroneState(newState);
    const state = simulator.getDroneState();

    expect(state.position).toEqual([10, 20, 30]);
    expect(state.velocity).toEqual([1, 2, 3]);
    expect(state.battery).toBe(75);
    expect(state.status).toBe("flying");
  });

  it("should manage trajectory points", () => {
    const point1: TrajectoryPoint = {
      position: [0, 0, 0],
      timestamp: 0,
      velocity: 10,
    };

    const point2: TrajectoryPoint = {
      position: [10, 10, 10],
      timestamp: 1,
      velocity: 10,
    };

    simulator.addTrajectoryPoint(point1);
    simulator.addTrajectoryPoint(point2);

    const points = simulator.getTrajectoryPoints();
    expect(points.length).toBe(2);
    expect(points[0]).toEqual(point1);
    expect(points[1]).toEqual(point2);
  });

  it("should clear trajectory", () => {
    const point: TrajectoryPoint = {
      position: [0, 0, 0],
      timestamp: 0,
      velocity: 10,
    };

    simulator.addTrajectoryPoint(point);
    expect(simulator.getTrajectoryPoints().length).toBe(1);

    simulator.clearTrajectory();
    expect(simulator.getTrajectoryPoints().length).toBe(0);
  });

  it("should switch view modes", () => {
    simulator.setViewMode("top");
    simulator.setViewMode("side");
    simulator.setViewMode("follow");
    simulator.setViewMode("isometric");
    simulator.setViewMode("free");

    // 如果没有抛出错误，则测试通过
    expect(true).toBe(true);
  });

  it("should plan path using A* algorithm", () => {
    const startPos: [number, number, number] = [-80, 5, -80];
    const endPos: [number, number, number] = [80, 30, 80];

    const path = simulator.planPath(startPos, endPos, "astar");

    expect(path.length).toBeGreaterThan(0);
    expect(path[0].x).toBe(startPos[0]);
    expect(path[0].y).toBe(startPos[1]);
    expect(path[0].z).toBe(startPos[2]);
  });

  it("should plan path using RRT algorithm", () => {
    const startPos: [number, number, number] = [-80, 5, -80];
    const endPos: [number, number, number] = [80, 30, 80];

    const path = simulator.planPath(startPos, endPos, "rrt");

    expect(path.length).toBeGreaterThan(0);
    expect(path[0].x).toBe(startPos[0]);
    expect(path[0].y).toBe(startPos[1]);
    expect(path[0].z).toBe(startPos[2]);
  });

  it("should generate trajectory from path", () => {
    const startPos: [number, number, number] = [-80, 5, -80];
    const endPos: [number, number, number] = [80, 30, 80];

    const path = simulator.planPath(startPos, endPos, "astar");
    const trajectory = simulator.generateTrajectoryFromPath(path, 15);

    expect(trajectory.length).toBeGreaterThan(0);
    expect(trajectory[0].position[0]).toBe(startPos[0]);
    expect(trajectory[0].position[1]).toBe(startPos[1]);
    expect(trajectory[0].position[2]).toBe(startPos[2]);
  });

  it("should handle trajectory with custom speed", () => {
    const startPos: [number, number, number] = [0, 0, 0];
    const endPos: [number, number, number] = [50, 0, 50];

    const path = simulator.planPath(startPos, endPos, "astar");
    const trajectory1 = simulator.generateTrajectoryFromPath(path, 10);
    const trajectory2 = simulator.generateTrajectoryFromPath(path, 20);

    // 速度越快，轨迹点数应该越少（在相同时间内）
    expect(trajectory1.length).toBeGreaterThanOrEqual(trajectory2.length);
  });

  it("should dispose resources", () => {
    expect(() => simulator.dispose()).not.toThrow();
  });
});
