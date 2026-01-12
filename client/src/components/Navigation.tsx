import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Zap, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navigation() {
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "仿真", href: "/" },
    { label: "文档", href: "#docs" },
    { label: "关于", href: "#about" },
  ];

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/">
          <a className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
            <div className="relative">
              <Zap className="w-6 h-6 text-neon-pink neon-glow" />
              <div className="absolute inset-0 animate-pulse">
                <Zap className="w-6 h-6 text-neon-pink opacity-50" />
              </div>
            </div>
            <span className="text-lg font-bold neon-glow hidden sm:inline">
              DRONE SIM
            </span>
          </a>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a className="text-sm font-medium text-foreground hover:text-neon-cyan transition-colors relative group">
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-neon-cyan group-hover:w-full transition-all duration-300" />
              </a>
            </Link>
          ))}
        </div>

        {/* Auth Section */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.name || "用户"}
              </span>
              <Button
                onClick={() => logout()}
                variant="outline"
                size="sm"
                className="border-neon-pink text-neon-pink hover:bg-neon-pink/10"
              >
                登出
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              size="sm"
              className="bg-neon-pink hover:bg-neon-pink/80 text-background font-bold neon-border"
            >
              登录
            </Button>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-card rounded transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-neon-cyan" />
            ) : (
              <Menu className="w-5 h-5 text-neon-cyan" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card/80 backdrop-blur-sm">
          <div className="container py-4 space-y-3">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a
                  className="block px-4 py-2 text-sm font-medium text-foreground hover:text-neon-cyan hover:bg-card rounded transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
