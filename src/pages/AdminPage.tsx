import { Settings, Users, Shield, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const sections = [
  { icon: Users, title: 'User Management', desc: 'Manage users, roles, and permissions', status: 'Read-only' },
  { icon: Shield, title: 'Group Configuration', desc: 'Screening groups, OGS frequency, check types', status: 'Read-only' },
  { icon: Globe, title: 'System Settings', desc: 'API configuration, notifications, integrations', status: 'Read-only' },
  { icon: Settings, title: 'Audit Logs', desc: 'System-wide audit trail and activity logs', status: 'Read-only' },
];

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-xl font-bold flex items-center gap-2 mb-6"><Settings className="h-5 w-5 text-primary" /> Administration</h1>
      <div className="grid grid-cols-2 gap-4 max-w-3xl">
        {sections.map(s => (
          <Card key={s.title} className="opacity-75">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <s.icon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">{s.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">{s.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-6">
        Admin settings are read-only in this prototype.
      </p>
    </div>
  );
}
