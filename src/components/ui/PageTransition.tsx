'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
