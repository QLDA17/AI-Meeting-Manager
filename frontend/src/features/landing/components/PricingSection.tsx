import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, ArrowRight } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '0đ',
    priceNote: '/tháng',
    desc: 'Hoàn hảo để trải nghiệm các tính năng AI cơ bản.',
    cta: 'Bắt đầu miễn phí',
    highlighted: false,
    features: ['5 cuộc họp/tháng', 'Phiên âm tự động', 'Tóm tắt AI cơ bản', 'Xuất PDF', '1 thành viên'],
    notIncluded: ['Tích hợp Slack/Teams', 'Phân tích nâng cao', 'Hỗ trợ 24/7'],
  },
  {
    name: 'Pro',
    price: '499.000đ',
    priceNote: '/tháng',
    desc: 'Dành cho các đội nhóm và cá nhân chuyên nghiệp.',
    cta: 'Dùng thử 14 ngày',
    highlighted: true,
    badge: 'Phổ biến nhất',
    features: ['Không giới hạn cuộc họp', 'Phiên âm real-time', 'AI Summary nâng cao', 'Xuất PDF, DOCX, JSON', 'Tối đa 20 thành viên', 'Tích hợp Slack, Teams', 'Hỗ trợ ưu tiên 24/7'],
    notIncluded: [],
  },
  {
    name: 'Enterprise',
    price: 'Liên hệ',
    priceNote: '',
    desc: 'Giải pháp tùy chỉnh cho doanh nghiệp lớn.',
    cta: 'Liên hệ tư vấn',
    highlighted: false,
    features: ['Tất cả tính năng Pro', 'Thành viên không giới hạn', 'SSO / SAML', 'Triển khai Private Cloud', 'SLA 99.9%', 'Quản lý bảo mật nâng cao'],
    notIncluded: [],
  },
];

const PricingSection: React.FC = () => {
  return (
    <section id="pricing" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-base font-bold text-primary-600 uppercase tracking-widest mb-3">Bảng giá linh hoạt</h2>
            <h3 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
              Chọn gói dịch vụ phù hợp với nhu cầu của bạn
            </h3>
            <p className="text-lg text-gray-600">
              Bắt đầu miễn phí và nâng cấp khi bạn cần nhiều tính năng hơn. Không có chi phí ẩn.
            </p>
          </motion.div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative p-10 rounded-[2.5rem] border ${
                plan.highlighted 
                  ? 'border-primary-500 shadow-2xl shadow-primary-500/10 ring-4 ring-primary-50' 
                  : 'border-gray-100 bg-gray-50/50'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                  {plan.badge}
                </div>
              )}

              <div className="mb-8">
                <h4 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">{plan.desc}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black text-gray-900 tracking-tight">{plan.price}</span>
                <span className="text-gray-400 text-sm font-bold uppercase">{plan.priceNote}</span>
              </div>

              <Link 
                to="/register" 
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all mb-8 ${
                  plan.highlighted 
                    ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/20 hover:bg-primary-700' 
                    : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {plan.cta}
                <ArrowRight size={18} />
              </Link>

              <div className="space-y-4">
                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Tính năng bao gồm:</div>
                {plan.features.map((f, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{f}</span>
                  </div>
                ))}
                {plan.notIncluded.map((f, j) => (
                  <div key={j} className="flex items-start gap-3 opacity-40">
                    <div className="mt-1 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <X className="w-3 h-3 text-gray-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-500 line-through">{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm font-medium">
            Tất cả các gói đều bao gồm bảo mật dữ liệu cấp doanh nghiệp và hỗ trợ tiếng Việt hoàn hảo.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
