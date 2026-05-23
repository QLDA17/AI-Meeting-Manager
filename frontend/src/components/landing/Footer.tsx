import React from 'react';
import { Link } from 'react-router-dom';
import { Share2, Users, Mail } from 'lucide-react';
import { Logo } from '../ui';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 mb-12">
          <div className="col-span-2">
            <div className="mb-6">
              <Logo size="sm" showSubtext={false} />
            </div>
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
            © 2026 CONVIA. Đã đăng ký bản quyền.
          </p>
          <div className="flex items-center gap-6 text-xs text-gray-400 font-medium">
            <a href="#" className="hover:text-gray-600">Vietnam (Tiếng Việt)</a>
            <a href="#" className="hover:text-gray-600">English</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
