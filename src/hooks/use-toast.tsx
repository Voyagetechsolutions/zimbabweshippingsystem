
import * as React from "react";
import { cn } from "@/lib/utils";

type ToastProps = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  action?: React.ReactNode;
  className?: string;
  duration?: number;
};

type Toast = ToastProps & {
  id: string;
  open: boolean;
};

type ToastContextType = {
  toasts: Toast[];
  showToast: (toast: ToastProps) => void;
  dismissToast: (id: string) => void;
};

export type ToastAPI = {
  toast: (toast: ToastProps) => void;
  toasts: Toast[]; // Add the toasts property
};

export type ToastMethod = (toast: ToastProps) => void;

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const showToast = React.useCallback((toast: ToastProps) => {
    const id = Math.random().toString(36).slice(2);
    const newToast = {
      ...toast,
      id,
      open: true,
    };

    setToasts((prevToasts) => [...prevToasts, newToast]);

    // Automatically dismiss toast after specified duration
    setTimeout(() => {
      dismissToast(id);
    }, toast.duration || 5000);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) => {
        if (toast.id === id) {
          return { ...toast, open: false };
        }
        return toast;
      })
    );

    // Remove from array after animation
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastAPI => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  const { showToast, toasts } = context;
  return { toast: showToast, toasts };
};

export const toast: ToastMethod = (props) => {
  const toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    // Create a fallback toast container if not found
    const container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const id = Math.random().toString(36).slice(2);
  
  // Create toast element
  const toastEl = document.createElement("div");
  toastEl.id = `toast-${id}`;
  toastEl.className = cn(
    "fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2 rounded-lg border bg-background p-4 shadow-lg transition-all",
    props.variant === "destructive" ? "border-destructive" : "border-border",
    props.className
  );
  
  // Create title
  const titleEl = document.createElement("div");
  titleEl.className = "text-sm font-semibold";
  titleEl.textContent = props.title;
  toastEl.appendChild(titleEl);
  
  // Create description if provided
  if (props.description) {
    const descriptionEl = document.createElement("div");
    descriptionEl.className = "text-sm text-muted-foreground";
    descriptionEl.textContent = props.description;
    toastEl.appendChild(descriptionEl);
  }
  
  // Add to container
  const container = document.getElementById("toast-container") || document.body;
  container.appendChild(toastEl);
  
  // Auto remove
  setTimeout(() => {
    if (toastEl && toastEl.parentNode) {
      toastEl.classList.add("opacity-0");
      setTimeout(() => toastEl.parentNode?.removeChild(toastEl), 300);
    }
  }, props.duration || 5000);

  return {
    id,
    dismiss: () => {
      const el = document.getElementById(`toast-${id}`);
      if (el) {
        el.classList.add("opacity-0");
        setTimeout(() => el.parentNode?.removeChild(el), 300);
      }
    }
  };
};

const ToastContainer = () => {
  const context = React.useContext(ToastContext);
  if (!context) return null;

  const { toasts, dismissToast } = context;

  return (
    <div
      id="toast-container"
      className="fixed top-0 right-0 z-50 flex flex-col items-end p-4 gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex max-w-sm flex-col gap-2 rounded-lg border bg-background p-4 shadow-lg transition-all",
            toast.open ? "opacity-100" : "opacity-0",
            toast.variant === "destructive" ? "border-destructive" : "border-border",
            toast.className
          )}
        >
          {toast.title && (
            <div className="text-sm font-semibold">{toast.title}</div>
          )}
          {toast.description && (
            <div className="text-sm text-muted-foreground">
              {toast.description}
            </div>
          )}
          {toast.action && (
            <div className="flex items-center justify-end">{toast.action}</div>
          )}
          <button
            className="absolute top-1 right-1 p-1 text-muted-foreground hover:text-foreground"
            onClick={() => dismissToast(toast.id)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};
