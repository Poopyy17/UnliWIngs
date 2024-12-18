import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrderTimer } from './OrderTimer';
import { cn } from '@/lib/utils';
import { getStatusColorHex } from '@/utils/colors';

const OrderStatus = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  COMPLETED: 'completed',
  PAID: 'paid',
  ACCEPTED: 'accepted',
  FLAVOR_PENDING: 'flavor_pending',
  FLAVOR_ACCEPTED: 'flavor_accepted',
  FLAVOR_COMPLETED: 'flavor_completed',
};

const StatusFlow = {
  [OrderStatus.PENDING]: {
    next: OrderStatus.ACCEPTED,
    buttonText: 'Accept Order',
    buttonColor: 'default',
  },
  [OrderStatus.ACCEPTED]: {
    next: OrderStatus.PREPARING,
    buttonText: 'Mark as Preparing',
    buttonColor: 'default',
  },
  [OrderStatus.PREPARING]: {
    next: OrderStatus.COMPLETED,
    buttonText: 'Mark as Complete',
    buttonColor: 'default',
  },
  [OrderStatus.COMPLETED]: {
    next: OrderStatus.PAID,
    buttonText: 'Process Payment',
    buttonColor: 'default',
    requiresReceipt: true,
  },
};

const ReceiptBadge = ({ receiptNumber }) =>
  receiptNumber ? (
    <Badge className="bg-blue-500 ml-2">Receipt #{receiptNumber}</Badge>
  ) : null;

const OrdersList = ({
  orders = [], // Add default empty array
  onStatusUpdate,
  onPayment,
  className,
  isPaymentView,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Group orders by table for payment view
  const groupedByTable =
    isPaymentView && Array.isArray(orders) && orders.length > 0
      ? orders.reduce((acc, order) => {
          if (!order?.tableNumber || !order?._id) return acc; // Skip invalid orders

          const key = order.tableNumber;
          if (!acc[key]) {
            acc[key] = {
              tableNumber: order.tableNumber,
              orders: [],
              total: 0,
              receiptNumber: order.receiptNumber,
            };
          }
          acc[key].orders.push(order);
          // Calculate total including all orders
          acc[key].total = acc[key].orders.reduce((sum, order) => {
            if (!order?.items) return sum; // Skip if no items
            return (
              sum +
              order.items.reduce((itemSum, item) => {
                if (!item) return itemSum; // Skip invalid items
                if (item.isUnliwings) {
                  return item.flavorHistory?.length > 0
                    ? itemSum
                    : itemSum +
                        item.price * (item.originalQuantity || item.quantity);
                }
                return itemSum + item.price * item.quantity;
              }, 0)
            );
          }, 0);
          return acc;
        }, {})
      : {};

  // Render payment view for completed orders
  const renderPaymentView = () => (
    <div className="grid gap-4">
      {Object.values(groupedByTable).map((table) => (
        <Card key={table.tableNumber} className="overflow-hidden">
          <div className="border-l-4 border-green-500 px-4 py-3">
            {/* Table Header */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Table {table.tableNumber}</h3>
                  <Badge className="bg-green-500">Ready for Payment</Badge>
                  <ReceiptBadge receiptNumber={table.receiptNumber} />
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">₱{table.total.toFixed(2)}</p>
              </div>
            </div>

            {/* Orders List */}
            <div className="mt-4 space-y-4">
              {table.orders.map((order) => (
                <div key={order._id} className="border-b last:border-0 pb-4">
                  <p className="text-sm font-medium mb-2">
                    Order #{order?._id ? order._id.slice(-4) : 'N/A'}
                  </p>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="ml-4 text-sm">
                      <div className="flex justify-between">
                        <span>
                          {item.name} x{' '}
                          {item.isUnliwings
                            ? item.originalQuantity || item.quantity
                            : item.quantity}
                        </span>
                        <span>
                          ₱
                          {(item.isUnliwings && item.flavorHistory?.length > 0
                            ? 0
                            : item.price *
                              (item.isUnliwings
                                ? item.originalQuantity || item.quantity
                                : item.quantity)
                          ).toFixed(2)}
                        </span>
                      </div>
                      {item.isUnliwings && (
                        <div className="text-xs text-muted-foreground">
                          <div>Current: {item.selectedFlavors?.join(', ')}</div>
                          {item.flavorHistory?.map((flavors, i) => (
                            <div key={i}>
                              Re-order #{i + 1}: {flavors.join(', ')}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Payment Button */}
            <div className="mt-4">
              <Button
                onClick={() => {
                  const orderId = table.orders[0]?._id;
                  if (orderId) {
                    onPayment(orderId);
                  }
                }}
                variant="outline"
                className="w-full hover:bg-green-50"
              >
                Process Payment (₱{table.total.toFixed(2)})
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  // Render regular view for active orders
  const renderRegularView = () => (
    <div className="grid gap-4">
      {orders
        .filter((order) =>
          order.tableNumber.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map((order) => (
          <Card key={order._id} className="overflow-hidden">
            <div
              className="border-l-4 px-4 py-3"
              style={{ borderColor: getStatusColorHex(order.status) }}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Table {order.tableNumber}</h3>
                    <Badge className={`bg-${getStatusColorHex(order.status)}`}>
                      {order.status}
                    </Badge>
                    <OrderTimer
                      startTime={order.createdAt}
                      status={order.status}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">₱{order.total.toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div className="flex flex-col">
                      <span>
                        {item.name} x{' '}
                        {item.isUnliwings
                          ? item.originalQuantity || item.quantity
                          : item.quantity}
                      </span>
                      {item.isUnliwings && (
                        <div className="text-xs text-muted-foreground ml-4">
                          <div>Current: {item.selectedFlavors?.join(', ')}</div>
                          {item.flavorHistory?.map((flavors, i) => (
                            <div key={i}>
                              Re-order #{i + 1}: {flavors.join(', ')}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span>
                      ₱
                      {(item.isUnliwings && item.flavorHistory?.length > 0
                        ? 0
                        : item.price *
                          (item.isUnliwings
                            ? item.originalQuantity || item.quantity
                            : item.quantity)
                      ).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {order.status !== OrderStatus.PAID &&
                StatusFlow[order.status] && (
                  <div className="mt-4">
                    <Button
                      onClick={() =>
                        onStatusUpdate(order._id, StatusFlow[order.status].next)
                      }
                      variant="outline"
                      className="hover:bg-blue-50"
                    >
                      {StatusFlow[order.status].buttonText}
                    </Button>
                  </div>
                )}
            </div>
          </Card>
        ))}
    </div>
  );

  return (
    <div className={cn('space-y-4', className)}>
      {!isPaymentView && (
        <Input
          placeholder="Search by table number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs mb-4"
        />
      )}
      {isPaymentView ? renderPaymentView() : renderRegularView()}
    </div>
  );
};

export default OrdersList;
