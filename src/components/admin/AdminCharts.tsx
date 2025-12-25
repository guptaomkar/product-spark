import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Zap } from 'lucide-react';

interface AdminChartsProps {
  trialUsers: number;
  subscribedUsers: number;
  totalCreditsUsed: number;
  totalCreditsRemaining: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))'];
const CREDIT_COLORS = ['hsl(142, 76%, 36%)', 'hsl(217, 91%, 60%)'];

export function AdminCharts({
  trialUsers,
  subscribedUsers,
  totalCreditsUsed,
  totalCreditsRemaining,
}: AdminChartsProps) {
  const userTypeData = [
    { name: 'Subscribed Users', value: subscribedUsers },
    { name: 'Trial Users', value: trialUsers },
  ];

  const creditsData = [
    { name: 'Credits Used', value: totalCreditsUsed },
    { name: 'Credits Remaining', value: totalCreditsRemaining },
  ];

  const renderLabel = ({ name, percent }: { name: string; percent: number }) => {
    return `${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 mb-8">
      {/* User Type Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-primary" />
            User Distribution
          </CardTitle>
          <CardDescription>Trial vs Subscribed users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={userTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{subscribedUsers}</p>
              <p className="text-xs text-muted-foreground">Subscribed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">{trialUsers}</p>
              <p className="text-xs text-muted-foreground">Trial</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credits Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-primary" />
            Platform Credits
          </CardTitle>
          <CardDescription>Total credits usage across all users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={creditsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {creditsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CREDIT_COLORS[index % CREDIT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{totalCreditsUsed}</p>
              <p className="text-xs text-muted-foreground">Used</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">{totalCreditsRemaining}</p>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
