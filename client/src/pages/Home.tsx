import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  Zap,
  Box,
  TrendingUp,
  Cpu,
  Radio,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Three.js 背景场景
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0a0e27, 0);
    camera.position.z = 5;

    // 创建几何体
    const geometry = new THREE.IcosahedronGeometry(2, 4);
    const material = new THREE.MeshPhongMaterial({
      color: 0xff007f,
      emissive: 0xff007f,
      wireframe: true,
      emissiveIntensity: 0.5,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 添加灯光
    const light = new THREE.PointLight(0x00ffff, 1, 100);
    light.position.set(5, 5, 5);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x00ffff, 0.3);
    scene.add(ambientLight);

    // 动画循环
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      mesh.rotation.x += 0.001;
      mesh.rotation.y += 0.002;
      renderer.render(scene, camera);
    };
    animate();

    // 处理窗口大小变化
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
    };
  }, []);

  const features = [
    {
      icon: Box,
      title: "3D 可视化",
      description: "实时渲染无人机飞行轨迹和环境场景",
    },
    {
      icon: Cpu,
      title: "算法测试",
      description: "上传 Python/MATLAB 脚本进行飞行路径模拟",
    },
    {
      icon: Radio,
      title: "仿真控制",
      description: "启动、暂停、停止仿真，调节参数",
    },
    {
      icon: TrendingUp,
      title: "实时数据",
      description: "监测位置、速度、姿态、电池等传感器数据",
    },
    {
      icon: BarChart3,
      title: "数据导出",
      description: "支持 CSV/JSON 格式下载仿真结果",
    },
    {
      icon: Zap,
      title: "AI 助手",
      description: "智能调试代码，优化飞行路径",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 背景 Three.js 画布 */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full -z-10 opacity-20"
      />

      {/* 渐变背景 */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-transparent via-background to-background pointer-events-none" />

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* 标题 */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold neon-glow">
              DRONE SIM
            </h1>
            <p className="text-xl md:text-2xl text-neon-cyan neon-glow-cyan">
              无人机飞行算法仿真平台
            </p>
          </div>

          {/* 副标题 */}
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            采用赛博朋克美学设计，集成 Gazebo、ROS 和 PX4
            仿真引擎，为您提供专业的无人机算法测试和可视化解决方案。
          </p>

          {/* CTA 按钮 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {isAuthenticated ? (
              <Button
                onClick={() => (window.location.href = "/simulator-v2")}
                size="lg"
                className="bg-neon-pink hover:bg-neon-pink/80 text-background font-bold text-lg px-8 neon-border group"
              >
                进入完整仿真
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                size="lg"
                className="bg-neon-pink hover:bg-neon-pink/80 text-background font-bold text-lg px-8 neon-border group"
              >
                开始使用
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className="border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 font-bold text-lg px-8"
            >
              查看文档
            </Button>
          </div>
        </div>
      </section>

      {/* 功能展示 Section */}
      <section className="relative container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 neon-glow">
            核心功能
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 完整仿真卡片 */}
            <Link
              href="/simulator-v2"
              className="tech-frame p-6 hover:border-neon-pink border border-neon-pink/30 transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded border border-neon-pink text-neon-pink group-hover:bg-neon-pink/10 transition-colors">
                    <Box className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neon-pink mb-2">
                    完整仿真
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    真实 3D 环境 + A*/RRT 避障
                  </p>
                </div>
              </div>
            </Link>

            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="tech-frame p-6 hover:border-neon-cyan border border-neon-cyan/30 transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 rounded border border-neon-cyan text-neon-cyan group-hover:bg-neon-cyan/10 transition-colors">
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-neon-cyan mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 技术栈 Section */}
      <section className="relative container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 neon-glow">
            技术栈
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { name: "Gazebo", icon: "🏗️" },
              { name: "ROS", icon: "🤖" },
              { name: "PX4", icon: "✈️" },
              { name: "Three.js", icon: "🎨" },
              { name: "React 19", icon: "⚛️" },
              { name: "TypeScript", icon: "📘" },
              { name: "Tailwind", icon: "🎨" },
              { name: "tRPC", icon: "🔗" },
            ].map((tech, index) => (
              <div
                key={index}
                className="tech-frame p-4 border border-neon-cyan/20 hover:border-neon-cyan transition-all"
              >
                <div className="text-3xl mb-2">{tech.icon}</div>
                <p className="text-sm font-semibold text-neon-cyan">
                  {tech.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
