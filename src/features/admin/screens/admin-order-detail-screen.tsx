import { useAdminOrdersQuery } from '../api/use-admin-orders-query';
import { OrderDetailScreen } from '../../orders/screens/order-detail-screen';

export function AdminOrderDetailScreen() {
  const ordersQuery = useAdminOrdersQuery();
  return (
    <OrderDetailScreen
      readOnly={false}
      orders={ordersQuery.data}
      isPending={ordersQuery.isPending}
    />
  );
}
