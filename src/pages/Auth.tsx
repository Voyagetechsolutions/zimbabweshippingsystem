
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, ArrowRight, Truck } from 'lucide-react';
import Logo from '@/components/Logo';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const Auth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(!location.state?.signup);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    // Update form mode if navigated with state
    setIsLogin(!location.state?.signup);
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      if (isLogin) {
        await signIn(email, password);
        // Will redirect via RouteGuard
      } else {
        if (!fullName) {
          throw new Error('Please enter your full name');
        }
        await signUp(email, password, fullName);
        setIsLogin(true); // Switch to login after successful signup
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1 flex flex-col">
        <div className="flex justify-center mb-6">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        
        <div className="max-w-md w-full mx-auto mt-4 flex-1 flex flex-col justify-center">
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 text-center pb-2">
              <div className="flex justify-center mb-2">
                <div className="bg-zim-green/10 p-3 rounded-full">
                  <Truck className="h-6 w-6 text-zim-green" />
                </div>
              </div>
              <h1 className="text-2xl font-bold">
                {isLogin ? 'Welcome Back' : 'Join Us Today'}
              </h1>
              <p className="text-sm text-gray-500">
                {isLogin ? 'Sign in to access your account' : 'Create an account to get started'}
              </p>
            </CardHeader>
            
            <CardContent className="pt-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input 
                        id="fullName"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required={!isLogin}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input 
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {isLogin && (
                      <Link to="/forgot-password" className="text-xs text-zim-green hover:underline">
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input 
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                {isLogin && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="rememberMe" 
                      checked={rememberMe} 
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <label
                      htmlFor="rememberMe"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Remember me
                    </label>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full bg-zim-green hover:bg-zim-green/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      {isLogin ? 'Sign In' : 'Create Account'} 
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4 pt-0">
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">or</span>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                  <button 
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError('');
                    }}
                    className="ml-1 text-zim-green hover:text-zim-green/90 font-medium"
                  >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </div>
            </CardFooter>
          </Card>
          
          <p className="text-center mt-6 text-sm text-gray-500">
            By continuing, you agree to our <Link to="/terms" className="text-zim-green hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-zim-green hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
