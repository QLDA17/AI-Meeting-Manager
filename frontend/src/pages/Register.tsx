import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Mail, Lock, ArrowRight, Eye, EyeOff, UserRound, Phone, CalendarDays } from 'lucide-react';
import { Button, Input, Logo } from '../components/ui';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'Vui long nhap ho'),
    lastName: z.string().min(1, 'Vui long nhap ten'),
    username: z.string().min(3, 'Username toi thieu 3 ky tu').max(50, 'Username toi da 50 ky tu').optional().or(z.literal('')),
    email: z.string().email('Email khong hop le'),
    phone: z.string().regex(/^(0|\+84)\d{9,10}$/, 'SDT khong hop le').optional().or(z.literal('')),
    gender: z.enum(['male', 'female', 'other', '']).optional(),
    dateOfBirth: z.string().min(1, 'Vui long chon ngay sinh').refine((val) => {
      const birthDate = new Date(val);
      if (Number.isNaN(birthDate.getTime())) return false;
      const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return age >= 13;
    }, { message: 'Ban phai tu 13 tuoi tro len' }),
    password: z.string().min(8, 'Mat khau toi thieu 8 ky tu'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Vui long dong y dieu khoan su dung' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mat khau xac nhan khong khop',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const featureHighlights = [
  'Phien am tu dong voi AI',
  'Tong hop bien ban thong minh',
  'Cong tac nhom de dang',
  'Bao mat cap doanh nghiep',
];

const getPasswordStrength = (
  password: string,
): { level: number; label: string; color: string } => {
  if (!password) return { level: 0, label: '', color: '' };
  if (password.length < 6) return { level: 1, label: 'Yeu', color: 'bg-red-500' };
  if (password.length < 10) return { level: 2, label: 'Trung binh', color: 'bg-amber-500' };
  return { level: 3, label: 'Manh', color: 'bg-primary-500' };
};

const formatApiError = (err: unknown): string => {
  const response = (err as { response?: { status?: number; data?: any } })?.response;
  const detail = response?.data?.detail;

  if (Array.isArray(detail) && detail.length > 0) {
    const firstIssue = detail[0];
    const field = Array.isArray(firstIssue?.loc) ? firstIssue.loc.at(-1) : undefined;
    const message = firstIssue?.msg || 'Du lieu khong hop le.';
    if (field) {
      return `Dang ky that bai: truong "${field}" khong hop le - ${message}`;
    }
    return `Dang ky that bai: ${message}`;
  }

  if (typeof detail === 'string' && detail.trim()) {
    const normalized = detail.toLowerCase();
    if (normalized.includes('email already registered')) {
      return 'Dang ky that bai: email da duoc su dung.';
    }
    if (normalized.includes('username already registered')) {
      return 'Dang ky that bai: username da duoc su dung.';
    }
    if (normalized.includes('invitation email does not match')) {
      return 'Dang ky that bai: email dang ky khong trung voi email duoc moi.';
    }
    if (normalized.includes('invalid or expired invitation token')) {
      return 'Dang ky that bai: loi moi khong hop le hoac da het han.';
    }
    return `Dang ky that bai: ${detail}`;
  }

  if (response?.status === 409) {
    return 'Dang ky that bai: email da duoc su dung.';
  }

  if (response?.status === 422) {
    return 'Dang ky that bai: thong tin nhap vao chua hop le.';
  }

  return 'Dang ky that bai. Vui long thu lai.';
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { registerAndSetSession } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('inviteToken');
  const [apiError, setApiError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [passwordValue, setPasswordValue] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteOrgName, setInviteOrgName] = React.useState('');

  const {
    register,
    handleSubmit,
    setFocus,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const watchedPassword = watch('password', '');
  React.useEffect(() => {
    setPasswordValue(watchedPassword || '');
  }, [watchedPassword]);

  React.useEffect(() => {
    if (!inviteToken) return;

    const loadInvitation = async () => {
      try {
        const response = await api.get(
          `/api/invitations/preview?token=${encodeURIComponent(inviteToken)}`,
        );
        const preview = response.data;
        setInviteEmail(preview.email || '');
        setInviteOrgName(preview.organization_name || '');
        if (preview.email) {
          setValue('email', preview.email, { shouldValidate: true });
        }
      } catch {
        setApiError('Loi moi khong hop le hoac da het han.');
      }
    };

    loadInvitation();
  }, [inviteToken, setValue]);

  const passwordStrength = getPasswordStrength(passwordValue);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setApiError('');

    try {
      const response = await api.post('/api/auth/register', {
        username: data.username || undefined,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        gender: data.gender || undefined,
        dateOfBirth: data.dateOfBirth,
        password: data.password,
        inviteToken,
      });
      const { access_token, user, nextStep } = response.data;
      registerAndSetSession(access_token, user);
      setSuccess(true);

      if (nextStep === 'dashboard') {
        navigate('/dashboard');
      } else {
        navigate('/setup-organization');
      }
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: any } })?.response;
      const message = formatApiError(err);
      setApiError(message);

      const detail = response?.data?.detail;
      const detailText =
        typeof detail === 'string' ? detail.toLowerCase() : '';

      if (
        response?.status === 409 ||
        detailText.includes('email already registered') ||
        detailText.includes('invitation email does not match')
      ) {
        setFocus('email');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-950 px-4 py-12 selection:bg-primary-500/30">
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-[0.15]" />
      <div className="pointer-events-none absolute right-[-10%] top-[-10%] h-[600px] w-[600px] animate-pulse rounded-full bg-primary-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-5%] left-[5%] h-[500px] w-[500px] animate-pulse rounded-full bg-green-500/10 blur-[120px]" />

      <div className="relative z-10 grid w-full max-w-6xl items-center gap-16 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="hidden space-y-12 lg:block"
        >
          <div className="flex items-center gap-3">
            <Logo variant="dark" className="origin-left scale-125" />
          </div>

          <div className="space-y-8">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-6xl font-black leading-[1.1] tracking-tight text-white"
            >
              Tham gia
              <br />
              <span className="bg-gradient-to-r from-primary-400 via-green-300 to-primary-500 bg-clip-text text-transparent">
                workspace AI.
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="max-w-md text-xl font-medium leading-relaxed text-slate-400"
            >
              Tao tai khoan, vao he thong, roi chon tao to chuc moi hoac nhap ma tham gia.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {featureHighlights.map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="group flex items-center gap-4 rounded-3xl border border-white/5 bg-white/[0.02] p-5 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05]"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500/10 transition-colors group-hover:bg-primary-500/20">
                  <Check size={18} className="text-primary-400" />
                </div>
                <span className="text-lg font-bold text-slate-200 transition-colors group-hover:text-white">
                  {item}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-3xl sm:p-12">
            <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <Logo variant="dark" />
            </div>

            <div className="mb-10">
              <h2 className="mb-3 text-4xl font-black tracking-tight text-white">Dang ky</h2>
              <p className="font-medium text-slate-400">
                Hoan tat tai khoan de vao luong tao hoac tham gia to chuc.
              </p>
            </div>

            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 rounded-3xl border border-primary-500/20 bg-primary-500/10 p-8 text-center"
              >
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/20">
                  <Check size={32} className="text-primary-400" />
                </div>
                <h3 className="mb-2 text-xl font-black text-white">Dang ky thanh cong</h3>
                <p className="font-medium text-slate-400">
                  Dang dua ban sang buoc tiep theo...
                </p>
              </motion.div>
            )}

            {apiError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-8 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-semibold text-red-400"
              >
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                {apiError}
              </motion.div>
            )}

            {inviteToken && inviteOrgName && (
              <div className="mb-8 rounded-3xl border border-primary-500/20 bg-primary-500/10 p-5 text-sm text-slate-200">
                Ban dang duoc moi tham gia <strong>{inviteOrgName}</strong> bang email{' '}
                <strong>{inviteEmail}</strong>. Hoan tat dang ky de vao to chuc ngay.
              </div>
            )}

            {!success && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Ho
                    </label>
                    <Input
                      placeholder="Ho"
                      error={errors.firstName?.message}
                      disabled={isLoading}
                      className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05]"
                      {...register('firstName')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Ten
                    </label>
                    <Input
                      placeholder="Ten"
                      error={errors.lastName?.message}
                      disabled={isLoading}
                      className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05]"
                      {...register('lastName')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Username
                  </label>
                  <Input
                    placeholder="De trong de tu tao tu email"
                    error={errors.username?.message}
                    disabled={isLoading}
                    leftIcon={<UserRound size={18} className="text-slate-500" />}
                    className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05]"
                    {...register('username')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Email cong viec
                  </label>
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    error={errors.email?.message}
                    disabled={isLoading || Boolean(inviteToken && inviteEmail)}
                    leftIcon={<Mail size={18} className="text-slate-500" />}
                    className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05]"
                    {...register('email')}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      SDT
                    </label>
                    <Input
                      placeholder="0901234567"
                      error={errors.phone?.message}
                      disabled={isLoading}
                      leftIcon={<Phone size={18} className="text-slate-500" />}
                      className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05]"
                      {...register('phone')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Gioi tinh
                    </label>
                    <select
                      disabled={isLoading}
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-white outline-none transition focus:border-primary-500/50 focus:bg-white/[0.05]"
                      {...register('gender')}
                    >
                      <option value="" className="bg-slate-950">Khong chon</option>
                      <option value="male" className="bg-slate-950">Nam</option>
                      <option value="female" className="bg-slate-950">Nu</option>
                      <option value="other" className="bg-slate-950">Khac</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Ngay sinh
                    </label>
                    <Input
                      type="date"
                      error={errors.dateOfBirth?.message}
                      disabled={isLoading}
                      leftIcon={<CalendarDays size={18} className="text-slate-500" />}
                      className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05]"
                      {...register('dateOfBirth')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Mat khau
                  </label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Toi thieu 8 ky tu"
                    error={errors.password?.message}
                    disabled={isLoading}
                    leftIcon={<Lock size={18} className="text-slate-500" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-primary-400 focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                    className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05]"
                    {...register('password')}
                  />
                  {passwordValue && (
                    <div className="px-1 pt-2">
                      <div className="flex h-1 gap-1.5">
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
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Xac nhan mat khau
                  </label>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Nhap lai mat khau"
                    error={errors.confirmPassword?.message}
                    disabled={isLoading}
                    leftIcon={<Lock size={18} className="text-slate-500" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-primary-400 focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                    className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-700 focus:border-primary-500/50 focus:bg-white/[0.05]"
                    {...register('confirmPassword')}
                  />
                </div>

                <div className="pt-4">
                  <label className="group flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-white/10 bg-white/5 text-primary-500 focus:ring-primary-500/50"
                      {...register('acceptTerms')}
                    />
                    <span className="text-xs font-medium leading-relaxed text-slate-500">
                      Toi dong y voi dieu khoan su dung va chinh sach bao mat.
                    </span>
                  </label>
                  {errors.acceptTerms && (
                    <p className="mt-2 text-xs font-bold text-red-400">
                      {errors.acceptTerms.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="mt-6 h-14 w-full rounded-2xl bg-primary-600 text-lg font-black text-white shadow-xl shadow-primary-500/20 transition-all hover:scale-[1.02] hover:bg-primary-500 active:scale-[0.98]"
                  loading={isLoading}
                >
                  Tao tai khoan ngay
                  <ArrowRight size={22} className="ml-3 transition-transform group-hover:translate-x-1" />
                </Button>
              </form>
            )}

            <div className="mt-10 border-t border-white/5 pt-8 text-center">
              <p className="text-sm font-medium text-slate-500">
                Da co tai khoan?{' '}
                <Link
                  to="/login"
                  className="ml-1 font-bold text-white underline decoration-primary-500/30 underline-offset-4 transition-colors hover:text-primary-400"
                >
                  Dang nhap ngay
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
