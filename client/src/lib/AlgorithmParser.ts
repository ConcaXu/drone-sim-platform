import { TrajectoryPoint } from "./DroneSimulator";

export interface AlgorithmConfig {
  name: string;
  description: string;
  droneModel: string;
  initialPosition: [number, number, number];
  initialVelocity: [number, number, number];
  maxAltitude: number;
  maxSpeed: number;
  windSpeed: [number, number, number];
  gravity: number;
}

export interface ParsedAlgorithm {
  config: AlgorithmConfig;
  trajectory: TrajectoryPoint[];
  metadata: {
    fileType: "python" | "matlab";
    fileName: string;
    uploadTime: Date;
    fileSize: number;
  };
}

export class AlgorithmParser {
  /**
   * 解析上传的算法文件
   */
  static async parseFile(file: File): Promise<ParsedAlgorithm> {
    const fileType = this.detectFileType(file.name);
    const content = await this.readFile(file);

    if (fileType === "python") {
      return this.parsePythonScript(content, file);
    } else {
      return this.parseMatlabScript(content, file);
    }
  }

  /**
   * 检测文件类型
   */
  private static detectFileType(
    fileName: string
  ): "python" | "matlab" {
    if (fileName.endsWith(".py")) {
      return "python";
    } else if (fileName.endsWith(".m")) {
      return "matlab";
    }
    throw new Error("不支持的文件类型，请上传 .py 或 .m 文件");
  }

