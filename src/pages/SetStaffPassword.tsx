import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function SetStaffPassword() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!PASSWORD_RULE.test(password)) {
      toast({
        title: 'Choose a stronger password',
        description: 'Use at least 8 characters with uppercase, lowercase and a number.',
        variant: 'destructive',
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    setSaving(false);

    if (error) {
      toast({ title: 'Password could not be changed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Password changed', description: 'Your staff account is ready to use.' });
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Zimbabwe Shipping Staff</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Create your permanent password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The password you were given was temporary. Change it before accessing any staff or finance information.
          </p>
          {user?.email ? <p className="mt-3 text-sm font-medium text-slate-800">{user.email}</p> : null}
        </div>

        <form className="mt-7 space-y-5" onSubmit={save}>
          <div className="space-y-2">
            <Label htmlFor="new-staff-password">New password</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="new-staff-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="pl-9 pr-10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={saving}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-3 text-slate-500"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs leading-5 text-slate-500">8+ characters, including uppercase, lowercase and a number.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-staff-password">Confirm new password</Label>
            <Input
              id="confirm-staff-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={saving}
            />
          </div>

          <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Set password and continue
          </Button>
        </form>

        <Button variant="ghost" className="mt-3 w-full text-slate-500" onClick={() => void signOut()} disabled={saving}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </section>
    </main>
  );
}
