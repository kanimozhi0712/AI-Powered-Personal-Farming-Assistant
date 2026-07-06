import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const value = useMemo(() => ({ toast, loading, setLoading, notify }), [toast, loading, notify]);

  return (
    <AppContext.Provider value={value}>
      {children}
      {toast && <div className={`app-toast ${toast.type}`}>{toast.message}</div>}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider');
  }
  return context;
}
