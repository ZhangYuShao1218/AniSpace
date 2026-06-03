import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  dangerText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '確認刪除資料',
  dangerText = '確認永久刪除'
}) => {
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsConfirming(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmClick = () => {
    if (isConfirming) {
      onConfirm();
      onClose();
    } else {
      setIsConfirming(true);
    }
  };

  return (
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
            className={`confirm-btn-primary ${isConfirming ? 'danger-active' : 'danger-idle'}`}
            onClick={handleConfirmClick}
          >
            {isConfirming ? dangerText : confirmText}
          </button>
          <button className="confirm-btn-secondary" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
