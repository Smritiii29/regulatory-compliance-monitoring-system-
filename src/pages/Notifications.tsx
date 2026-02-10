import { useState } from 'react';
import { notifications, Notification } from '@/data/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Bell, FileText, AlertTriangle, Settings, CheckCircle2, Mail, Filter, Clock, Shield } from 'lucide-react';

const typeConfig = {
  document: { icon: FileText, color: 'bg-primary/10 text-primary', label: 'Document Updates' },
  compliance: { icon: Clock, color: 'bg-warning/10 text-warning', label: 'Compliance Deadlines' },
  system: { icon: Settings, color: 'bg-muted text-muted-foreground', label: 'System' },
  alert: { icon: AlertTriangle, color: 'bg-destructive/10 text-destructive', label: 'Risk Alerts' },
};

const Notifications = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [readStatus, setReadStatus] = useState<Record<string, boolean>>(
    Object.fromEntries(notifications.map(n => [n.id, n.isRead]))
  );

  const unreadCount = Object.values(readStatus).filter(r => !r).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !readStatus[n.id];
    return n.type === activeTab;
  });

  const groupedByType = {
    document: notifications.filter(n => n.type === 'document'),
    compliance: notifications.filter(n => n.type === 'compliance'),
    alert: notifications.filter(n => n.type === 'alert'),
    system: notifications.filter(n => n.type === 'system'),
  };

  const markAsRead = (id: string) => {
    setReadStatus(prev => ({ ...prev, [id]: true }));
  };

  const markAllAsRead = () => {
    setReadStatus(Object.fromEntries(notifications.map(n => [n.id, true])));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Email Notice */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="shadow-card border-info/30 bg-info/5 cursor-help">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-info" />
                <p className="text-sm">
                  <strong>Email Notifications:</strong> All alerts are automatically sent to authorized users via email.
                </p>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          <p>Email alerts are automatically sent to authorized users based on their role and department assignments.</p>
        </TooltipContent>
      </Tooltip>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {Object.entries(groupedByType).map(([type, items]) => {
          const config = typeConfig[type as keyof typeof typeConfig];
          const Icon = config.icon;
          const unread = items.filter(i => !readStatus[i.id]).length;
          return (
            <Card 
              key={type} 
              className={`shadow-card cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
                activeTab === type ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setActiveTab(type)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{items.length}</p>
                    {unread > 0 && (
                      <Badge variant="status" className="animate-pulse">{unread} new</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{config.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            <Bell className="w-4 h-4 mr-2" />
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            <Filter className="w-4 h-4 mr-2" />
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="document">Documents</TabsTrigger>
          <TabsTrigger value="compliance">Deadlines</TabsTrigger>
          <TabsTrigger value="alert">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {activeTab === 'all' ? 'All Notifications' : 
                 activeTab === 'unread' ? 'Unread Notifications' :
                 typeConfig[activeTab as keyof typeof typeConfig]?.label || 'Notifications'}
              </CardTitle>
              <CardDescription>Recent activity and system alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No notifications in this category
                  </div>
                ) : (
                  filteredNotifications.map((notification) => {
                    const config = typeConfig[notification.type];
                    const Icon = config.icon;
                    const isUnread = !readStatus[notification.id];
                    return (
                      <div
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                          isUnread 
                            ? 'bg-secondary/30 border-primary/20 hover:bg-secondary/50' 
                            : 'bg-card hover:bg-secondary/20'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{notification.title}</p>
                              {isUnread && (
                                <Badge variant="status" className="animate-pulse">New</Badge>
                              )}
                              {notification.role && (
                                <Badge variant="secondary" className="text-xs">{notification.role}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(notification.createdAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground py-4">
        <p className="flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          Notification history preserved for audit compliance
        </p>
      </div>
    </div>
  );
};

export default Notifications;
