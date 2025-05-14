
import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"];
    };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      // Dismiss all toasts if toastId is undefined
      if (toastId === undefined) {
        return {
          ...state,
          toasts: state.toasts.map((t) => ({
            ...t,
            open: false,
          })),
        };
      }

      // Dismiss toast by id
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId ? { ...t, open: false } : t
        ),
      };
    }

    case "REMOVE_TOAST": {
      const { toastId } = action;

      // Remove all toasts if toastId is undefined
      if (toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }

      // Remove toast by id
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== toastId),
      };
    }

    default:
      return state;
  }
};

// Define our base toast function type first (before using it)
interface ToastFunctionBase {
  (props: Omit<ToasterToast, "id">): {
    id: string;
    dismiss: () => void;
    update: (props: ToasterToast) => void;
  };
}

// Define additional helper methods
interface ToastHelperMethods {
  error: (message: string) => void;
  success: (message: string) => void;
  loading: (message: string) => void;
}

// Combine them for our full toast function type
type ToastFunction = ToastFunctionBase & ToastHelperMethods;

// Create a React context for toast
interface ToastContextValue {
  toast: ToastFunction;
  toasts: ToasterToast[];
  dismiss: (toastId?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(
  undefined
);

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = React.useReducer(reducer, {
    toasts: [],
  });

  React.useEffect(() => {
    state.toasts.forEach((toast) => {
      if (!toast.open) {
        // If toast is not open, start dismiss timeout
        if (toastTimeouts.has(toast.id)) {
          return;
        }

        const timeout = setTimeout(() => {
          dispatch({ type: "REMOVE_TOAST", toastId: toast.id });
          toastTimeouts.delete(toast.id);
        }, TOAST_REMOVE_DELAY);

        toastTimeouts.set(toast.id, timeout);
      }
    });
  }, [state.toasts]);

  const toast = React.useMemo(() => {
    const baseToast = (props: Omit<ToasterToast, "id">) => {
      const id = genId();

      const update = (props: ToasterToast) =>
        dispatch({
          type: "UPDATE_TOAST",
          toast: { ...props, id },
        });

      const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

      dispatch({
        type: "ADD_TOAST",
        toast: {
          ...props,
          id,
          open: true,
          onOpenChange: (open) => {
            if (!open) dismiss();
          },
        },
      });

      return {
        id,
        dismiss,
        update,
      };
    };

    // Add convenience methods
    const toastWithMethods = baseToast as ToastFunction;
    
    toastWithMethods.error = (message: string) => {
      baseToast({ 
        title: "Error", 
        description: message, 
        variant: "destructive" 
      });
    };
    
    toastWithMethods.success = (message: string) => {
      baseToast({ 
        title: "Success", 
        description: message 
      });
    };
    
    toastWithMethods.loading = (message: string) => {
      baseToast({ 
        title: "Loading", 
        description: message 
      });
    };

    return toastWithMethods;
  }, [dispatch]);

  const dismiss = React.useCallback((toastId?: string) => {
    dispatch({ type: "DISMISS_TOAST", toastId });
  }, [dispatch]);

  return (
    <ToastContext.Provider value={{ toast, toasts: state.toasts, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

// Create a custom hook to use toast context
export function useToast() {
  const context = React.useContext(ToastContext);
  
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  
  return context;
}

// Export API type without circular references
export type ToastAPI = ReturnType<typeof useToast>;
export { type ToastActionElement, type ToastProps };
