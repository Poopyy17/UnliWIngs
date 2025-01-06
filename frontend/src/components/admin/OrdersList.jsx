import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrderTimer } from './OrderTimer';
import { cn } from '@/lib/utils';

const OrderStatus = {
  PREPARING: 'preparing',
  ACCEPTED: 'accepted',
};

const StatusBadge = ({ status }) => {
  const colors = {
    preparing: 'bg-yellow-500',
    accepted: 'bg-green-500',
  };

  return (
    <Badge className={colors[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const OrdersList = ({
  orders = [],
  onStatusUpdate, // Now expects (tableNumber, orderNumber, itemId, status)
  onPayment,
  className,
  isPaymentView,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const renderOrderCard = (order, tableNumber) => (
    <Card key={order.orderNumber} className="mb-4 p-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">Order #{order.orderNumber}</span>
            <OrderTimer startTime={order.createdAt} />
          </div>

          {/* Order Items with individual status */}
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div
                // Create unique key combining order number, item id and index
                key={`${order.orderNumber}-${item._id || 'item'}-${idx}`}
                className="text-sm border-b pb-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span>
                      {item.name} x {item.quantity}
                      {item.isUnliwings && ' (Unliwings)'}
                    </span>
                    {item.isUnliwings && item.selectedFlavors?.length > 0 && (
                      <div className="text-xs text-muted-foreground ml-4">
                        Flavors: {item.selectedFlavors.join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                    <StatusBadge status={item.status} />
                    {item.status === 'preparing' && (
                      <Button
                        onClick={() =>
                          onStatusUpdate(
                            tableNumber,
                            order.orderNumber,
                            item._id,
                            'accepted'
                          )
                        }
                        size="sm"
                        variant="outline"
                      >
                        Accept
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Total */}
          <div className="pt-2 border-t mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Order Total:</span>
              <span className="font-bold">₱{order.orderTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  const renderTableCard = (tableOrder) => (
    <Card key={`table-${tableOrder.tableNumber}`} className="mb-6 p-4">
      <div className="border-b pb-4 mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">Table {tableOrder.tableNumber}</h3>
          <div className="flex items-center gap-4">
            <span className="font-bold">
              Total: ₱{tableOrder.grandTotal.toFixed(2)}
            </span>
            {!tableOrder.isPaid && (
              <Button
                onClick={() => onPayment(tableOrder.tableNumber)}
                variant="outline"
              >
                Process Payment
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {tableOrder.orders.map((order) =>
          renderOrderCard(order, tableOrder.tableNumber)
        )}
      </div>
    </Card>
  );

  const filteredOrders = orders.filter((order) =>
    order.tableNumber.toString().includes(searchQuery)
  );

  return (
    <div className={cn('space-y-4', className)}>
      <Input
        placeholder="Search by table number..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-xs mb-4"
      />

      <div className="space-y-6">{filteredOrders.map(renderTableCard)}</div>
    </div>
  );
};

export default OrdersList;
