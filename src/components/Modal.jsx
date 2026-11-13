import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { overlayVariants, modalVariants } from '../motion/variants';
import './Modal.css';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          onClick={onClose}
          variants={overlayVariants}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          <motion.div
            className={`modal modal-${size}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            variants={modalVariants}
          >
            <div className="modal-header">
              <h2 className="modal-title">{title}</h2>
              <motion.button
                className="modal-close"
                onClick={onClose}
                aria-label="Close modal"
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ✕
              </motion.button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
