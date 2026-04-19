import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Crown, Users, User, Eye } from "lucide-react";
import { Button, Input } from "../components/ui";

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Đăng nhập thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <div className="app-bg flex min-h-screen items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-modal dark:border-slate-700 dark:bg-slate-900"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500 text-white shadow-green">
            <ShieldCheck size={22} />
          </div>
          <h1 className="mt-4 text-h1 text-gray-900 dark:text-slate-100">MultiMinutes AI</h1>
          <p className="mt-1 text-body text-gray-600 dark:text-slate-300">Nền tảng ghi biên bản thông minh cho doanh nghiệp</p>
        </motion.div>

        {error ? (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-body text-red-700"
          >
            {error}
          </motion.div>
        ) : null}

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <Input
            label="Tên đăng nhập"
            placeholder="admin / user / multirole"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <Input
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" className="mt-2 w-full">
            Đăng nhập
          </Button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-center text-caption text-primary-800"
        >
          <p className="mb-2 font-semibold flex items-center justify-center gap-2"><ShieldCheck size={14} /> Tài khoản demo (mật khẩu bất kỳ):</p>
          <div className="space-y-2 text-left text-xs">
            <p className="flex items-center gap-2"><Crown size={12} className="text-red-600" /> <span className="font-semibold">admin</span> - Quản trị hệ thống</p>
            <p className="flex items-center gap-2"><User size={12} className="text-blue-600" /> <span className="font-semibold">user</span> - Người dùng</p>
            <p className="flex items-center gap-2"><Users size={12} className="text-purple-600" /> <span className="font-semibold">multirole</span> - Đa vai trò</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
