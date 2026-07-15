import { AdminRouteGuard } from '../../src/features/auth/components/admin-route-guard';
import { AdminAddProductScreen } from '../../src/features/admin/screens/admin-add-product-screen';

export default function AdminAddProductRoute() {
  return (
    <AdminRouteGuard>
      <AdminAddProductScreen />
    </AdminRouteGuard>
  );
}
