import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, EyeOff, ServerOff, CheckCircle } from 'lucide-react';

const securityFacts = [
  {
    title: 'Bảo mật tuyệt đối 100%',
    desc: 'Hệ thống được thiết kế với tiêu chuẩn bảo mật cao nhất, đảm bảo dữ liệu của bạn luôn được an toàn.',
    icon: <Lock className="w-5 h-5" />
  },
  {
    title: 'Quyền riêng tư là ưu tiên',
    desc: 'Chúng tôi cam kết không truy cập, không phân tích và không bao giờ bán dữ liệu cuộc họp của bạn.',
    icon: <EyeOff className="w-5 h-5" />
  },
  {
    title: 'Xử lý dữ liệu thông minh',
    desc: 'Mọi quá trình xử lý AI đều được thực hiện thông qua các kênh mã hóa đầu cuối (E2EE).',
    icon: <ShieldCheck className="w-5 h-5" />
  },
  {
    title: 'Tuân thủ các tiêu chuẩn quốc tế',
    desc: 'Hệ thống đáp ứng các tiêu chuẩn về an toàn thông tin và bảo vệ dữ liệu cá nhân.',
    icon: <CheckCircle className="w-5 h-5" />
  },
];

const badges = ['SSL Secure', 'E2E Encryption', 'GDPR Compliant', 'ISO 27001 Ready'];

const TestimonialsSection: React.FC = () => {
  return (
    <section id="security" className="py-24 bg-primary-950 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-500 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-bold uppercase tracking-[0.2em] mb-6">
              <ShieldCheck size={14} />
              Bảo mật là ưu tiên hàng đầu
            </div>
            <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight mb-8">
              Dữ liệu của bạn <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-green-300">
                thuộc về chính bạn.
              </span>
            </h2>
            <p className="text-xl text-primary-100/50 leading-relaxed mb-10 max-w-xl font-medium">
              CONVIA được xây dựng trên nền tảng niềm tin. Chúng tôi sử dụng các công nghệ bảo mật tiên tiến nhất để bảo vệ mọi thông tin quan trọng trong cuộc họp của bạn.
            </p>
            
            <div className="flex flex-wrap gap-3">
              {badges.map(badge => (
                <span key={badge} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest">
                  {badge}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {securityFacts.map((fact, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors group"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary-500/20 text-primary-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {fact.icon}
                </div>
                <h4 className="text-lg font-bold text-white mb-3">
                  {fact.title}
                </h4>
                <p className="text-sm text-primary-100/40 leading-relaxed">
                  {fact.desc}
                </p>
              </motion.div>
            ))}
            
            {/* Visual Callout */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="sm:col-span-2 mt-4 p-6 rounded-[2rem] bg-gradient-to-r from-primary-600 to-green-600 flex items-center justify-between gap-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                  <ServerOff size={24} />
                </div>
                <div className="text-white font-bold text-lg">
                  Tùy chọn triển khai Private Cloud cho doanh nghiệp.
                </div>
              </div>
              <button className="hidden sm:block px-6 py-3 bg-white text-primary-900 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-primary-50 transition-colors">
                Tìm hiểu thêm
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
