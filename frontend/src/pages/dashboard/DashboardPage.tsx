import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent } from '../../components/ui/Card';
import { LayoutDashboard, BookOpen, BarChart3, TrendingUp } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Xin chào, {user?.full_name || 'User'}
        </h1>
        <p className="text-neutral-500 mt-1">Chào mừng bạn đến với PhuPhatCorp Accounting</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <LayoutDashboard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900">0</p>
              <p className="text-sm text-neutral-500">Tổng số phiếu</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900">0</p>
              <p className="text-sm text-neutral-500">Sổ kế toán</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900">0</p>
              <p className="text-sm text-neutral-500">Báo cáo</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-neutral-600" />
            <h2 className="text-lg font-medium text-neutral-900">Thống kê nhanh</h2>
          </div>
          <p className="text-neutral-500 text-sm">
            Hệ thống đã sẵn sàng. Bắt đầu tạo phiếu kế toán đầu tiên của bạn.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
