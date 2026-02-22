import { useState } from 'react';
import { Bell, Upload, CheckCircle, AlertTriangle, Clock, X, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

type NotificationType = 'batch_complete' | 'batch_failed' | 'bulk_resolve' | 'bulk_assign' | 'ogs_alert' | 'rescreen';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

const typeIcon: Record<NotificationType, React.ReactNode> = {
  batch_complete: <Upload className="h-3.5 w-3.5 text-status-positive" />,
  batch_failed: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
  bulk_resolve: <CheckCircle className="h-3.5 w-3.5 text-primary" />,
  bulk_assign: <Layers className="h-3.5 w-3.5 text-primary" />,
  ogs_alert: <AlertTriangle className="h-3.5 w-3.5 text-status-possible" />,
  rescreen: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
};

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'batch_complete',
    title: 'Batch screening complete',
    description: '142 records screened — 23 matches found, 8 require review.',
    timestamp: '2 min ago',
    read: false,
  },
  {
    id: 'n2',
    type: 'bulk_resolve',
    title: 'Bulk resolution applied',
    description: '12 matches marked as False across 4 cases by Jane Doe.',
    timestamp: '18 min ago',
    read: false,
  },
  {
    id: 'n3',
    type: 'bulk_assign',
    title: 'Bulk assignment complete',
    description: '6 cases reassigned to Alex Turner.',
    timestamp: '1 hour ago',
    read: false,
  },
  {
    id: 'n4',
    type: 'ogs_alert',
    title: 'OGS alert — new matches',
    description: '3 new matches detected during ongoing screening for WL-2024005.',
    timestamp: '2 hours ago',
    read: true,
  },
  {
    id: 'n5',
    type: 'batch_failed',
    title: 'Batch screening failed',
    description: 'File "sanctions_batch_feb.csv" — 14 rows had invalid data and were skipped.',
    timestamp: '3 hours ago',
    read: true,
  },
  {
    id: 'n6',
    type: 'rescreen',
    title: 'Rescreen complete',
    description: 'Case WL-2024012 rescreened — 2 updated matches, 1 new match found.',
    timestamp: '5 hours ago',
    read: true,
  },
  {
    id: 'n7',
    type: 'bulk_resolve',
    title: 'Bulk resolution applied',
    description: '8 matches marked as Positive across 2 cases by Maria Lopez.',
    timestamp: 'Yesterday',
    read: true,
  },
  {
    id: 'n8',
    type: 'batch_complete',
    title: 'Batch screening complete',
    description: '89 records screened — 11 matches found, 3 require review.',
    timestamp: 'Yesterday',
    read: true,
  },
];

export function NotificationsDrawer() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 relative"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[380px] sm:w-[420px] p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" /> Notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{unreadCount} new</Badge>
                )}
              </SheetTitle>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={markAllRead}>
                  Mark all read
                </Button>
              )}
            </div>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-60px)]">
            <div className="divide-y">
              {notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">No notifications</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 flex gap-3 group transition-colors cursor-pointer hover:bg-muted/50 ${
                      !n.read ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => markRead(n.id)}
                  >
                    <div className="mt-0.5 shrink-0">{typeIcon[n.type]}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-medium ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {n.title}
                        </p>
                        <button
                          onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{n.description}</p>
                      <span className="text-[10px] text-muted-foreground/60 mt-1 block">{n.timestamp}</span>
                    </div>
                    {!n.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
