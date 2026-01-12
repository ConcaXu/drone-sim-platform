import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DroneSimulator, DroneState, TrajectoryPoint } from "./DroneSimulator";

describe("DroneSimulator", () => {
  let canvas: HTMLCanvasElement;
  let simulator: DroneSimulator;

  beforeEach(() => {
    // 创建模拟 canvas 元素
    canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);

    simulator = new DroneSimulator(canvas);
  });

  afterEach(() => {
    simulator.dispose();
    document.body.removeChild(canvas);
  });

  describe("初始化", () => {
    it("应该创建一个有效的 DroneSimulator 实例", () => {
      expect(simulator).toBeDefined();
      const state = simulator.getDroneState();
      expect(state.position).toEqual([0, 0, 0]);
      expect(state.battery).toBe(100);
      expect(state.status).toBe("idle");
    });

    it("应该初始化空的轨迹点数组", () => {
      const points = simulator.getTrajectoryPoints();
      expect(points).toEqual([]);
    });
  });

  describe("无人机状态管理", () => {
    it("应该能够设置无人机状态", () => {
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

    it("应该保持未指定的状态属性不变", () => {
      simulator.setDroneState({ position: [5, 5, 5] });
      let state = simulator.getDroneState();
      expect(state.battery).toBe(100);

      simulator.setDroneState({ battery: 50 });
      state = simulator.getDroneState();
      expect(state.position).toEqual([5, 5, 5]);
      expect(state.battery).toBe(50);
    });
  });

  describe("轨迹管理", () => {
    it("应该能够添加单个轨迹点", () => {
      const point: TrajectoryPoint = {
        position: [1, 2, 3],
        timestamp: 0.1,
        velocity: 5,
      };

      simulator.addTrajectoryPoint(point);
      const points = simulator.getTrajectoryPoints();

      expect(points).toHaveLength(1);
      expect(points[0]).toEqual(point);
    });

    it("应该能够设置完整的轨迹", () => {
      const trajectory: TrajectoryPoint[] = [
        { position: [0, 0, 0], timestamp: 0, velocity: 0 },
        { position: [1, 1, 1], timestamp: 0.1, velocity: 5 },
        { position: [2, 2, 2], timestamp: 0.2, velocity: 5 },
      ];

      simulator.setTrajectory(trajectory);
      const points = simulator.getTrajectoryPoints();

      expect(points).toHaveLength(3);
      expect(points).toEqual(trajectory);
    });

    it("应该能够清除轨迹", () => {
      const trajectory: TrajectoryPoint[] = [
        { position: [0, 0, 0], timestamp: 0, velocity: 0 },
        { position: [1, 1, 1], timestamp: 0.1, velocity: 5 },
      ];

      simulator.setTrajectory(trajectory);
      expect(simulator.getTrajectoryPoints()).toHaveLength(2);

      simulator.clearTrajectory();
      expect(simulator.getTrajectoryPoints()).toHaveLength(0);
    });
  });

  describe("视角模式", () => {
    it("应该能够切换视角模式", () => {
      const modes = ["free", "top", "side", "follow", "isometric"] as const;

      modes.forEach((mode) => {
        simulator.setViewMode(mode);
        // 验证没有抛出错误
        expect(simulator).toBeDefined();
      });
    });
  });

  describe("复杂场景", () => {
    it("应该能够处理完整的仿真流程", () => {
      // 1. 设置轨迹
      const trajectory: TrajectoryPoint[] = [];
      for (let i = 0; i < 10; i++) {
        trajectory.push({
          position: [i * 10, Math.sin(i) * 10, i * 5],
          timestamp: i * 0.1,
          velocity: 5,
        });
      }
      simulator.setTrajectory(trajectory);

      // 2. 验证轨迹已设置
      expect(simulator.getTrajectoryPoints()).toHaveLength(10);

      // 3. 更新无人机状态
      simulator.setDroneState({
        position: trajectory[0].position,
        status: "flying",
      });

      // 4. 验证状态
      let state = simulator.getDroneState();
      expect(state.status).toBe("flying");
      expect(state.position).toEqual(trajectory[0].position);

      // 5. 切换视角
      simulator.setViewMode("follow");

      // 6. 清除轨迹
      simulator.clearTrajectory();
      expect(simulator.getTrajectoryPoints()).toHaveLength(0);
    });

    it("应该能够处理多次轨迹更新", () => {
      const trajectory1: TrajectoryPoint[] = [
        { position: [0, 0, 0], timestamp: 0, velocity: 0 },
        { position: [1, 1, 1], timestamp: 0.1, velocity: 5 },
      ];

      simulator.setTrajectory(trajectory1);
      expect(simulator.getTrajectoryPoints()).toHaveLength(2);

      const trajectory2: TrajectoryPoint[] = [
        { position: [0, 0, 0], timestamp: 0, velocity: 0 },
        { position: [2, 2, 2], timestamp: 0.1, velocity: 5 },
        { position: [4, 4, 4], timestamp: 0.2, velocity: 5 },
      ];

      simulator.setTrajectory(trajectory2);
      expect(simulator.getTrajectoryPoints()).toHaveLength(3);
      expect(simulator.getTrajectoryPoints()[1].position).toEqual([2, 2, 2]);
    });
  });
});
