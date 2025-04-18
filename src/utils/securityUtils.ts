
export const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting IP:', error);
    return 'unknown';
  }
};

export const handleAuthError = (error: any, toast: any) => {
  const message = error?.message || 'An unexpected error occurred';
  if (message.includes('too many failed attempts')) {
    toast({
      title: 'Account Protection',
      description: 'Too many failed attempts. Please try again later.',
      variant: 'destructive',
    });
  } else {
    toast({
      title: 'Authentication Error',
      description: message,
      variant: 'destructive',
    });
  }
};
