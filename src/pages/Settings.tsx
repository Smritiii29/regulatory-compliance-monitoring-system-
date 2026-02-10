import { useAuth, getRoleLabel } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Bell,
  Shield,
  Users,
  Info,
  Mail,
  Upload,
  FileText,
  Calendar,
  CheckCircle2,
  Lock,
  Server,
} from 'lucide-react';

const Settings = () => {
  const { user, isAdmin } = useAuth();

  const rolePermissions = {
    admin: [
      'View all documents',
      'Upload new documents',
      'Update and version documents',
      'Archive documents',
      'View all compliance data',
      'Manage user access',
      'Generate reports',
    ],
    principal: [
      'View all documents',
      'Upload new documents',
      'Update and version documents',
      'Archive documents',
      'View institution-wide compliance',
      'Generate reports',
    ],
    hod: [
      'View all documents',
      'View department compliance data',
      'Submit department data',
      'Download documents',
    ],
    staff: [
      'View approved documents',
      'Download documents',
      'Submit assigned data forms',
    ],
  };

  const currentPermissions = user?.role ? rolePermissions[user.role] : [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, preferences, and view system information
        </p>
      </div>

      {/* Profile Settings */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-primary" />
            Profile Settings
          </CardTitle>
          <CardDescription>
            Your account information (read-only, managed by administrator)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Full Name</Label>
              <p className="font-medium">{user?.name}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Email Address</Label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Role</Label>
              <div className="flex items-center gap-2">
                <Badge variant="role">{user?.role && getRoleLabel(user.role)}</Badge>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Department</Label>
              <p className="font-medium">{user?.department}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Contact the System Administrator to update profile information.
          </p>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5 text-primary" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Configure email alerts for compliance activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Document Uploads</p>
                <p className="text-sm text-muted-foreground">
                  Notify when new documents are uploaded
                </p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Document Updates</p>
                <p className="text-sm text-muted-foreground">
                  Notify when documents are versioned or archived
                </p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="font-medium">Compliance Deadlines</p>
                <p className="text-sm text-muted-foreground">
                  Notify before submission deadlines
                </p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium">Overdue Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Notify for overdue compliance items
                </p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
          <p className="text-xs text-muted-foreground pt-4 border-t">
            Email notifications are sent to your registered email address automatically.
          </p>
        </CardContent>
      </Card>

      {/* Access & Security */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            Access & Security
          </CardTitle>
          <CardDescription>
            Authentication and session information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="w-5 h-5 text-primary" />
                <p className="font-medium">Authentication Method</p>
              </div>
              <p className="text-sm text-muted-foreground">
                JWT-based secure authentication
              </p>
              <Badge variant="success" className="mt-2">Secured</Badge>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <p className="font-medium">Session Status</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Active session · Token valid
              </p>
              <Badge variant="success" className="mt-2">Active</Badge>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-info/5 border border-info/30">
            <p className="text-sm text-info">
              <strong>Security Note:</strong> Sessions are managed server-side with JWT tokens. 
              For security concerns or password resets, contact the System Administrator.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Role Information */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-primary" />
            Role Information
          </CardTitle>
          <CardDescription>
            Your current role and associated permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{user?.role && getRoleLabel(user.role)}</p>
              <p className="text-sm text-muted-foreground">
                {isAdmin ? 'Administrative privileges' : 'Standard user privileges'}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              Permissions
            </Label>
            <ul className="grid gap-2 sm:grid-cols-2">
              {currentPermissions.map((permission, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  {permission}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="w-5 h-5 text-primary" />
            System Information
          </CardTitle>
          <CardDescription>
            Application version and environment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 rounded-lg border bg-card text-center">
              <Server className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Version</p>
              <p className="font-mono font-semibold">v1.0.0</p>
            </div>
            <div className="p-4 rounded-lg border bg-card text-center">
              <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Update</p>
              <p className="font-semibold">January 2024</p>
            </div>
            <div className="p-4 rounded-lg border bg-card text-center">
              <Shield className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Environment</p>
              <p className="font-semibold">Production</p>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-lg bg-secondary/50">
            <p className="text-sm text-muted-foreground">
              <strong>RCMS</strong> – Regulatory Compliance Monitoring System for SSN College of Engineering. 
              Built with secure backend integration (Django REST / FastAPI) and PostgreSQL database.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground py-4">
        <p>
          Settings are securely stored • Contact administrator for account changes
        </p>
      </div>
    </div>
  );
};

export default Settings;
