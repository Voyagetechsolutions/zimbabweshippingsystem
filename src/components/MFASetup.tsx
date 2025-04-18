
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const MFASetup: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const generateMFASecret = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Generate new TOTP secret
        const { data, error } = await supabase.functions.invoke('generate-mfa-secret', {
          body: { userId: user.id },
        });

        if (error) throw error;
        
        setQrCode(data.qrCode);
        setSecret(data.secret);
      } catch (error: any) {
        console.error('Error generating MFA secret:', error);
        toast({
          title: 'MFA Setup Error',
          description: error.message || 'Failed to generate MFA secret. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    generateMFASecret();
  }, [user, toast]);

  const handleVerify = async () => {
    if (!verificationCode.trim() || !user || !secret) {
      toast({
        title: 'Verification Error',
        description: 'Please enter a valid verification code.',
        variant: 'destructive',
      });
      return;
    }

    setVerifying(true);
    try {
      // Verify the TOTP code
      const { data, error } = await supabase.functions.invoke('verify-mfa-code', {
        body: { 
          userId: user.id,
          secret: secret,
          token: verificationCode 
        },
      });

      if (error) throw error;
      
      if (data.verified) {
        // Enable MFA for the user
        const { error: enableError } = await supabase.functions.invoke('enable-mfa', {
          body: { 
            userId: user.id,
            secret: secret 
          },
        });

        if (enableError) throw enableError;
        
        setSetupComplete(true);
        toast({
          title: 'MFA Setup Complete',
          description: 'Multi-factor authentication has been successfully enabled for your account.',
        });
        
        if (onComplete) {
          onComplete();
        }
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
      setVerifying(false);
    }
  };

  const copyToClipboard = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      toast({
        title: 'Secret Copied',
        description: 'The secret key has been copied to your clipboard.',
      });
    }
  };

  if (setupComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
            MFA Setup Complete
          </CardTitle>
          <CardDescription>
            Multi-factor authentication has been successfully set up for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            You will now be asked for a verification code when signing in. Keep your authentication app safe as you'll need it to access your account.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={onComplete} 
            className="w-full bg-zim-green hover:bg-zim-green/90"
          >
            Continue
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set Up Multi-Factor Authentication</CardTitle>
        <CardDescription>
          Enhance your account security by setting up multi-factor authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-zim-green" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>1. Scan this QR code with your authenticator app</Label>
              {qrCode ? (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img 
                    src={qrCode} 
                    alt="QR Code for MFA setup" 
                    className="w-48 h-48"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>2. Or enter this setup key manually</Label>
              <div className="flex">
                <Input 
                  type="text" 
                  value={secret || ''} 
                  readOnly 
                  className="font-mono"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  onClick={copyToClipboard}
                  className="ml-2"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="verificationCode">3. Enter verification code from your app</Label>
              <Input
                id="verificationCode"
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
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onComplete}
          disabled={loading || verifying}
        >
          Skip for now
        </Button>
        <Button 
          onClick={handleVerify} 
          disabled={loading || verifying || !qrCode || verificationCode.length !== 6}
          className="bg-zim-green hover:bg-zim-green/90"
        >
          {verifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify & Enable'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MFASetup;
