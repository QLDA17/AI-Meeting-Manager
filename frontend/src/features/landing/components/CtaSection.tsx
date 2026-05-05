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
              Tham gia cùng hàng ngàn chuyên gia đang sử dụng MultiMinutes AI để tối ưu hóa quy trình làm việc và không bao giờ bỏ lỡ một chi tiết quan trọng nào.
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

        {/* Footer Area */}
        <footer className="mt-24 pt-12 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 mb-12">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="font-sans font-bold text-gray-900 text-xl tracking-tight">MultiMinutes</span>
              </Link>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Nền tảng AI đột phá giúp doanh nghiệp ghi chép và phân tích cuộc họp tự động, bảo mật và hiệu quả nhất.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-gray-400 hover:text-primary-600 transition-colors"><Share2 size={20} /></a>
                <a href="#" className="text-gray-400 hover:text-primary-600 transition-colors"><Users size={20} /></a>
                <a href="#" className="text-gray-400 hover:text-primary-600 transition-colors"><Mail size={20} /></a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-widest">Sản phẩm</h4>
              <ul className="space-y-4 text-sm text-gray-600 font-medium">
                <li><a href="#" className="hover:text-primary-600 transition-colors">Tính năng</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Bảng giá</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Bảo mật</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Roadmap</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-widest">Công ty</h4>
              <ul className="space-y-4 text-sm text-gray-600 font-medium">
                <li><a href="#" className="hover:text-primary-600 transition-colors">Về chúng tôi</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Tuyển dụng</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Báo chí</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-widest">Hỗ trợ</h4>
              <ul className="space-y-4 text-sm text-gray-600 font-medium">
                <li><a href="#" className="hover:text-primary-600 transition-colors">Trung tâm trợ giúp</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Tài liệu API</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Cộng đồng</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Trạng thái</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-widest">Pháp lý</h4>
              <ul className="space-y-4 text-sm text-gray-600 font-medium">
                <li><a href="#" className="hover:text-primary-600 transition-colors">Điều khoản</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Bảo mật</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">Cookie</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between py-8 border-t border-gray-100 gap-4">
            <p className="text-gray-400 text-xs">
              © 2025 MultiMinutes AI. Đã đăng ký bản quyền.
            </p>
            <div className="flex items-center gap-6 text-xs text-gray-400 font-medium">
              <a href="#" className="hover:text-gray-600">Vietnam (Tiếng Việt)</a>
              <a href="#" className="hover:text-gray-600">English</a>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
};

export default CtaSection;
