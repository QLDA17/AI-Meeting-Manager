import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mic, Cpu, Users, FileText, ArrowRight } from 'lucide-react';

const steps = [
  {
    num: '01',
    title: 'Ghi âm / Tải lên',
    desc: 'Sử dụng micro trực tiếp hoặc tải lên tệp âm thanh/video có sẵn từ thiết bị của bạn.',
    icon: <Mic className="w-8 h-8" />,
    color: 'bg-blue-500'
  },
  {
    num: '02',
    title: 'Xử lý AI',
    desc: 'Công nghệ PhoWhisper phân tích âm thanh, chuyển đổi thành văn bản với độ chính xác vượt trội.',
    icon: <Cpu className="w-8 h-8" />,
    color: 'bg-primary-600'
  },
  {
    num: '03',
    title: 'Định danh người nói',
    desc: 'Hệ thống tự động nhận diện và phân tách từng thành viên tham gia cuộc họp một cách thông minh.',
    icon: <Users className="w-8 h-8" />,
    color: 'bg-amber-500'
  },
  {
    num: '04',
    title: 'Xuất biên bản',
    desc: 'Nhận bản tóm tắt, danh sách công việc (Action Items) và xuất file PDF/Word chỉ với một cú click.',
    icon: <FileText className="w-8 h-8" />,
    color: 'bg-green-600'
  },
];

const BenefitsSection: React.FC = () => {
  return (
    <section id="benefits" className="py-24 bg-gray-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-base font-bold text-primary-600 uppercase tracking-widest mb-3">Quy trình thông minh</h2>
              <h3 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Từ âm thanh đến biên bản <br /> chính thức trong nháy mắt
              </h3>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-gray-600 max-w-xs text-lg font-medium italic">
              "Giải pháp giúp tiết kiệm 80% thời gian ghi chép biên bản cuộc họp mỗi ngày."
            </p>
          </motion.div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="relative p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all group"
            >
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 -right-4 w-8 h-[2px] bg-gray-100 z-0" />
              )}

              {/* Number and Icon */}
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className={`w-16 h-16 rounded-2xl ${step.color} text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
                  {step.icon}
                </div>
                <div className="text-4xl font-black text-gray-100 group-hover:text-gray-200 transition-colors">
                  {step.num}
                </div>
              </div>

              {/* Title */}
              <h4 className="text-xl font-extrabold text-gray-900 mb-4">
                {step.title}
              </h4>

              {/* Desc */}
              <p className="text-gray-600 leading-relaxed font-medium text-sm">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Bottom Callout */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4 text-gray-700 font-bold">
            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
              <ArrowRight size={20} />
            </div>
            Sẵn sàng trải nghiệm ngay trên trình duyệt của bạn?
          </div>
          <Link to="/register" className="inline-flex items-center gap-2 text-primary-600 font-extrabold text-lg hover:gap-4 transition-all group">
            Bắt đầu miễn phí <ArrowRight size={20} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default BenefitsSection;
