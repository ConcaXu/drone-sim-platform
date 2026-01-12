import { useEffect, useRef, useState } from "react";
import { DroneSimulator, ViewMode, DroneState, TrajectoryPoint } from "@/lib/DroneSimulator";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  RotateCcw,
  Eye,
  Download,
  Zap,
  Navigation,
} from "lucide-react";

export default function Simulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulatorRef = useRef<DroneSimulator | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("free");
  const [droneState, setDroneState] = useState<DroneState>({
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    velocity: [0, 0, 0],
    battery: 100,
    status: "idle",
  });
  const [simulationTime, setSimulationTime] = useState(0);
  const [trajectoryPoints, setTrajectoryPoints] = useState<TrajectoryPoint[]>(
    []
  );

  // 初始化 3D 场景
  useEffect(() => {
    if (!canvasRef.current) return;

    simulatorRef.current = new DroneSimulator(canvasRef.current);

    // 模拟轨迹数据
    const mockTrajectory: TrajectoryPoint[] = [];
    for (let i = 0; i < 100; i++) {
      const t = i * 0.1;
      mockTrajectory.push({
        position: [
          Math.sin(t) * 30,
          Math.cos(t * 0.5) * 20 + 30,
          Math.cos(t) * 30,
        ],
        timestamp: t,
        velocity: 5,
      });
    }
    simulatorRef.current.setTrajectory(mockTrajectory);
    setTrajectoryPoints(mockTrajectory);

    return () => {
      simulatorRef.current?.dispose();
    };
  }, []);

  // 模拟无人机运动
  useEffect(() => {
    if (!isRunning || isPaused || !simulatorRef.current) return;

    const interval = setInterval(() => {
      setSimulationTime((prev) => {
        const newTime = prev + 0.016; // ~60fps
        const trajectoryIndex = Math.floor(newTime * 10) % trajectoryPoints.length;

        if (trajectoryPoints.length > 0) {
          const point = trajectoryPoints[trajectoryIndex];
          const newState: DroneState = {
            position: point.position,
            rotation: [
              Math.sin(newTime) * 0.1,
              newTime * 0.5,
              Math.cos(newTime) * 0.1,
            ],
            velocity: [point.velocity * Math.cos(newTime), 0, point.velocity * Math.sin(newTime)],
            battery: Math.max(0, 100 - (newTime / 100) * 100),
            status: "flying",
          };
          simulatorRef.current?.setDroneState(newState);
          setDroneState(newState);
        }

        return newTime;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, trajectoryPoints]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    simulatorRef.current?.setViewMode(mode);
  };

  const handleStartSimulation = () => {
    setIsRunning(true);
    setIsPaused(false);
    simulatorRef.current?.setDroneState({ status: "flying" });
  };

  const handlePauseSimulation = () => {
    setIsPaused(!isPaused);
  };

  const handleResetSimulation = () => {
    setIsRunning(false);
    setIsPaused(false);
    setSimulationTime(0);
    simulatorRef.current?.setDroneState({
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      velocity: [0, 0, 0],
      battery: 100,
      status: "idle",
    });
    setDroneState({
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      velocity: [0, 0, 0],
      battery: 100,
      status: "idle",
    });
  };

  const handleExportData = () => {
    const data = {
      trajectory: trajectoryPoints,
      duration: simulationTime,
      timestamp: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drone-simulation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-background text-foreground">
      {/* 3D 画布 */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: "block" }}
        />

        {/* 控制面板 - 左上角 */}
        <div className="absolute top-4 left-4 tech-frame p-4 max-w-xs space-y-4 border border-border">
          <h3 className="text-sm font-bold text-neon-cyan neon-glow-cyan">
            仿真控制
          </h3>

          {/* 控制按钮 */}
          <div className="flex gap-2">
            <Button
              onClick={handleStartSimulation}
              disabled={isRunning}
              size="sm"
              className="flex-1 bg-neon-pink hover:bg-neon-pink/80 text-background"
            >
              <Play className="w-4 h-4 mr-1" />
              启动
            </Button>
            <Button
              onClick={handlePauseSimulation}
              disabled={!isRunning}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Pause className="w-4 h-4 mr-1" />
              {isPaused ? "继续" : "暂停"}
            </Button>
            <Button
              onClick={handleResetSimulation}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              重置
            </Button>
          </div>

          {/* 时间轴 */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              仿真时间: {simulationTime.toFixed(2)}s
            </label>
            <Slider
              value={[simulationTime]}
              onValueChange={(value) => setSimulationTime(value[0])}
              max={trajectoryPoints.length * 0.1}
              step={0.01}
              className="w-full"
            />
          </div>

          {/* 视角切换 */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Eye className="w-3 h-3" />
              视角模式
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["free", "top", "side", "follow", "isometric"] as ViewMode[]).map(
                (mode) => (
                  <Button
                    key={mode}
                    onClick={() => handleViewModeChange(mode)}
                    size="sm"
                    variant={viewMode === mode ? "default" : "outline"}
                    className={
                      viewMode === mode
                        ? "bg-neon-cyan text-background"
                        : "text-xs"
                    }
                  >
                    {mode === "free"
                      ? "自由"
                      : mode === "top"
                      ? "俯视"
                      : mode === "side"
                      ? "侧视"
                      : mode === "follow"
                      ? "跟随"
                      : "等距"}
                  </Button>
                )
              )}
            </div>
          </div>

          {/* 导出按钮 */}
          <Button
            onClick={handleExportData}
            size="sm"
            className="w-full border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10"
            variant="outline"
          >
            <Download className="w-4 h-4 mr-1" />
            导出数据
          </Button>
        </div>

        {/* 状态面板 - 右上角 */}
        <div className="absolute top-4 right-4 tech-frame p-4 max-w-xs space-y-3 border border-border">
          <h3 className="text-sm font-bold text-neon-pink neon-glow">
            无人机状态
          </h3>

          {/* 位置信息 */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">位置 (X, Y, Z)</span>
              <span className="text-neon-cyan font-mono">
                {droneState.position[0].toFixed(1)}, {droneState.position[1].toFixed(1)},{" "}
                {droneState.position[2].toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">速度</span>
              <span className="text-neon-cyan font-mono">
                {Math.sqrt(
                  droneState.velocity[0] ** 2 +
                    droneState.velocity[1] ** 2 +
                    droneState.velocity[2] ** 2
                ).toFixed(2)}{" "}
                m/s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">姿态角 (R, P, Y)</span>
              <span className="text-neon-cyan font-mono">
                {(droneState.rotation[0] * (180 / Math.PI)).toFixed(1)}°,{" "}
                {(droneState.rotation[1] * (180 / Math.PI)).toFixed(1)}°,{" "}
                {(droneState.rotation[2] * (180 / Math.PI)).toFixed(1)}°
              </span>
            </div>
          </div>

          {/* 电池状态 */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3" />
                电池
              </span>
              <span className="text-neon-cyan font-mono">
                {droneState.battery.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-card rounded border border-border overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-neon-pink to-neon-cyan transition-all"
                style={{ width: `${droneState.battery}%` }}
              />
            </div>
          </div>

          {/* 状态指示 */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">状态</span>
            <span
              className={`px-2 py-1 rounded border ${
                droneState.status === "flying"
                  ? "border-neon-cyan text-neon-cyan bg-neon-cyan/10"
                  : droneState.status === "paused"
                  ? "border-neon-pink text-neon-pink bg-neon-pink/10"
                  : "border-muted text-muted-foreground bg-muted/10"
              }`}
            >
              {droneState.status === "flying"
                ? "飞行中"
                : droneState.status === "paused"
                ? "暂停"
                : "待机"}
            </span>
          </div>
        </div>

        {/* 轨迹信息 - 左下角 */}
        <div className="absolute bottom-4 left-4 tech-frame p-4 max-w-xs space-y-2 border border-border text-xs">
          <h3 className="text-sm font-bold text-neon-cyan neon-glow-cyan">
            轨迹信息
          </h3>
          <div className="flex justify-between">
            <span className="text-muted-foreground">总点数</span>
            <span className="text-neon-cyan font-mono">
              {trajectoryPoints.length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">总距离</span>
            <span className="text-neon-cyan font-mono">
              {trajectoryPoints.length > 0
                ? (trajectoryPoints.length * 0.5).toFixed(2)
                : 0}
              m
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">预计时间</span>
            <span className="text-neon-cyan font-mono">
              {trajectoryPoints.length > 0
                ? (trajectoryPoints.length * 0.1).toFixed(1)
                : 0}
              s
            </span>
          </div>
        </div>

        {/* 键盘提示 - 右下角 */}
        <div className="absolute bottom-4 right-4 tech-frame p-4 max-w-xs space-y-2 border border-border text-xs">
          <h3 className="text-sm font-bold text-neon-pink neon-glow">
            键盘控制
          </h3>
          <div className="space-y-1 text-muted-foreground">
            <div>
              <span className="text-neon-cyan">W/A/S/D</span> - 移动相机
            </div>
            <div>
              <span className="text-neon-cyan">Space/Shift</span> - 上升/下降
            </div>
            <div>
              <span className="text-neon-cyan">自由模式</span> - 鼠标控制视角
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
