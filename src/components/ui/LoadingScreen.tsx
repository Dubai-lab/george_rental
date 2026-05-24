import { motion } from 'framer-motion'
import GRLogo from './GRLogo'

export default function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--gr-midnight)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 32, zIndex: 9999,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <GRLogo size={28} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        style={{ display: 'flex', gap: 8 }}
      >
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gr-crimson)' }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
      </motion.div>
    </div>
  )
}
