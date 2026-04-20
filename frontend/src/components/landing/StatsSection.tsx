import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const stats = [
  { value: 98,  suffix: '%',   label: 'Độ chính xác AI', isFloat: false },
  { value: 100, suffix: '%',   label: 'Bảo mật dữ liệu',    isFloat: false },
  { value: 15,  suffix: '+',   label: 'Ngôn ngữ hỗ trợ',         isFloat: false },
  { value: 5,   suffix: 's',   label: 'Tốc độ xử lý',         prefix: '< ', isFloat: false },
];

function useCounter(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, duration]);
  return count;
}

const StatItem: React.FC<{ stat: typeof stats[0]; active: boolean; index: number }> = ({ stat, active, index }) => {
  const count = useCounter(stat.value, 1500, active);
  return (
    <div className={`text-center py-12 px-8 ${index < stats.length - 1 ? 'lg:border-r lg:border-white/10' : ''}`}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-4"
      >
        {stat.prefix || ''}{count}{stat.suffix}
      </motion.div>
      <div className="text-xs sm:text-sm font-bold text-primary-400 uppercase tracking-widest">
        {stat.label}
      </div>
    </div>
  );
};

const StatsSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="bg-gray-900 py-12 sm:py-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <StatItem key={i} stat={stat} active={active} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
