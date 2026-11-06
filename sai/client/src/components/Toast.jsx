import React from 'react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className="toast-container">
      <div className={`toast ${toast.isErr ? 'err' : ''}`} onClick={onClose}>
        <div className="tt">{toast.title}</div>
        {toast.body && <div className="td">{toast.body}</div>}
      </div>
    </div>
  );
}
