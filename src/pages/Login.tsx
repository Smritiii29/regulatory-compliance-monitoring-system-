import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Mail, AlertCircle, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import rcmsLogo from '@/assets/rcms-logo.png';
import systemBackground from '@/assets/system-background.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid credentials. Please contact your system administrator.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url(${systemBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border border-primary-foreground/20 rounded-full animate-pulse" />
          <div className="absolute bottom-40 right-10 w-96 h-96 border border-primary-foreground/20 rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 border border-primary-foreground/20 rounded-full" />
        </div>
        
        {/* System Identity - Centered Logo */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1">
          <img 
            src={rcmsLogo} 
            alt="RCMS" 
            className="w-72 h-72 object-contain mb-6 animate-fade-in"
          />
          <h1 className="text-2xl font-bold text-primary-foreground text-center leading-tight">
            Regulatory Compliance Monitoring System
          </h1>
          <p className="text-primary-foreground/80 text-center max-w-md mt-3 text-sm">
            A comprehensive platform for managing institutional compliance, accreditation readiness, and document governance for higher educational institutions.
          </p>
          <div className="flex items-center gap-6 text-primary-foreground/70 text-sm mt-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>NHERC Aligned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span>NAC Ready</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-primary-foreground/60 text-sm text-center">
          <p className="font-medium text-primary-foreground/80">SSN College of Engineering</p>
          <p className="mt-1">Autonomous Institution · Southern Region</p>
          <p className="mt-2 text-xs">Powered by secure institutional infrastructure</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-6">
            <div className="flex flex-col items-center gap-2">
              <img 
                src={rcmsLogo} 
                alt="RCMS" 
                className="w-40 h-40 object-contain"
              />
              <div className="text-center mt-2">
                <h1 className="text-base font-bold text-foreground leading-tight">Regulatory Compliance Monitoring System</h1>
                <p className="text-muted-foreground text-xs mt-1">SSN College of Engineering</p>
              </div>
            </div>
          </div>

          <Card className="border-border/50 shadow-card">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-semibold text-center">
                Institutional Login
              </CardTitle>
              <CardDescription className="text-center">
                Access restricted to authorized institutional users only
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="animate-fade-in">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Institutional Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@ssn.edu.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full transition-all hover:scale-[1.02] hover:shadow-lg"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  This system is for authorized personnel only. Unauthorized access attempts will be logged and may result in disciplinary action.
                </p>
              </div>

              {/* Demo Credentials */}
              <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
                <p className="text-xs font-medium text-secondary-foreground mb-2">Demo Credentials:</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>Admin:</strong> admin@college.edu.in / admin123</p>
                  <p><strong>Principal:</strong> principal@college.edu.in / principal123</p>
                  <p><strong>HOD:</strong> hod.cse@college.edu.in / hod123</p>
                  <p><strong>Staff:</strong> staff@college.edu.in / staff123</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            Need access? Contact your{' '}
            <span className="text-primary font-medium">System Administrator</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
