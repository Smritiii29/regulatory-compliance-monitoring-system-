import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Mail, AlertCircle, User, Building2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const GOOGLE_CLIENT_ID = '709059851452-emt377jvn4338tucp6lrm4orpjs9lsss.apps.googleusercontent.com';

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BIOMEDICAL', 'MTECH CSE'];
const ROLES = [
  { value: 'faculty', label: 'Faculty' },
  { value: 'hod', label: 'Head of Department' },
  { value: 'principal', label: 'Principal' },
  { value: 'admin', label: 'Admin' },
];

// Google Identity Services types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement | null, config: any) => void;
          prompt: () => void;
          revoke: (email: string, callback: () => void) => void;
        };
      };
    };
  }
}

type Step = 'google' | 'form' | 'otp';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('faculty');
  const [department, setDepartment] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('google');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const needsDepartment = role === 'hod' || role === 'faculty';

  // Stable callback ref so GIS always calls the latest version
  const googleCallbackRef = useRef<(response: any) => void>();
  googleCallbackRef.current = async (response: { credential: string }) => {
    setError('');
    setIsLoading(true);
    try {
      const result = await authAPI.verifyGoogleToken(response.credential);
      setEmail(result.email);
      setName(result.name || '');
      setStep('form');
    } catch (err: any) {
      setError(err.message || 'Failed to verify Google account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load Google Identity Services script
  useEffect(() => {
    const initGIS = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res: any) => googleCallbackRef.current?.(res),
        auto_select: false,
        context: 'signup',
      });
      setGoogleLoaded(true);
    };

    if (window.google?.accounts?.id) {
      initGIS();
      return;
    }

    // Check if script tag already exists (e.g. from HMR)
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', initGIS);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGIS;
    script.onerror = () => setError('Failed to load Google Sign-In. Please refresh the page.');
    document.head.appendChild(script);
  }, []);

  // Render GIS button whenever the ref or loaded-state changes
  useEffect(() => {
    if (googleLoaded && googleBtnRef.current && step === 'google') {
      window.google?.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signup_with',
        shape: 'rectangular',
        width: 380,
        logo_alignment: 'left',
      });
    }
  }, [googleLoaded, step]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) { setError('Name is required'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (needsDepartment && !department) { setError('Please select a department'); return; }

    setOtpSending(true);
    try {
      await authAPI.sendOtp(email, name);
      setStep('otp');
      setSuccess('A 6-digit OTP has been sent to your Gmail.');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (otp.length !== 6) { setError('Please enter the 6-digit OTP'); return; }

    setIsLoading(true);
    try {
      const otpResult = await authAPI.verifyOtp(email, otp);
      if (!otpResult.verified) {
        setError('Invalid or expired OTP');
        setIsLoading(false);
        return;
      }

      const signupSuccess = await signup({ name, email, password, role, department });
      if (signupSuccess) {
        navigate('/dashboard');
      } else {
        setError('Registration failed. Email may already be in use.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccess('');
    setOtpSending(true);
    try {
      await authAPI.sendOtp(email, name);
      setSuccess('New OTP sent to your email.');
      setOtp('');
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setOtpSending(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    google: 'Create Account',
    form: 'Complete Your Profile',
    otp: 'Verify Email',
  };
  const stepDescriptions: Record<Step, string> = {
    google: 'Select your Google account to get started',
    form: `Signed in as ${email}`,
    otp: `Enter the OTP sent to ${email}`,
  };

  // Step indicator dots
  const steps: Step[] = ['google', 'form', 'otp'];
  const currentIdx = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <Card className="border-border/50 shadow-card">
          <CardHeader className="space-y-1 pb-6 text-center">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-3">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i <= currentIdx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-10 h-0.5 ${i < currentIdx ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              ))}
            </div>
            <CardTitle className="text-2xl font-semibold">{stepTitles[step]}</CardTitle>
            <CardDescription>{stepDescriptions[step]}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="animate-fade-in mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="animate-fade-in mb-4 border-green-300 bg-green-50 text-green-800">
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* ── Step 1: Google Account Picker ──────────────────── */}
            {step === 'google' && (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 py-4">
                  <div ref={googleBtnRef} className="flex justify-center" />
                  {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Verifying your Google account...
                    </div>
                  )}
                  {!googleLoaded && !error && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                      Loading Google Sign-In...
                    </div>
                  )}
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  <p>Select your Google account to begin registration.</p>
                  <p className="mt-1 text-xs">An OTP will be sent to your Gmail for verification.</p>
                </div>
              </div>
            )}

            {/* ── Step 2: Profile Details ────────────────────────── */}
            {step === 'form' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Google Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" value={email} className="pl-10 bg-muted/50 cursor-not-allowed" readOnly />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="name" placeholder="Dr. John Doe" value={name}
                      onChange={(e) => setName(e.target.value)} className="pl-10" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select value={department} onValueChange={setDepartment} disabled={!needsDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder={needsDepartment ? 'Select...' : 'N/A'} />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="At least 6 characters" value={password}
                      onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="confirmPassword" type="password" placeholder="Re-enter password" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={otpSending}>
                  {otpSending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Sending OTP...
                    </span>
                  ) : 'Continue — Send OTP'}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep('google'); setError(''); setSuccess(''); setEmail(''); setName(''); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Use a different Google account
                </button>
              </form>
            )}

            {/* ── Step 3: OTP Verification ───────────────────────── */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyAndSignup} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter 6-digit OTP</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otp"
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="pl-10 text-center text-xl tracking-widest font-mono"
                      maxLength={6}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : 'Verify & Create Account'}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setStep('form'); setOtp(''); setError(''); setSuccess(''); }}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpSending}
                    className="text-primary font-medium hover:underline disabled:opacity-50"
                  >
                    {otpSending ? 'Sending...' : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">Sign In</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
