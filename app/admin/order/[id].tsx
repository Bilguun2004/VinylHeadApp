import { AdminRouteGuard } from '../../../src/features/auth/components/admin-route-guard';
import { AdminOrderDetailScreen } from '../../../src/features/admin/screens/admin-order-detail-screen';

export default function AdminOrderDetailRoute() {
  return (
    <AdminRouteGuard>
      <AdminOrderDetailScreen />
    </AdminRouteGuard>
  );
}
