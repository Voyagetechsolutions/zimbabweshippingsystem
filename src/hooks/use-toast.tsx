
// Re-export the same toast hooks to make it available for both UI and utilities
export { useToast, toast } from '@/components/ui/use-toast';
export type ToastAPI = ReturnType<typeof useToast>;
