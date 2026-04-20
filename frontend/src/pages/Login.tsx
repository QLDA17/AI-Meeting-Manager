import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Crown, User, ChevronDown, Check, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Logo } from '../components/ui';

const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const leftFeatures = [
  'Phiên âm tự động với độ chính xác 99%+',
  'Tổng hợp biên bản thông minh bằng AI',
  'Cộng tác nhóm và phân công công việc',
];

const testimonials = [
  {
    text: "MultiMinutes AI tiết kiệm cho team chúng tôi hơn 10 giờ mỗi tuần. Thật sự kinh ngạc!",
    author: "Nguyễn Văn An",
    role: "CTO · TechViet Solutions"
  },
  {
    text: "Công nghệ STT và Diarization chính xác nhất mà tôi từng trải nghiệm trên thị trường.",
    author: "Trần Minh Tâm",
    role: "Product Manager · Vingroup"
  },
  {
    text: "Giao diện hiện đại, dễ sử dụng và tính năng bảo mật tuyệt đối khiến tôi hoàn toàn yên tâm.",
    author: "Lê Thị Hồng",
    role: "COO · StartupHub"
  }
];

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeTestimonial, setActiveTestimonial] = React.useState(0);

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setApiError('');
    try {
      await login(data.username, data.password);
      navigate('/dashboard');
    } catch {
      setApiError('Đăng nhập thất bại. Vui lòng thử lại.');
      setFocus('username');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 relative overflow-hidden px-4 selection:bg-primary-500/30">
      {/* Dynamic Background Decor */}
      <div className="absolute inset-0 dot-grid opacity-[0.15] pointer-events-none" />
      
      {/* Static Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-5%] right-[5%] w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-16 items-center relative z-10">
        {/* Left Content - Desktop */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:block space-y-12"
        >
          <div className="flex items-center gap-3">
            <Logo variant="dark" className="scale-125 origin-left" />
          </div>

          <div className="space-y-8">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-6xl font-black text-white leading-[1.1] tracking-tighter"
            >
              Nâng tầm <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-green-300 to-primary-500 animate-gradient-x">
                cuộc họp AI.
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-slate-400 text-xl leading-relaxed max-w-md font-medium"
            >
              Hệ thống ghi biên bản và phân tích dữ liệu cuộc họp hàng đầu, giúp doanh nghiệp bứt phá hiệu suất.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="space-y-6"
          >
            <p className="text-xs font-bold text-primary-500 uppercase tracking-[0.3em]">Tại sao chọn chúng tôi?</p>
            <ul className="grid grid-cols-1 gap-4">
              {leftFeatures.map((item, i) => (
                <li key={i} className="flex items-center gap-4 group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover:bg-primary-500/20 group-hover:border-primary-500/30 transition-all duration-300">
                    <Check size={14} className="text-primary-400" />
                  </div>
                  <span className="text-slate-300 font-semibold group-hover:text-white transition-colors">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Animated Testimonial Slider */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="relative h-32 max-w-md"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex flex-col justify-center p-6 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-sm"
              >
                <p className="text-slate-300 italic mb-4">"{testimonials[activeTestimonial].text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-green-500 flex items-center justify-center text-white text-[10px] font-black">
                    {testimonials[activeTestimonial].author[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{testimonials[activeTestimonial].author}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{testimonials[activeTestimonial].role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Right Content - Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative group/card"
        >
          <div className="bg-white/[0.03] border border-white/10 backdrop-blur-3xl p-8 sm:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            {/* Subtle Gradient Shine */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-3 mb-10">
              <Logo variant="dark" />
            </div>

            <div className="mb-10">
              <h2 className="text-4xl font-black text-white tracking-tight mb-3">Đăng nhập</h2>
              <p className="text-slate-400 font-medium">Truy cập vào hệ thống điều hành cuộc họp AI.</p>
            </div>

            {apiError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold flex items-center gap-3"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {apiError}
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Tên đăng nhập</label>
                <div className="relative group/input">
                  <Input
                    placeholder="Nhập tên đăng nhập"
                    autoComplete="username"
                    error={errors.username?.message}
                    disabled={isLoading}
                    leftIcon={<User size={18} className="text-slate-500 group-focus-within/input:text-primary-400 transition-colors" />}
                    className="bg-white/[0.03] border-white/10 text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05] h-12 rounded-xl transition-all"
                    {...register('username')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Mật khẩu</label>
                  <Link
                    to="/forgot-password"
                    className="text-[10px] text-primary-500 hover:text-primary-400 font-black uppercase tracking-wider transition-colors"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative group/input">
                  <Input
                    type="password"
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                    error={errors.password?.message}
                    disabled={isLoading}
                    leftIcon={<Lock size={18} className="text-slate-500 group-focus-within/input:text-primary-400 transition-colors" />}
                    className="bg-white/[0.03] border-white/10 text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05] h-12 rounded-xl transition-all"
                    {...register('password')}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-black text-lg shadow-xl shadow-primary-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
                loading={isLoading}
              >
                Đăng nhập ngay
                <ArrowRight size={22} className="ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>

            <div className="mt-10 pt-8 border-t border-white/5 text-center">
              <p className="text-slate-500 text-sm font-medium">
                Chưa có tài khoản?{' '}
                <Link
                  to="/register"
                  className="text-white hover:text-primary-400 font-bold transition-colors ml-1 underline underline-offset-4 decoration-primary-500/30"
                >
                  Đăng ký miễn phí
                </Link>
              </p>
            </div>

            {/* Demo Accounts */}
            <details className="mt-8 group/demo">
              <summary className="flex items-center justify-center gap-2 cursor-pointer text-[10px] font-black text-slate-600 hover:text-slate-400 uppercase tracking-[0.2em] transition-colors list-none">
                <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center">
                  <ChevronDown size={10} className="group-open/demo:rotate-180 transition-transform" />
                </div>
                Tài khoản dùng thử
              </summary>
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="mt-6 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 grid grid-cols-2 gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-primary-400">
                    <Crown size={12} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Admin</span>
                  </div>
                  <p className="text-sm font-bold text-white">admin</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-blue-400">
                    <User size={12} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Member</span>
                  </div>
                  <p className="text-sm font-bold text-white">user</p>
                </div>
              </motion.div>
            </details>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
