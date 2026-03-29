import { useTranslation } from 'react-i18next';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type ActivityType = 'create' | 'update' | 'delete' | 'login';

interface ActivityConfig {
  id: string;
  activityKey: string;
  type: ActivityType;
}

const activities: ActivityConfig[] = [
  { id: '1', activityKey: 'dashboard.recentActivity.activity1', type: 'create' },
  { id: '2', activityKey: 'dashboard.recentActivity.activity2', type: 'update' },
  { id: '3', activityKey: 'dashboard.recentActivity.activity3', type: 'login' },
  { id: '4', activityKey: 'dashboard.recentActivity.activity4', type: 'delete' },
  { id: '5', activityKey: 'dashboard.recentActivity.activity5', type: 'update' },
];

const typeColors: Record<ActivityType, { bg: string; text: string; labelKey: string }> = {
  create: { bg: 'bg-primary/10', text: 'text-primary', labelKey: 'dashboard.recentActivity.actionTypes.create' },
  update: { bg: 'bg-info/10', text: 'text-info', labelKey: 'dashboard.recentActivity.actionTypes.update' },
  delete: { bg: 'bg-destructive/10', text: 'text-destructive', labelKey: 'dashboard.recentActivity.actionTypes.delete' },
  login: { bg: 'bg-muted', text: 'text-muted-foreground', labelKey: 'dashboard.recentActivity.actionTypes.login' },
};

export default function RecentActivity() {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="size-5" />
          {t('dashboard.recentActivity.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {activities.map((activity) => {
            const colors = typeColors[activity.type];
            const userName = t(`${activity.activityKey}.user`);
            const target = t(`${activity.activityKey}.target`);
            const time = t(`${activity.activityKey}.time`);
            return (
              <div
                key={activity.id}
                className="flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
              >
                <Avatar className="size-10 shrink-0 mt-0.5">
                  <AvatarFallback className="bg-muted text-sm font-semibold">
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-base">
                    <span className="font-semibold text-foreground">{userName}</span>
                    {' — '}
                    <span className="text-muted-foreground">{target}</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={`px-2.5 py-0.5 ${colors.bg} ${colors.text} border-0 text-sm font-medium`}
                    >
                      {t(colors.labelKey)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