  /**
   * 读取文件内容
   */
  private static readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => {
        reject(new Error("文件读取失败"));
      };
      reader.readAsText(file);
    });
  }

  /**
   * 解析 Python 脚本
   */
  private static parsePythonScript(
    content: string,
    file: File
  ): ParsedAlgorithm {
    // 提取配置参数
    const config = this.extractPythonConfig(content);

    // 生成模拟轨迹（实际应用中应执行 Python 代码）
    const trajectory = this.generateTrajectory(config);

    return {
      config,
      trajectory,
      metadata: {
        fileType: "python",
        fileName: file.name,
        uploadTime: new Date(),
        fileSize: file.size,
      },
    };
  }

  /**
   * 解析 MATLAB 脚本
   */
  private static parseMatlabScript(
    content: string,
    file: File
  ): ParsedAlgorithm {
    // 提取配置参数
    const config = this.extractMatlabConfig(content);

    // 生成模拟轨迹（实际应用中应执行 MATLAB 代码）
    const trajectory = this.generateTrajectory(config);

    return {
      config,
      trajectory,
      metadata: {
        fileType: "matlab",
        fileName: file.name,
        uploadTime: new Date(),
        fileSize: file.size,
      },
    };
  }

  /**
   * 从 Python 脚本中提取配置
   */
  private static extractPythonConfig(content: string): AlgorithmConfig {
    // 默认配置
    const defaultConfig: AlgorithmConfig = {
      name: "Python 算法",
      description: "从 Python 脚本生成的飞行轨迹",
      droneModel: "DJI M300",
      initialPosition: [0, 0, 0],
      initialVelocity: [0, 0, 0],
      maxAltitude: 120,
      maxSpeed: 20,
      windSpeed: [0, 0, 0],
      gravity: 9.81,
    };

    // 尝试从脚本中提取参数
    const nameMatch = content.match(/name\s*=\s*['"](.*?)['"]/);
    if (nameMatch) defaultConfig.name = nameMatch[1];

    const descMatch = content.match(/description\s*=\s*['"](.*?)['"]/);
    if (descMatch) defaultConfig.description = descMatch[1];

    const droneMatch = content.match(/drone_model\s*=\s*['"](.*?)['"]/);
    if (droneMatch) defaultConfig.droneModel = droneMatch[1];

    const altMatch = content.match(/max_altitude\s*=\s*(\d+)/);
    if (altMatch) defaultConfig.maxAltitude = parseInt(altMatch[1]);

    const speedMatch = content.match(/max_speed\s*=\s*([\d.]+)/);
    if (speedMatch) defaultConfig.maxSpeed = parseFloat(speedMatch[1]);

    return defaultConfig;
  }

  /**
   * 从 MATLAB 脚本中提取配置
   */
  private static extractMatlabConfig(content: string): AlgorithmConfig {
    // 默认配置
    const defaultConfig: AlgorithmConfig = {
      name: "MATLAB 算法",
      description: "从 MATLAB 脚本生成的飞行轨迹",
      droneModel: "DJI M300",
      initialPosition: [0, 0, 0],
      initialVelocity: [0, 0, 0],
      maxAltitude: 120,
      maxSpeed: 20,
      windSpeed: [0, 0, 0],
      gravity: 9.81,
    };

    // 尝试从脚本中提取参数
    const nameMatch = content.match(/name\s*=\s*['"](.*?)['"]/);
    if (nameMatch) defaultConfig.name = nameMatch[1];

    const descMatch = content.match(/description\s*=\s*['"](.*?)['"]/);
    if (descMatch) defaultConfig.description = descMatch[1];

    const droneMatch = content.match(/drone_model\s*=\s*['"](.*?)['"]/);
    if (droneMatch) defaultConfig.droneModel = droneMatch[1];

    const altMatch = content.match(/max_altitude\s*=\s*(\d+)/);
    if (altMatch) defaultConfig.maxAltitude = parseInt(altMatch[1]);

    const speedMatch = content.match(/max_speed\s*=\s*([\d.]+)/);
    if (speedMatch) defaultConfig.maxSpeed = parseFloat(speedMatch[1]);

    return defaultConfig;
  }

  /**
   * 生成模拟轨迹
   */
  private static generateTrajectory(
    config: AlgorithmConfig
  ): TrajectoryPoint[] {
    const trajectory: TrajectoryPoint[] = [];
    const duration = 50; // 50 秒
    const points = 500;

    for (let i = 0; i < points; i++) {
      const t = (i / points) * duration;
      const progress = i / points;

      // 生成复杂的 3D 轨迹（螺旋上升 + 水平运动）
      const radius = 30 * (1 - Math.abs(progress - 0.5) * 2);
      const height = config.initialPosition[1] + Math.sin(progress * Math.PI) * 40;
      const angle = progress * Math.PI * 4;

      const x = config.initialPosition[0] + Math.cos(angle) * radius;
      const y = Math.max(0, height);
      const z = config.initialPosition[2] + Math.sin(angle) * radius;

      // 计算速度（相邻两点间的距离）
      let velocity = config.maxSpeed * (0.5 + 0.5 * Math.sin(progress * Math.PI));
      velocity = Math.min(velocity, config.maxSpeed);

      trajectory.push({
        position: [x, y, z],
        timestamp: t,
        velocity,
      });
    }

    return trajectory;
  }

  /**
   * 验证配置
   */
  static validateConfig(config: AlgorithmConfig): string[] {
    const errors: string[] = [];

    if (!config.name || config.name.trim() === "") {
      errors.push("算法名称不能为空");
    }

    if (config.maxAltitude <= 0) {
      errors.push("最大高度必须大于 0");
    }

    if (config.maxSpeed <= 0) {
      errors.push("最大速度必须大于 0");
    }

    if (config.gravity <= 0) {
      errors.push("重力加速度必须大于 0");
    }

    return errors;
  }

  /**
   * 创建预设配置
   */
  static getPresetConfigs(): Record<string, AlgorithmConfig> {
    return {
      waypoint: {
        name: "航点导航",
        description: "无人机按照预定航点进行飞行",
        droneModel: "DJI M300",
        initialPosition: [0, 0, 0],
        initialVelocity: [0, 0, 0],
        maxAltitude: 120,
        maxSpeed: 15,
        windSpeed: [0, 0, 0],
        gravity: 9.81,
      },
      spiral: {
        name: "螺旋上升",
        description: "无人机以螺旋形轨迹上升",
        droneModel: "DJI M300",
        initialPosition: [0, 0, 0],
        initialVelocity: [0, 0, 0],
        maxAltitude: 100,
        maxSpeed: 10,
        windSpeed: [0, 0, 0],
        gravity: 9.81,
      },
      figure8: {
        name: "八字飞行",
        description: "无人机按照八字形轨迹飞行",
        droneModel: "DJI M300",
        initialPosition: [0, 0, 0],
        initialVelocity: [0, 0, 0],
        maxAltitude: 80,
        maxSpeed: 12,
        windSpeed: [0, 0, 0],
        gravity: 9.81,
      },
      search: {
        name: "搜索模式",
        description: "无人机进行网格搜索飞行",
        droneModel: "DJI M300",
        initialPosition: [0, 0, 0],
        initialVelocity: [0, 0, 0],
        maxAltitude: 60,
        maxSpeed: 8,
        windSpeed: [0, 0, 0],
        gravity: 9.81,
      },
    };
  }
}
