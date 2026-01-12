import { useState, useRef } from "react";
import { AlgorithmParser } from "@/lib/AlgorithmParser";
import type { AlgorithmConfig as AlgoConfig, ParsedAlgorithm } from "@/lib/AlgorithmParser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Settings, Play, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function AlgorithmConfigPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedAlgorithm, setParsedAlgorithm] = useState<ParsedAlgorithm | null>(null);
  const [config, setConfig] = useState<AlgoConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  const presets = AlgorithmParser.getPresetConfigs();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrors([]);

    try {
      const result = await AlgorithmParser.parseFile(file);
      setParsedAlgorithm(result);
      setConfig(result.config);
      setSelectedPreset("");
      toast.success(`文件解析成功！共生成 ${result.trajectory.length} 个轨迹点`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "文件解析失败";
      setErrors([message]);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetSelect = (presetKey: string) => {
    setSelectedPreset(presetKey);
    setConfig(presets[presetKey]);
    setParsedAlgorithm(null);
    setErrors([]);
  };

  const handleConfigChange = (field: keyof AlgoConfig, value: any) => {
    if (!config) return;
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    
    // 验证
    const validationErrors = AlgorithmParser.validateConfig(newConfig);
    setErrors(validationErrors);
  };

  const handleStartSimulation = () => {
    if (!config) {
      toast.error("请先上传算法文件或选择预设配置");
      return;
    }

    const validationErrors = AlgorithmParser.validateConfig(config);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error("配置验证失败，请检查参数");
      return;
    }

    // 保存配置到 localStorage 并导航到仿真页面
    localStorage.setItem("droneConfig", JSON.stringify(config));
    if (parsedAlgorithm) {
      localStorage.setItem("trajectory", JSON.stringify(parsedAlgorithm.trajectory));
    }
    window.location.href = "/simulator";
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="space-y-2 mb-8">
          <h1 className="text-4xl font-bold neon-glow">算法配置</h1>
          <p className="text-muted-foreground">
            上传您的飞行算法或选择预设配置来开始仿真
          </p>
        </div>

        {/* 文件上传区域 */}
        <Card className="tech-frame border-border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-neon-cyan" />
              上传算法文件
            </CardTitle>
            <CardDescription>
              支持 Python (.py) 和 MATLAB (.m) 脚本文件
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-neon-cyan transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".py,.m"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-foreground font-medium mb-2">
                点击选择文件或拖拽上传
              </p>
              <p className="text-sm text-muted-foreground">
                支持 Python 和 MATLAB 脚本
              </p>
            </div>

            {parsedAlgorithm && (
              <div className="mt-4 p-4 bg-neon-cyan/10 border border-neon-cyan rounded space-y-2">
                <div className="flex items-center gap-2 text-neon-cyan">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">文件已成功解析</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  文件: {parsedAlgorithm.metadata.fileName}
                </p>
                <p className="text-sm text-muted-foreground">
                  轨迹点数: {parsedAlgorithm.trajectory.length}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 预设配置 */}
        <Card className="tech-frame border-border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-neon-pink" />
              预设配置
            </CardTitle>
            <CardDescription>
              选择一个预设配置快速开始
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(presets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handlePresetSelect(key)}
                  className={`p-4 rounded border text-left transition-all ${
                    selectedPreset === key
                      ? "border-neon-cyan bg-neon-cyan/10 neon-border-cyan"
                      : "border-border hover:border-neon-pink"
                  }`}
                >
                  <h3 className="font-bold text-foreground mb-1">
                    {preset.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 配置编辑 */}
        {config && (
          <Card className="tech-frame border-border mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-neon-cyan" />
                仿真参数
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    算法名称
                  </label>
                  <Input
                    value={config.name}
                    onChange={(e) => handleConfigChange("name", e.target.value)}
                    className="bg-card border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    无人机型号
                  </label>
                  <Select
                    value={config.droneModel}
                    onValueChange={(value) =>
                      handleConfigChange("droneModel", value)
                    }
                  >
                    <SelectTrigger className="bg-card border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DJI M300">DJI M300</SelectItem>
                      <SelectItem value="DJI M350">DJI M350</SelectItem>
                      <SelectItem value="PX4 Quadrotor">PX4 Quadrotor</SelectItem>
                      <SelectItem value="Custom">自定义</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 描述 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  描述
                </label>
                <Textarea
                  value={config.description}
                  onChange={(e) =>
                    handleConfigChange("description", e.target.value)
                  }
                  className="bg-card border-border text-foreground"
                  rows={3}
                />
              </div>

              {/* 性能参数 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    最大高度 (m)
                  </label>
                  <Input
                    type="number"
                    value={config.maxAltitude}
                    onChange={(e) =>
                      handleConfigChange("maxAltitude", parseFloat(e.target.value))
                    }
                    className="bg-card border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    最大速度 (m/s)
                  </label>
                  <Input
                    type="number"
                    value={config.maxSpeed}
                    onChange={(e) =>
                      handleConfigChange("maxSpeed", parseFloat(e.target.value))
                    }
                    className="bg-card border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    重力加速度 (m/s²)
                  </label>
                  <Input
                    type="number"
                    value={config.gravity}
                    onChange={(e) =>
                      handleConfigChange("gravity", parseFloat(e.target.value))
                    }
                    className="bg-card border-border text-foreground"
                  />
                </div>
              </div>

              {/* 初始条件 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    初始位置 (X, Y, Z)
                  </label>
                  <div className="flex gap-2">
                    {(["0", "1", "2"] as const).map((idx) => (
                      <Input
                        key={idx}
                        type="number"
                        value={config.initialPosition[parseInt(idx)]}
                        onChange={(e) => {
                          const newPos = [...config.initialPosition] as [number, number, number];
                          newPos[parseInt(idx)] = parseFloat(e.target.value);
                          handleConfigChange("initialPosition", newPos);
                        }}
                        placeholder={idx}
                        className="bg-card border-border text-foreground flex-1"
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    风速 (X, Y, Z) m/s
                  </label>
                  <div className="flex gap-2">
                    {(["0", "1", "2"] as const).map((idx) => (
                      <Input
                        key={idx}
                        type="number"
                        value={config.windSpeed[parseInt(idx)]}
                        onChange={(e) => {
                          const newWind = [...config.windSpeed] as [number, number, number];
                          newWind[parseInt(idx)] = parseFloat(e.target.value);
                          handleConfigChange("windSpeed", newWind);
                        }}
                        placeholder={idx}
                        className="bg-card border-border text-foreground flex-1"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 错误提示 */}
              {errors.length > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500 rounded space-y-2">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">配置错误</span>
                  </div>
                  <ul className="text-sm text-red-400 space-y-1">
                    {errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 启动按钮 */}
              <Button
                onClick={handleStartSimulation}
                disabled={errors.length > 0 || isLoading}
                size="lg"
                className="w-full bg-neon-pink hover:bg-neon-pink/80 text-background font-bold neon-border"
              >
                <Play className="w-5 h-5 mr-2" />
                开始仿真
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
