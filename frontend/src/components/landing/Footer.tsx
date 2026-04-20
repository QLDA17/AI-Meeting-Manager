import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-gray-400 text-sm">
          © 2025 MultiMinutes AI. Đã đăng ký bản quyền.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
