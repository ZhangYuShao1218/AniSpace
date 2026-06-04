import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertModal } from '../components/AlertModal';

interface AlertContextType {
  showAlert: (message: string, title?: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');

  const showAlert = (msg: string, title?: string) => {
    setMessage(msg);
    setTitle(title || '');
    setIsOpen(true);
  };

  const closeAlert = () => setIsOpen(false);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AlertModal 
        isOpen={isOpen} 
        message={message} 
        title={title} 
        onClose={closeAlert} 
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
