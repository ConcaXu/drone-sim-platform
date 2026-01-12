import { describe, it, expect, beforeEach } from "vitest";
import { AlgorithmParser } from "./AlgorithmParser";
import type { AlgorithmConfig } from "./AlgorithmParser";

describe("AlgorithmParser", () => {
  describe("文件类型检测", () => {
    it("应该正确识别 Python 文件", () => {
      const result = AlgorithmParser["detectFileType"]("algorithm.py");
      expect(result).toBe("python");
    });

    it("应该正确识别 MATLAB 文件", () => {
      const result = AlgorithmParser["detectFileType"]("algorithm.m");
      expect(result).toBe("matlab");
    });

    it("应该对不支持的文件类型抛出错误", () => {
      expect(() => {
        AlgorithmParser["detectFileType"]("algorithm.txt");
      }).toThrow("不支持的文件类型");
    });
  });

  describe("配置验证", () => {
    let validConfig: AlgorithmConfig;

    beforeEach(() => {
      validConfig = {
        name: "测试算法",
        description: "测试描述",
        droneModel: "DJI M300",
        initialPosition: [0, 0, 0],
        initialVelocity: [0, 0, 0],
        maxAltitude: 100,
        maxSpeed: 15,
        windSpeed: [0, 0, 0],
        gravity: 9.81,
      };
    });

    it("应该验证有效的配置", () => {
      const errors = AlgorithmParser.validateConfig(validConfig);
      expect(errors).toHaveLength(0);
    });

    it("应该检测空的算法名称", () => {
      validConfig.name = "";
      const errors = AlgorithmParser.validateConfig(validConfig);
      expect(errors).toContain("算法名称不能为空");
    });

    it("应该检测无效的最大高度", () => {
      validConfig.maxAltitude = -10;
      const errors = AlgorithmParser.validateConfig(validConfig);
      expect(errors).toContain("最大高度必须大于 0");
    });

    it("应该检测无效的最大速度", () => {
      validConfig.maxSpeed = 0;
      const errors = AlgorithmParser.validateConfig(validConfig);
      expect(errors).toContain("最大速度必须大于 0");
    });

    it("应该检测无效的重力加速度", () => {
      validConfig.gravity = -5;
      const errors = AlgorithmParser.validateConfig(validConfig);
      expect(errors).toContain("重力加速度必须大于 0");
    });

    it("应该检测多个错误", () => {
      validConfig.name = "";
      validConfig.maxAltitude = 0;
      validConfig.maxSpeed = -1;
      const errors = AlgorithmParser.validateConfig(validConfig);
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe("预设配置", () => {
    it("应该返回预设配置对象", () => {
      const presets = AlgorithmParser.getPresetConfigs();
      expect(presets).toBeDefined();
      expect(typeof presets).toBe("object");
    });

    it("应该包含航点导航预设", () => {
      const presets = AlgorithmParser.getPresetConfigs();
      expect(presets.waypoint).toBeDefined();
      expect(presets.waypoint.name).toBe("航点导航");
    });

    it("应该包含螺旋上升预设", () => {
      const presets = AlgorithmParser.getPresetConfigs();
      expect(presets.spiral).toBeDefined();
      expect(presets.spiral.name).toBe("螺旋上升");
    });

    it("应该包含八字飞行预设", () => {
      const presets = AlgorithmParser.getPresetConfigs();
      expect(presets["figure8"]).toBeDefined();
      expect(presets["figure8"].name).toBe("八字飞行");
    });

    it("应该包含搜索模式预设", () => {
      const presets = AlgorithmParser.getPresetConfigs();
      expect(presets.search).toBeDefined();
      expect(presets.search.name).toBe("搜索模式");
    });

    it("所有预设配置应该是有效的", () => {
      const presets = AlgorithmParser.getPresetConfigs();
      Object.values(presets).forEach((preset) => {
        const errors = AlgorithmParser.validateConfig(preset);
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe("轨迹生成", () => {
    let config: AlgorithmConfig;

    beforeEach(() => {
      config = {
        name: "测试轨迹",
        description: "测试轨迹生成",
        droneModel: "DJI M300",
        initialPosition: [0, 0, 0],
        initialVelocity: [0, 0, 0],
        maxAltitude: 100,
        maxSpeed: 15,
        windSpeed: [0, 0, 0],
        gravity: 9.81,
      };
    });

    it("应该生成轨迹点", () => {
      const trajectory = AlgorithmParser["generateTrajectory"](config);
      expect(trajectory).toBeDefined();
      expect(trajectory.length).toBeGreaterThan(0);
    });

    it("生成的轨迹应该有正确的结构", () => {
      const trajectory = AlgorithmParser["generateTrajectory"](config);
      trajectory.forEach((point) => {
        expect(point).toHaveProperty("position");
        expect(point).toHaveProperty("timestamp");
        expect(point).toHaveProperty("velocity");
        expect(point.position).toHaveLength(3);
      });
    });

    it("轨迹点的时间戳应该递增", () => {
      const trajectory = AlgorithmParser["generateTrajectory"](config);
      for (let i = 1; i < trajectory.length; i++) {
        expect(trajectory[i].timestamp).toBeGreaterThanOrEqual(
          trajectory[i - 1].timestamp
        );
      }
    });

    it("轨迹点的速度应该不超过最大速度", () => {
      const trajectory = AlgorithmParser["generateTrajectory"](config);
      trajectory.forEach((point) => {
        expect(point.velocity).toBeLessThanOrEqual(config.maxSpeed);
      });
    });

    it("轨迹点的高度应该不超过最大高度", () => {
      const trajectory = AlgorithmParser["generateTrajectory"](config);
      trajectory.forEach((point) => {
        expect(point.position[1]).toBeLessThanOrEqual(
          config.initialPosition[1] + config.maxAltitude
        );
      });
    });
  });

  describe("Python 脚本解析", () => {
    it("应该从 Python 脚本中提取配置", () => {
      const pythonScript = `
name = 'My Algorithm'
description = 'Test algorithm'
drone_model = 'DJI M350'
max_altitude = 150
max_speed = 20
      `;

      const config = AlgorithmParser["extractPythonConfig"](pythonScript);
      expect(config.name).toBe("My Algorithm");
      expect(config.description).toBe("Test algorithm");
      expect(config.droneModel).toBe("DJI M350");
      expect(config.maxAltitude).toBe(150);
      expect(config.maxSpeed).toBe(20);
    });

    it("应该使用默认值当参数不存在时", () => {
      const pythonScript = "# Empty script";
      const config = AlgorithmParser["extractPythonConfig"](pythonScript);
      expect(config.name).toBe("Python 算法");
      expect(config.maxAltitude).toBe(120);
    });
  });

  describe("MATLAB 脚本解析", () => {
    it("应该从 MATLAB 脚本中提取配置", () => {
      const matlabScript = `
name = 'MATLAB Algorithm'
description = 'Test MATLAB algorithm'
drone_model = 'PX4 Quadrotor'
max_altitude = 200
max_speed = 25
      `;

      const config = AlgorithmParser["extractMatlabConfig"](matlabScript);
      expect(config.name).toBe("MATLAB Algorithm");
      expect(config.description).toBe("Test MATLAB algorithm");
      expect(config.droneModel).toBe("PX4 Quadrotor");
      expect(config.maxAltitude).toBe(200);
      expect(config.maxSpeed).toBe(25);
    });

    it("应该使用默认值当参数不存在时", () => {
      const matlabScript = "% Empty script";
      const config = AlgorithmParser["extractMatlabConfig"](matlabScript);
      expect(config.name).toBe("MATLAB 算法");
      expect(config.maxAltitude).toBe(120);
    });
  });
});
