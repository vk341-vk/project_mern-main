import React, { useEffect } from 'react';

const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className={`toast ${toast.isErr ? 'err' : ''}`} onClick={onClose} style={{ cursor: 'pointer' }}>
      <div className="tt">{toast.title}</div>
      {toast.body && <div className="td">{toast.body}</div>}
    </div>
  );
};

export default Toast;
