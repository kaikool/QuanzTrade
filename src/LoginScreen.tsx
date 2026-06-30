import React, { useState } from "react";
import { CloudLightning, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LoginScreenProps {
  onLoginSuccess: (token: string) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        setError(`Lỗi PWA: HTTP ${res.status} ${res.statusText} - ${text.substring(0, 100)}...`);
        return;
      }

      const data = await res.json();
      if (data.success && data.token) {
        onLoginSuccess(data.token);
      } else {
        setError(data.message || "Đăng nhập thất bại");
      }
    } catch (err: any) {
      setError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ios26-auth-screen flex items-center justify-center p-4">

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="ios26-auth-card p-8 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 20 }}
            className="ios26-auth-icon w-20 h-20 text-[var(--ios-blue)] flex items-center justify-center rounded-[24px] mb-6"
          >
            <CloudLightning size={42} strokeWidth={1.7} />
          </motion.div>
          
          <h1 className="ios26-brand-wordmark text-3xl font-black text-[var(--ios-label)] mb-2">Táo Tầu Journal</h1>
          <p className="text-[var(--ios-secondary-label)] text-base mb-8 text-center">
            Sử dụng mật khẩu để truy cập không gian làm việc của bạn.
          </p>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật mã"
                  className="w-full bg-[var(--ios-surface-2)] text-[var(--ios-label)] border border-[var(--ios-separator)] rounded-2xl py-3.5 px-4 text-center text-lg focus:outline-none focus:border-[var(--ios-blue)] transition-colors placeholder:text-[var(--ios-secondary-label)]"
                  autoFocus
                />
              </div>
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-[var(--ios-red)] text-base mt-3 text-center"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              type="submit"
              disabled={!password || loading}
              className="ios26-primary-button w-full text-white font-semibold text-lg py-3.5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                "Tiếp tục"
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}


