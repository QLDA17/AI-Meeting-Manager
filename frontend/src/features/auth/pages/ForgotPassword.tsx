import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Check, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button, Input, Logo } from '@/shared/ui';
import api from '@/shared/lib/api';

// Step 1 schema
const step1Schema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

// Step 2 schema
const step2Schema = z
  .object({
    otp: z
      .string()
      .length(6, 'Mã xác thực phải đúng 6 chữ số')
      .regex(/^\d+$/, 'Mã xác thực chỉ gồm chữ số'),
    newPassword: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

const stepVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
  if (!password) return { level: 0, label: '', color: '' };
  if (password.length < 6) return { level: 1, label: 'Yếu', color: 'bg-red-500' };
  if (password.length < 10) return { level: 2, label: 'Trung bình', color: 'bg-amber-500' };
  return { level: 3, label: 'Mạnh', color: 'bg-primary-500' };
};

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [savedEmail, setSavedEmail] = React.useState('');
  const [apiError, setApiError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [otpDigits, setOtpDigits] = React.useState(['', '', '', '', '', '']);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [passwordValue, setPasswordValue] = React.useState('');

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 1 form
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
  });

  // Step 2 form
  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
  });

  const watchedPassword = step2Form.watch('newPassword', '');
  React.useEffect(() => {
    setPasswordValue(watchedPassword || '');
  }, [watchedPassword]);

  const passwordStrength = getPasswordStrength(passwordValue);

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    // Set combined OTP value in form
    step2Form.setValue('otp', newDigits.join(''), { shouldValidate: true });
    // Auto-focus next
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...otpDigits];
    pasted.split('').forEach((char, i) => {
      if (i < 6) newDigits[i] = char;
    });
    setOtpDigits(newDigits);
    step2Form.setValue('otp', newDigits.join(''), { shouldValidate: true });
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const onStep1Submit = async (data: Step1Data) => {
    setIsLoading(true);
    setApiError('');
    try {
      await api.post('/api/auth/forgot-password', { email: data.email });
      setSavedEmail(data.email);
      setStep(2);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setApiError('Email không tồn tại trong hệ thống.');
      } else {
        setApiError('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onStep2Submit = async (data: Step2Data) => {
    setIsLoading(true);
    setApiError('');
    try {
      await api.post('/api/auth/reset-password', {
        email: savedEmail,
        otp: data.otp,
        newPassword: data.newPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 400 || status === 422) {
        setApiError('Mã xác thực không hợp lệ hoặc đã hết hạn.');
      } else {
        setApiError('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setApiError('');
    try {
      await api.post('/api/auth/forgot-password', { email: savedEmail });
    } catch {
      setApiError('Không thể gửi lại mã. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 relative overflow-hidden px-4 selection:bg-primary-500/30 font-sans">
      {/* Dynamic Background Decor */}
      <div className="absolute inset-0 dot-grid opacity-[0.15] pointer-events-none" />
      
      {/* Static Glow Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />

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
              Khôi phục <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-green-300 to-primary-500 animate-gradient-x">
                truy cập.
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-slate-400 text-xl leading-relaxed max-w-md font-medium"
            >
              Đừng lo lắng, chúng tôi sẽ hỗ trợ bạn lấy lại mật khẩu một cách an toàn nhất.
            </motion.p>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold text-primary-500 uppercase tracking-[0.3em]">Quy tắc bảo mật</p>
            {[
              'Mã OTP có hiệu lực trong 10 phút',
              'Mật khẩu mới phải từ 8 ký tự trở lên',
              'Sử dụng kết hợp chữ, số và ký tự đặc biệt',
            ].map((rule, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + (i * 0.1) }}
                className="flex items-center gap-4 text-slate-300"
              >
                <div className="w-6 h-6 rounded-full bg-primary-500/10 flex items-center justify-center">
                  <Check size={12} className="text-primary-400" />
                </div>
                <span className="font-bold text-sm">{rule}</span>
              </motion.div>
            ))}
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-black uppercase tracking-widest text-xs transition-all hover:gap-3"
          >
            <ArrowLeft size={16} />
            Quay lại đăng nhập
          </Link>
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

            <div className="mb-8">
              <h2 className="text-4xl font-black text-white tracking-tight mb-3">Quên mật khẩu?</h2>
              <p className="text-slate-400 font-medium">
                {step === 1
                  ? 'Nhập email của bạn để nhận mã xác thực.'
                  : `Mã xác thực đã được gửi tới ${savedEmail}`}
              </p>
            </div>

            {/* Progress Indicator */}
            <div className="flex gap-2 mb-10">
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= 1 ? 'bg-primary-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/10'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= 2 ? 'bg-primary-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/10'}`} />
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

            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 rounded-3xl bg-primary-500/10 border border-primary-500/20 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-6">
                  <Check size={32} className="text-primary-400" />
                </div>
                <h3 className="text-white text-xl font-black mb-2">Thành công!</h3>
                <p className="text-slate-400 font-medium">Mật khẩu của bạn đã được cập nhật thành công.</p>
              </motion.div>
            )}

            {!success && (
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email đăng ký</label>
                        <Input
                          type="email"
                          placeholder="name@company.com"
                          error={step1Form.formState.errors.email?.message}
                          disabled={isLoading}
                          leftIcon={<Mail size={18} className="text-slate-500" />}
                          className="bg-white/[0.03] border-white/10 text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05] h-12 rounded-xl transition-all"
                          {...step1Form.register('email')}
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full h-14 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-black text-lg shadow-xl shadow-primary-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
                        loading={isLoading}
                      >
                        Gửi mã xác thực
                        <ArrowRight size={22} className="ml-3 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-6"
                  >
                    <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-6">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mã xác thực (6 chữ số)</label>
                        <div className="flex gap-2 justify-between">
                          {otpDigits.map((digit, index) => (
                            <input
                              key={index}
                              ref={(el) => { otpRefs.current[index] = el; }}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleOtpChange(index, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(index, e)}
                              onPaste={handleOtpPaste}
                              disabled={isLoading}
                              className="w-full h-14 text-center text-xl font-black rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                            />
                          ))}
                        </div>
                        {step2Form.formState.errors.otp && (
                          <p className="text-xs text-red-400 font-bold ml-1">{step2Form.formState.errors.otp.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mật khẩu mới</label>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="Tối thiểu 8 ký tự"
                            error={step2Form.formState.errors.newPassword?.message}
                            disabled={isLoading}
                            leftIcon={<Lock size={18} className="text-slate-500" />}
                            className="bg-white/[0.03] border-white/10 text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05] h-12 rounded-xl transition-all"
                            {...step2Form.register('newPassword')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
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
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Nhập lại mật khẩu"
                            error={step2Form.formState.errors.confirmPassword?.message}
                            disabled={isLoading}
                            leftIcon={<Lock size={18} className="text-slate-500" />}
                            className="bg-white/[0.03] border-white/10 text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05] h-12 rounded-xl transition-all"
                            {...step2Form.register('confirmPassword')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-14 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-black text-lg shadow-xl shadow-primary-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
                        loading={isLoading}
                      >
                        Cập nhật mật khẩu
                        <ArrowRight size={22} className="ml-3 group-hover:translate-x-1 transition-transform" />
                      </Button>

                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={isLoading}
                        className="w-full text-center text-xs font-black text-slate-500 hover:text-primary-400 uppercase tracking-widest transition-colors"
                      >
                        Gửi lại mã xác nhận
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            <div className="mt-10 pt-8 border-t border-white/10 text-center lg:hidden">
              <Link
                to="/login"
                className="text-primary-400 hover:text-primary-300 font-black uppercase tracking-widest text-xs transition-colors inline-flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
