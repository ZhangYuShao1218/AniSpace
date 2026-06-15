import React from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import '@/components/modals/ConfirmModal.css'; // Reuse styles from ConfirmModal

interface NoticeModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
}

const NoticeModal: React.FC<NoticeModalProps> = ({
  isOpen,
  onConfirm,
  title,
  message,
  confirmText = 'OK'
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay">
      <div className="confirm-modal glass-panel fade-in" onClick={e => e.stopPropagation()}>
        <div className="confirm-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
          <Info size={24} style={{ color: 'var(--accent-color)' }} />
          <h2 className="confirm-title">{title}</h2>
        </div>

        <div className="confirm-body" style={{ marginTop: '16px', marginBottom: '24px' }}>
          {message}
        </div>
        
        <div className="confirm-footer" style={{ borderTop: 'none', background: 'transparent' }}>
          <button 
            className="btn-primary"
            style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)' }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NoticeModal;
