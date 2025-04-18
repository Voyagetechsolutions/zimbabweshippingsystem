
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MFAVerificationProps {
  userId: string;
  email: string;
  onVerified: () => void;
  onCancel: () => void;
}

const MFAVerification: React.FC<MFAVerificationProps> = ({ userId, email, onVerified, onCancel }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: 'Verification Error',
        description: 'Please enter a valid verification code.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Verify the TOTP code
      const { data, error } = await supabase.functions.invoke('verify-mfa-login', {
        body: { 
          userId,
          token: verificationCode 
        },
      });

      if (error) throw error;
      
      if (data.verified) {
        toast({
          title: 'Verification Successful',
          description: 'Your identity has been verified.',
        });
        onVerified();
      } else {
        toast({
          title: 'Invalid Code',
          description: 'The verification code you entered is incorrect. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error verifying MFA code:', error);
      toast({
        title: 'Verification Error',
        description: error.message || 'An error occurred during verification. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShieldCheck className="mr-2 h-5 w-5 text-zim-green" />
          Two-Factor Verification
        </CardTitle>
        <CardDescription>
          Enter the verification code from your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            A verification code has been generated for your account ({email}). Please enter the 6-digit code from your authenticator app to complete the sign-in process.
          </p>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
            placeholder="123456"
            maxLength={6}
            className="font-mono text-center text-lg tracking-widest"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleVerify} 
          disabled={loading || verificationCode.length !== 6}
          className="bg-zim-green hover:bg-zim-green/90"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MFAVerification;
