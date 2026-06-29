import { useAuthSessionQuery } from '../../auth/api/use-auth-session-query';
import { OrderDetailScreen } from '../../orders/screens/order-detail-screen';
import { useCustomerOrdersQuery } from '../api/use-customer-orders-query';

export function CustomerOrderDetailScreen() {
  const sessionQuery = useAuthSessionQuery();
  const userId = sessionQuery.data?.user.id;
  const ordersQuery = useCustomerOrdersQuery(userId);

  return (
    <OrderDetailScreen
      readOnly
      orders={ordersQuery.data}
      isPending={ordersQuery.isPending || sessionQuery.isPending}
      isError={ordersQuery.isError}
      onRetry={() => void ordersQuery.refetch()}
    />
  );
}
