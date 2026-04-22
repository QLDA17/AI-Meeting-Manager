import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../ui';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-100 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-6">
        <Logo size="md" showSubtext={false} />
        <p className="text-gray-400 text-sm text-center max-w-xs">
          Nền tảng ghi chép và tóm tắt cuộc họp thông minh hàng đầu dành cho doanh nghiệp.
        </p>
        <div className="h-px w-12 bg-gray-100" />
        <p className="text-gray-400 text-xs">
          © 2026 MultiMinutes AI. Đã đăng ký bản quyền.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
