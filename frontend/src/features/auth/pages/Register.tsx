import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import { Button, Input, Logo } from '@/shared/ui';
import api from '@/shared/lib/api';

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'Vui lòng nhập họ'),
    lastName: z.string().min(1, 'Vui lòng nhập tên'),
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Vui lòng đồng ý điều khoản sử dụng' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const featureHighlights = [
  'Phiên âm tự động với AI',
  'Tổng hợp biên bản thông minh',
  'Cộng tác nhóm dễ dàng',
  'Bảo mật cấp doanh nghiệp',
];

const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
  if (!password) return { level: 0, label: '', color: '' };
  if (password.length < 6) return { level: 1, label: 'Yếu', color: 'bg-red-500' };
  if (password.length < 10) return { level: 2, label: 'Trung bình', color: 'bg-amber-500' };
  return { level: 3, label: 'Mạnh', color: 'bg-primary-500' };
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [apiError, setApiError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [passwordValue, setPasswordValue] = React.useState('');

  const {
    register,
    handleSubmit,
    setFocus,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Watch password for strength indicator
  const watchedPassword = watch('password', '');
  React.useEffect(() => {
    setPasswordValue(watchedPassword || '');
  }, [watchedPassword]);

  const passwordStrength = getPasswordStrength(passwordValue);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setApiError('');
    try {
      // Match BE contract: {username, password, email, full_name}
      await api.post('/api/auth/register', {
        username: data.email, // Use email as username
        email: data.email,
        password: data.password,
        full_name: `${data.firstName} ${data.lastName}`.trim(),
      });
      setSuccess(true);
      // TODO Phase 2: After register returns token, redirect to /onboarding instead
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setApiError('Email đã được sử dụng. Vui lòng dùng email khác.');
        setFocus('email');
      } else {
        setApiError('Đăng ký thất bại. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 relative overflow-hidden py-12 px-4 selection:bg-primary-500/30">
      {/* Dynamic Background Decor */}
      <div className="absolute inset-0 dot-grid opacity-[0.15] pointer-events-none" />
      
      {/* Static Glow Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-5%] left-[5%] w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />

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
              Tham gia <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-green-300 to-primary-500 animate-gradient-x">
                kỷ nguyên mới.
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-slate-400 text-xl leading-relaxed max-w-md font-medium"
            >
              Bắt đầu 14 ngày dùng thử miễn phí. Không cần thẻ tín dụng, không rủi ro.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {featureHighlights.map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + (i * 0.1) }}
                className="flex items-center gap-4 group p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                  <Check size={18} className="text-primary-400" />
                </div>
                <span className="text-slate-200 font-bold group-hover:text-white transition-colors text-lg">{item}</span>
              </motion.div>
            ))}
          </div>
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
              <h2 className="text-4xl font-black text-white tracking-tight mb-3">Đăng ký</h2>
              <p className="text-slate-400 font-medium">Khám phá sức mạnh của AI ngay hôm nay.</p>
            </div>

            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 p-8 rounded-3xl bg-primary-500/10 border border-primary-500/20 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-6">
                  <Check size={32} className="text-primary-400" />
                </div>
                <h3 className="text-white text-xl font-black mb-2">Đăng ký thành công!</h3>
                <p className="text-slate-400 font-medium">Đang chuyển hướng đến trang đăng nhập...</p>
              </motion.div>
            )}

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

            {!success && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Họ</label>
                    <Input
                      placeholder="Họ"
                      error={errors.firstName?.message}
                      disabled={isLoading}
                      className="bg-white/[0.03] border-white/10 text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05] h-12 rounded-xl transition-all"
                      {...register('firstName')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tên</label>
                    <Input
                      placeholder="Tên"
                      error={errors.lastName?.message}
                      disabled={isLoading}
                      className="bg-white/[0.03] border-white/10 text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05] h-12 rounded-xl transition-all"
                      {...register('lastName')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email công việc</label>
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    error={errors.email?.message}
                    disabled={isLoading}
                    leftIcon={<Mail size={18} className="text-slate-500" />}
                    className="bg-white/[0.03] border-white/10 text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05] h-12 rounded-xl transition-all"
                    {...register('email')}
                  />
                </div>



                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mật khẩu</label>
                  <Input
                    type="password"
                    placeholder="Tối thiểu 8 ký tự"
                    error={errors.password?.message}
                    disabled={isLoading}
                    leftIcon={<Lock size={18} className="text-slate-500" />}
                    className="bg-white/[0.03] border-white/10 text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05] h-12 rounded-xl transition-all"
                    {...register('password')}
                  />
                  {passwordValue && (
                    <div className="px-1 pt-2">
                      <div className="flex gap-1.5 h-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`flex-1 rounded-full transition-colors duration-300 ${
                              level <= passwordStrength.level
                                ? passwordStrength.color
                                : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Xác nhận mật khẩu</label>
                  <Input
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    error={errors.confirmPassword?.message}
                    disabled={isLoading}
                    leftIcon={<Lock size={18} className="text-slate-500" />}
                    className="bg-white/[0.03] border-white/10 text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05] h-12 rounded-xl transition-all"
                    {...register('confirmPassword')}
                  />
                </div>

                <div className="pt-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-white/10 bg-white/5 text-primary-500 focus:ring-primary-500/50"
                      {...register('acceptTerms')}
                    />
                    <span className="text-xs text-slate-500 leading-relaxed font-medium">
                      Tôi đồng ý với <a href="#" className="text-white hover:text-primary-400 underline underline-offset-4 decoration-primary-500/30">Điều khoản sử dụng</a> và <a href="#" className="text-white hover:text-primary-400 underline underline-offset-4 decoration-primary-500/30">Chính sách bảo mật</a>.
                    </span>
                  </label>
                  {errors.acceptTerms && (
                    <p className="mt-2 text-xs text-red-400 font-bold">{errors.acceptTerms.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-black text-lg shadow-xl shadow-primary-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] mt-6"
                  loading={isLoading}
                >
                  Tạo tài khoản ngay
                  <ArrowRight size={22} className="ml-3 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            )}

            <div className="mt-10 pt-8 border-t border-white/5 text-center">
              <p className="text-slate-500 text-sm font-medium">
                Đã có tài khoản?{' '}
                <Link
                  to="/login"
                  className="text-white hover:text-primary-400 font-bold transition-colors ml-1 underline underline-offset-4 decoration-primary-500/30"
                >
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
