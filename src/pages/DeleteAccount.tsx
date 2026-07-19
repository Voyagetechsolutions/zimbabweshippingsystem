import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, AlertTriangle, Mail, Shield, Clock, ChevronRight } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/pages/Footer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DeleteAccount() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteRequest = async () => {
    if (!user) {
      toast({
        title: "Not signed in",
        description: "Please sign in to request account deletion.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    setIsDeleting(true);
    try {
      // Insert deletion request into database
      const { error } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: user.id,
          email: user.email,
          status: 'pending',
          requested_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Deletion request submitted",
        description: "We've received your account deletion request. You'll receive a confirmation email within 48 hours.",
      });

      // Sign out the user
      await signOut();
      navigate('/');
    } catch (error: any) {
      console.error('Delete request error:', error);
      toast({
        title: "Request failed",
        description: error.message || "Failed to submit deletion request. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 pt-20 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
                <Trash2 className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Delete Your Account</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                We're sorry to see you go. Please read the information below before proceeding.
              </p>
            </div>

            {/* Warning Box */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6 mb-8">
              <div className="flex gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Important Information</h3>
                  <p className="text-muted-foreground">
                    Account deletion is permanent and cannot be undone. Please ensure you've downloaded any important documents or information before proceeding.
                  </p>
                </div>
              </div>
            </div>

            {/* What Gets Deleted */}
            <div className="bg-card border rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Trash2 className="w-6 h-6 text-destructive" />
                What Will Be Deleted
              </h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Your account credentials (email and password)</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Personal information (name, phone number, addresses)</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Saved delivery addresses</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Notification preferences</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Chat history with Zimmy (our AI assistant)</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>App access (you'll be signed out of all devices)</span>
                </li>
              </ul>
            </div>

            {/* What Gets Retained */}
            <div className="bg-card border rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                What Will Be Retained
              </h2>
              <p className="text-muted-foreground mb-4">
                For legal, tax, and business purposes, we must retain certain information:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Shipment records:</strong> Historical shipment data and tracking information (anonymized where possible)</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Invoices and payments:</strong> Financial records for tax and accounting purposes (retained for 7 years as required by UK law)</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Customer feedback:</strong> Reviews and ratings submitted (anonymized)</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Support tickets:</strong> Customer service interactions (anonymized after 2 years)</span>
                </li>
              </ul>
            </div>

            {/* Retention Period */}
            <div className="bg-card border rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-primary" />
                Retention Period
              </h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  <strong className="text-foreground">Immediate deletion:</strong> Account credentials, personal information, addresses, and preferences
                </p>
                <p>
                  <strong className="text-foreground">2 years:</strong> Support tickets and communications (anonymized after deletion)
                </p>
                <p>
                  <strong className="text-foreground">7 years:</strong> Financial records, invoices, and payment information (required by UK tax law)
                </p>
              </div>
            </div>

            {/* How to Request Deletion */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Mail className="w-6 h-6 text-primary" />
                How to Request Account Deletion
              </h2>
              
              {user ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    You're currently signed in as <strong className="text-foreground">{user.email}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    Click the button below to submit your account deletion request. We'll process it within 48 hours and send you a confirmation email.
                  </p>
                  <Button 
                    variant="destructive" 
                    size="lg"
                    onClick={() => setShowConfirmDialog(true)}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Request Account Deletion
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground mb-4">
                    To request account deletion, you can either:
                  </p>
                  <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                    <li>
                      <strong className="text-foreground">Sign in and submit a request:</strong>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="ml-3 mb-1"
                        onClick={() => navigate('/auth?redirect=/delete-account')}
                      >
                        Sign In
                      </Button>
                    </li>
                    <li>
                      <strong className="text-foreground">Email us directly:</strong> Send an email to{' '}
                      <a href="mailto:support@zimbabweshipping.com?subject=Account Deletion Request" className="text-primary hover:underline">
                        support@zimbabweshipping.com
                      </a>
                      {' '}with the subject "Account Deletion Request" from your registered email address
                    </li>
                    <li>
                      <strong className="text-foreground">WhatsApp:</strong> Message us on{' '}
                      <a href="https://wa.me/447584100552?text=I%20would%20like%20to%20delete%20my%20Zimbabwe%20Shipping%20account" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                        +44 7584 100552
                      </a>
                    </li>
                  </ol>
                  
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Note:</strong> We'll verify your identity before processing any deletion request to protect your account security.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Alternative Options */}
            <div className="bg-card border rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4">Before You Go...</h2>
              <p className="text-muted-foreground mb-4">
                If you're experiencing issues or have concerns, we'd love to help. Consider these alternatives:
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/support')}
                  className="justify-start h-auto py-4"
                >
                  <div className="text-left">
                    <div className="font-semibold mb-1">Contact Support</div>
                    <div className="text-sm text-muted-foreground">Get help with any issues</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/account')}
                  className="justify-start h-auto py-4"
                >
                  <div className="text-left">
                    <div className="font-semibold mb-1">Update Settings</div>
                    <div className="text-sm text-muted-foreground">Manage your preferences</div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Contact Information */}
            <div className="text-center text-muted-foreground">
              <p className="mb-2">
                Questions about account deletion?
              </p>
              <p>
                Email us at{' '}
                <a href="mailto:support@zimbabweshipping.com" className="text-primary hover:underline">
                  support@zimbabweshipping.com
                </a>
                {' '}or call{' '}
                <a href="tel:+447584100552" className="text-primary hover:underline">
                  +44 7584 100552
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This action cannot be undone. This will permanently delete your account and remove your personal data from our servers.</p>
              <p className="font-semibold text-foreground">Your shipment history and financial records will be retained as required by law.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequest}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Processing...' : 'Yes, delete my account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
