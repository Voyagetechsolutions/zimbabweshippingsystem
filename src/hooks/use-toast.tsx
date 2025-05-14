
import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1000000;

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

function useToast() {
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
    const baseToast = (props: ToastProps) => {
      const id = genId();

      const update = (props: ToastProps) =>
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
    baseToast.error = (message: string) => {
      baseToast({ 
        title: "Error", 
        description: message, 
        variant: "destructive" 
      });
    };
    
    baseToast.success = (message: string) => {
      baseToast({ 
        title: "Success", 
        description: message 
      });
    };
    
    baseToast.loading = (message: string) => {
      baseToast({ 
        title: "Loading", 
        description: message 
      });
    };

    return baseToast;
  }, [dispatch]);

  return {
    toast,
    toasts: state.toasts,
    dismiss: React.useCallback(
      (toastId?: string) => {
        dispatch({ type: "DISMISS_TOAST", toastId });
      },
      [dispatch]
    ),
  };
}

export type { ToastActionElement, ToastProps };
export { useToast, toast };

export type ToastMethod = typeof useToast extends () => { toast: infer T } ? T : never;
export interface ToastAPI {
  toast: ToastMethod;
  toasts: ToasterToast[];
  dismiss: (toastId?: string) => void;
}

// For direct import - to allow consistent usage
const { toast } = useToast();
