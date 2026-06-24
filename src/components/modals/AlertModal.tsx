import React from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import '@/components/modals/AlertModal.css';

interface AlertModalProps {
  isOpen: boolean;
  message: React.ReactNode | string;
  title?: string;
  onClose: () => void;
  onConfirm?: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({ isOpen, message, title, onClose, onConfirm }) => {
  const { t } = useLanguage();
  if (!isOpen) return null;
  
  const finalTitle = title || t('systemPrompt');

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  return createPortal(
    <div className="alert-modal-backdrop" onClick={onClose}>
      <div className="alert-modal-content" onClick={e => e.stopPropagation()}>
        <div className="alert-modal-header">
          <Info size={24} className="alert-icon" />
          <h3 className="alert-modal-title">{finalTitle}</h3>
        </div>
        <div className="alert-modal-body">
          {typeof message === 'string' ? message.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          )) : message}
        </div>
        <div className="alert-modal-actions">
          <button className="btn-primary" onClick={handleConfirm}>{t('confirm')}</button>
        </div>
      </div>
    </div>,
    document.body
  );
};
