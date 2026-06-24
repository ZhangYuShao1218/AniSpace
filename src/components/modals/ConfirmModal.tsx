import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import '@/components/modals/ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  dangerText?: string;
  hideCancel?: boolean;
  singleConfirm?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  dangerText,
  hideCancel,
  singleConfirm
}) => {
  const { t } = useLanguage();
  const [isConfirming, setIsConfirming] = useState(false);

  const finalConfirmText = confirmText || t('confirmDeleteData');
  const finalDangerText = dangerText || t('confirmDeleteForever');

  useEffect(() => {
    if (!isOpen) {
      setIsConfirming(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmClick = () => {
    if (singleConfirm || isConfirming) {
      onConfirm();
      onClose();
    } else {
      setIsConfirming(true);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirm-modal glass-panel fade-in" onClick={e => e.stopPropagation()}>
        <div className="confirm-header">
          <AlertTriangle size={24} className="warning-icon" />
          <h2 className="confirm-title">{title}</h2>
        </div>

        <div className="confirm-body">
          {message}
        </div>
        
        <div className="confirm-footer">
          <button 
            className={`confirm-btn-primary ${singleConfirm ? 'btn-primary' : (isConfirming ? 'danger-active' : 'danger-idle')}`}
            onClick={handleConfirmClick}
            style={singleConfirm ? { background: 'var(--accent-color)', borderColor: 'var(--accent-color)', color: 'white' } : undefined}
          >
            {singleConfirm ? finalConfirmText : (isConfirming ? finalDangerText : finalConfirmText)}
          </button>
          {!hideCancel && (
            <button className="confirm-btn-secondary" onClick={onClose}>
              {t('cancel')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
