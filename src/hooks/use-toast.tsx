
import * as React from "react";
import { useToast as useToastOriginal } from "@/components/ui/toast";

export type ToastProps = Parameters<typeof useToastOriginal["toast"]>[0];

export interface ToastMethod {
  (props: ToastProps): void;
  error: (message: string) => void;
  success: (message: string) => void;
  loading: (message: string) => void;
}

export interface ToastAPI {
  toast: ToastMethod;
}

export const useToast = (): ToastAPI => {
  const { toast: originalToast } = useToastOriginal();
  
  const toast = ((props: ToastProps) => {
    originalToast(props);
  }) as ToastMethod;
  
  toast.error = (message: string) => {
    originalToast({ 
      title: "Error", 
      description: message, 
      variant: "destructive" 
    });
  };
  
  toast.success = (message: string) => {
    originalToast({ 
      title: "Success", 
      description: message 
    });
  };
  
  toast.loading = (message: string) => {
    originalToast({ 
      title: "Loading", 
      description: message 
    });
  };
  
  return { toast };
};

export { toast } from "@/components/ui/toast";

export type { ToastAPI };
