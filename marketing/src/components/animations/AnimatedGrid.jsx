import { motion } from 'framer-motion';

export const gridContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 }
  }
};

export const gridItemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.9, rotate: -2 },
  visible: {
    opacity: 1, y: 0, scale: 1, rotate: 0,
    transition: { type: 'spring', stiffness: 260, damping: 20 }
  }
};

export function AnimatedGrid({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      variants={gridContainerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.1 }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedGridItem({ children, className = '', style, variants = gridItemVariants }) {
  return (
    <motion.div className={className} style={style} variants={variants}>
      {children}
    </motion.div>
  );
}
