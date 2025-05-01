
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Logo from '@/components/Logo';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';
import { generateCSRFToken, validateCSRFToken } from '@/utils/csrf';
import { getClientIP, handleAuthError } from '@/utils/securityUtils';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [csrfToken, setCsrfToken] = useState('');
  const [ipAddress, setIpAddress] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { session, signIn } = useAuth();

  // Generate CSRF token and fetch client IP
  useEffect(() => {
    setCsrfToken(generateCSRFToken());
    const fetchIP = async () => {
      const ip = await getClientIP();
      setIpAddress(ip);
    };
    fetchIP();
  }, []);

  // Redirect user if they are already authenticated
  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  // Handle signup process
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !fullName) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields to sign up.',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Sign-up user in Supabase - use default Supabase email service
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            ip_address: ipAddress,
          },
          emailRedirectTo: window.location.origin + '/auth/callback',
        },
      });

      if (error) throw error;

      toast({
        title: 'Registration Successful',
        description: 'Please check your email to verify your account.',
      });
      setActiveTab('login');
    } catch (error: any) {
      handleAuthError(error, toast);
    } finally {
      setLoading(false);
    }
  };

  // Handle sign-in process
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCSRFToken(csrfToken)) {
      // Invalid or expired CSRF token
      const newToken = generateCSRFToken();
      setCsrfToken(newToken);

      toast({
        title: 'Security Error',
        description: 'Please try submitting the form again.',
        variant: 'destructive',
      });
      return;
    }

    if (!email || !password) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both email and password.',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await signIn(email, password);

      if (response.error) {
        throw response.error;
      }

      // Navigation handled in useEffect after login
    } catch (error: any) {
      handleAuthError(error, toast);
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address to reset your password.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (error) throw error;

      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your email for a password reset link.',
      });
    } catch (error: any) {
      handleAuthError(error, toast);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo className="mx-auto h-12 w-auto" />
          <h1 className="mt-6 text-3xl font-bold">Welcome to Zimbabwe Shipping</h1>
          <p className="mt-2 text-gray-600">Sign in to your account or create a new one</p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <input type="hidden" name="csrf_token" value={csrfToken} />
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button 
                      type="button"
                      onClick={handlePasswordReset}
                      className="text-sm text-zim-green hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-zim-green hover:bg-zim-green/90" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      className="pl-10"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Must be at least 8 characters with uppercase, lowercase, number, and symbol.
                  </p>
                </div>

                <Button type="submit" className="w-full bg-zim-green hover:bg-zim-green/90" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {activeTab === 'login' && (
            <div className="text-center mt-4 text-sm text-gray-600">
              <p>Don't have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => setActiveTab('register')} 
                  className="text-zim-green hover:underline"
                >
                  Sign up
                </button>
              </p>
            </div>
          )}
          {activeTab === 'register' && (
            <div className="text-center mt-4 text-sm text-gray-600">
              <p>Already have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => setActiveTab('login')} 
                  className="text-zim-green hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
