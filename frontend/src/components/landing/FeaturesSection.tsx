import React from 'react';
import { motion } from 'framer-motion';
import { 
  Mic2, 
  Users2, 
  FileJson, 
  ShieldCheck, 
  Zap, 
  MessageSquareQuote,
  Clock,
  LayoutDashboard
} from 'lucide-react';

const features = [
  {
    title: 'Ghi âm & Phiên âm',
    description: 'Tự động chuyển đổi âm thanh cuộc họp thành văn bản với độ chính xác cao nhờ Deepgram và ViWhisper.',
    icon: <Mic2 className="w-6 h-6" />,
    color: 'bg-blue-50 text-blue-600'
  },
  {
    title: 'Nhận diện người nói',
    description: 'Tự động phân tách và định danh người nói trong cuộc họp, giúp dễ dàng theo dõi luồng hội thoại.',
    icon: <Users2 className="w-6 h-6" />,
    color: 'bg-primary-50 text-primary-600'
  },
  {
    title: 'Tổng hợp AI thông minh',
    description: 'Tạo biên bản tóm tắt, trích xuất các ý chính và hành động cần thực hiện chỉ trong vài giây.',
    icon: <Zap className="w-6 h-6" />,
    color: 'bg-amber-50 text-amber-600'
  },
  {
    title: 'Bảo mật dữ liệu',
    description: 'Dữ liệu của bạn được mã hóa và bảo mật tuyệt đối, cam kết không chia sẻ với bên thứ ba.',
    icon: <ShieldCheck className="w-6 h-6" />,
    color: 'bg-green-50 text-green-600'
  },
  {
    title: 'Quản lý tập trung',
    description: 'Lưu trữ và tìm kiếm tất cả các cuộc họp của bạn trên một bảng điều khiển duy nhất, trực quan.',
    icon: <LayoutDashboard className="w-6 h-6" />,
    color: 'bg-purple-50 text-purple-600'
  },
  {
    title: 'Xuất dữ liệu linh hoạt',
    description: 'Hỗ trợ xuất biên bản ra nhiều định dạng khác nhau như PDF, Word, JSON để phục vụ lưu trữ.',
    icon: <FileJson className="w-6 h-6" />,
    color: 'bg-red-50 text-red-600'
  }
];

const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-base font-bold text-primary-600 uppercase tracking-widest mb-3">Tính năng mạnh mẽ</h2>
            <h3 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
              Mọi thứ bạn cần để quản lý cuộc họp hiệu quả
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Tận dụng sức mạnh của trí tuệ nhân tạo để biến các cuộc hội thoại thành tài sản dữ liệu có giá trị cho doanh nghiệp của bạn.
            </p>
          </motion.div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group p-8 rounded-3xl border border-gray-100 bg-white hover:border-primary-100 hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-2xl ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {feature.icon}
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors">
                {feature.title}
              </h4>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Bottom Callout */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-20 p-8 rounded-3xl bg-gray-900 text-white flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-white/10 items-center justify-center shrink-0">
              <Clock className="w-8 h-8 text-primary-400" />
            </div>
            <div>
              <h5 className="text-xl font-bold mb-1">Bạn đang lãng phí bao nhiêu thời gian?</h5>
              <p className="text-gray-400">Trung bình một nhân viên dành 31 giờ mỗi tháng cho các cuộc họp không hiệu quả.</p>
            </div>
          </div>
          <button className="whitespace-nowrap bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-primary-500/20">
            Tính toán lợi ích ngay
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
