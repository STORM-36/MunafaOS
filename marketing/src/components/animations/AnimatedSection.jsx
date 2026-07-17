import { motion } from 'framer-motion';

export default function AnimatedSection({ children, className = '', id }) {
  return (
    <motion.section
      id={id}
      className={className}
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: false, amount: 0.15 }}
      transition={{ type: 'spring', stiffness: 100, damping: 12, mass: 0.8 }}
    >
      {children}
    </motion.section>
  );
}
