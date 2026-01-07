import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, Check, X, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains letters', test: (p) => /[a-zA-Z]/.test(p) },
  { label: 'Contains numbers', test: (p) => /[0-9]/.test(p) },
];

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: 'bg-muted', width: '0%' };
  
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (password.length >= 10 && hasLetters && hasNumbers && hasSpecial) {
    return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  }
  if (password.length >= 8 && hasLetters && hasNumbers) {
    return { label: 'Medium', color: 'bg-orange-500', width: '66%' };
  }
  if (password.length >= 6) {
    return { label: 'Weak', color: 'bg-red-500', width: '33%' };
  }
  return { label: 'Too short', color: 'bg-red-500', width: '15%' };
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, role, profile } = useAuth();
  
  const isMandatory = location.state?.mandatory || false;
  const isFirstLogin = location.state?.firstLogin || false;
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const allRequirementsMet = passwordRequirements.every(req => req.test(newPassword));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!allRequirementsMet) {
      toast({
        title: 'Password Requirements Not Met',
        description: 'Please ensure your password meets all requirements.',
        variant: 'destructive',
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: 'Passwords Do Not Match',
        description: 'Please make sure both passwords are the same.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword === currentPassword) {
      toast({
        title: 'Invalid Password',
        description: 'New password must be different from your current password.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Update profile to mark password as changed
      if (user) {
        await supabase
          .from('profiles')
          .update({
            password_changed_at: new Date().toISOString(),
            temp_password: null, // Clear temp password
          })
          .eq('id', user.id);
      }

      toast({
        title: 'Password Changed Successfully',
        description: 'Your new password has been saved.',
      });

      // Redirect based on role
      if (role === 'teacher') {
        navigate('/teacher', { replace: true });
      } else if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (error: any) {
      console.error('Password change error:', error);
      toast({
        title: 'Error Changing Password',
        description: error.message || 'Failed to change password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold">Change Your Password</h1>
          <p className="text-muted-foreground">
            {isFirstLogin 
              ? 'For security, please create a new password for your account.'
              : 'Enter your current password and choose a new one.'}
          </p>
        </div>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    className="pl-10 pr-10"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    className="pl-10 pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                
                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="space-y-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Password strength: <span className="font-medium">{passwordStrength.label}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    className="pl-10 pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Requirements Checklist */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Requirements:</p>
                {passwordRequirements.map((req, i) => {
                  const passed = req.test(newPassword);
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {passed ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className={passed ? 'text-green-600' : 'text-muted-foreground'}>
                        {req.label}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 text-sm">
                  {passwordsMatch ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className={passwordsMatch ? 'text-green-600' : 'text-muted-foreground'}>
                    Passwords match
                  </span>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || !allRequirementsMet || !passwordsMatch || !currentPassword}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>

              {!isMandatory && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}