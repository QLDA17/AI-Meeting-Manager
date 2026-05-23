import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Share2, Users, Mail } from 'lucide-react';

const CtaSection: React.FC = () => {
  return (
    <section id="cta" className="relative py-24 bg-gray-50 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-100 rounded-full blur-[100px] opacity-50" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-50" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Center CTA Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.25, 0, 0, 1] }}
          className="relative bg-primary-900 rounded-[3rem] p-12 lg:p-20 overflow-hidden shadow-2xl shadow-primary-900/20"
        >
          {/* Internal Decor */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary-800 to-transparent opacity-50" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-500 rounded-full blur-3xl opacity-20" />

          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <h2 className="text-4xl lg:text-6xl font-extrabold text-white tracking-tight mb-8 leading-[1.1]">
              Nâng tầm hiệu suất <br /> cuộc họp của bạn ngay hôm nay.
            </h2>
            <p className="text-xl text-primary-100 mb-12 leading-relaxed">
              Tham gia cùng hàng ngàn chuyên gia đang sử dụng CONVIA để tối ưu hóa quy trình làm việc và không bao giờ bỏ lỡ một chi tiết quan trọng nào.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/register" 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-primary-900 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-primary-50 transition-all shadow-xl hover:-translate-y-1"
              >
                Bắt đầu hoàn toàn miễn phí
                <ArrowRight size={20} />
              </Link>
              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-800/50 text-white px-10 py-5 rounded-2xl font-bold text-lg border border-primary-700 hover:bg-primary-800 transition-all">
                Liên hệ đội ngũ sales
              </button>
            </div>

            <p className="mt-8 text-primary-300 text-sm font-medium">
              Không cần thẻ tín dụng · Dùng thử miễn phí 14 ngày · Hỗ trợ 24/7
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default CtaSection;
