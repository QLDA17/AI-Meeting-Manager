import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, ArrowRight, ShieldCheck, Zap, Globe, Sparkles } from 'lucide-react';

const MockBrowser: React.FC = () => {
  return (
    <div className="relative group">
      {/* Decorative blobs */}
      <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/20 to-blue-500/20 rounded-[2rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Browser Frame */}
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
        {/* Browser Top Bar */}
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="bg-white border border-gray-200 rounded-md px-3 py-1 text-[10px] text-gray-400 font-medium w-1/2 text-center">
            multiminutes.ai/dashboard
          </div>
          <div className="w-12" />
        </div>

        {/* Mock Content */}
        <div className="p-4 bg-gray-50/50">
          <div className="grid grid-cols-12 gap-4">
            {/* Sidebar Mock */}
            <div className="col-span-3 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="space-y-2">
                <div className="h-3 bg-primary-100 rounded w-4/5" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
            
            {/* Main Content Mock */}
            <div className="col-span-9 space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-6 bg-gray-200 rounded w-1/3" />
                <div className="h-8 bg-primary-600 rounded-lg w-1/4 shadow-lg shadow-primary-500/20" />
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm space-y-2">
                    <div className="h-2 bg-gray-100 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </div>
                ))}
              </div>

              {/* List Mock */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-3 border-b border-gray-50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gray-100" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2 bg-gray-200 rounded w-1/4" />
                      <div className="h-1.5 bg-gray-100 rounded w-1/3" />
                    </div>
                    <div className="h-4 bg-primary-50 rounded w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <motion.div 
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-6 top-1/4 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3"
      >
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <Sparkles size={20} />
        </div>
        <div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">AI Summary</div>
          <div className="text-xs font-bold text-gray-900 mt-1 italic">"Kế hoạch Q4 đã sẵn sàng..."</div>
        </div>
      </motion.div>

      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -left-8 bottom-1/4 bg-white px-4 py-3 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3"
      >
        <div className="flex -space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={`w-6 h-6 rounded-full border-2 border-white bg-gray-${i*100+100}`} />
          ))}
        </div>
        <div className="text-[11px] font-bold text-gray-700">8 người tham gia</div>
      </motion.div>
    </div>
  );
};

const HeroSection: React.FC = () => {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-50 rounded-full blur-[100px] opacity-60" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-xs font-bold uppercase tracking-wider mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                </span>
                Web-based AI Platform
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-8"
            >
              Cuộc họp của bạn, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-green-500">
                AI ghi chép
              </span> hoàn hảo.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-gray-600 leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0"
            >
              MultiMinutes AI tự động phiên âm, nhận diện người nói và tổng hợp biên bản chính thức ngay trên trình duyệt. Bảo mật, nhanh chóng và không cần cài đặt.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <Link to="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/25 hover:-translate-y-1">
                Bắt đầu miễn phí
                <ArrowRight size={20} />
              </Link>
              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold text-lg border border-gray-200 hover:bg-gray-50 transition-all">
                <Play size={20} className="fill-current" />
                Xem Demo
              </button>
            </motion.div>

            {/* Trusted by / Features inline */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="mt-12 flex flex-wrap justify-center lg:justify-start gap-6 text-gray-400"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} />
                <span className="text-sm font-medium">Bảo mật tuyệt đối</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={18} />
                <span className="text-sm font-medium">Xử lý tức thì</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe size={18} />
                <span className="text-sm font-medium">Đa ngôn ngữ</span>
              </div>
            </motion.div>
          </div>

          {/* Visual */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden lg:block relative"
          >
            <MockBrowser />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
