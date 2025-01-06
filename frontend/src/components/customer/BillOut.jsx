import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useOrder } from '../../../context/orderContext';
import { motion } from 'framer-motion';
import { Loader2, Receipt, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getOrder, generateReceipt } from '../../services/api';

const OrderStatus = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  COMPLETED: 'completed',
  PAID: 'paid',
};

const ORDER_TYPES = {
  UNLIWINGS: 'unliwings',
  REGULAR: 'regular',
  REORDER: 'reorder',
};

const StatusBadge = ({ status }) => {
  const getStatusColor = () => {
    const colors = {
      [OrderStatus.PENDING]: 'bg-yellow-500',
      [OrderStatus.PREPARING]: 'bg-blue-500',
      [OrderStatus.COMPLETED]: 'bg-green-500',
      [OrderStatus.PAID]: 'bg-green-700',
    };
    return colors[status] || 'bg-gray-500';
  };

  return <Badge className={`${getStatusColor()} capitalize`}>{status}</Badge>;
};

const BillOut = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatch } = useOrder();
  const { tableNumber, orderId } = location.state || {};

  const [isLoading, setIsLoading] = useState(false);

  const [orderState, setOrderState] = useState({
    items: [],
    total: 0,
    status: 'preparing',
    receiptNumber: null,
  });

  const calculateTotal = () => {
    const items = orderState.items || [];

    // Find if there's an initial unliwings order
    const hasInitialUnliwings = items.some(
      (item) => item.isUnliwings && item.orderSequence === 1
    );

    return items.reduce((total, item) => {
      // Skip charging for unliwings reorders if initial order exists
      if (item.isUnliwings && hasInitialUnliwings && item.orderSequence > 1) {
        return total;
      }
      return total + item.price * item.quantity;
    }, 0);
  };

  const calculateItemTotal = (item) => {
    // Check for initial unliwings order
    const hasInitialUnliwings = orderState.items.some(
      (i) => i.isUnliwings && i.orderSequence === 1
    );

    // Make reorders free if there's an initial order
    if (item.isUnliwings && hasInitialUnliwings && item.orderSequence > 1) {
      return 0;
    }
    return item.price * item.quantity;
  };

  const calculateGrandTotal = () => {
    const items = orderState.items || [];

    // Get initial unliwings total
    const initialUnliwingsTotal = items
      .filter((item) => item.isUnliwings && item.orderSequence === 1)
      .reduce((total, item) => total + item.price * item.quantity, 0);

    // Get regular orders total
    const regularOrdersTotal = items
      .filter((item) => !item.isUnliwings)
      .reduce((total, item) => total + item.price * item.quantity, 0);

    return initialUnliwingsTotal + regularOrdersTotal;
  };

  const mergeOrderItems = (existingItems, newItems) => {
    const merged = [...existingItems];
    newItems.forEach((newItem) => {
      const existingIndex = merged.findIndex(
        (item) =>
          item.id === newItem.id && item.orderSequence === newItem.orderSequence
      );
      if (existingIndex === -1) {
        merged.push(newItem);
      }
    });
    return merged;
  };

  const showGenerateReceiptButton =
    !orderState.receiptNumber && orderState.status !== OrderStatus.PAID;

  const showProceedToCounter =
    orderState.receiptNumber && orderState.status !== OrderStatus.PAID;

  const groupOrders = (items) => {
    return items.reduce((acc, item) => {
      // Create unique key for each order sequence
      const orderKey = `${item.orderSequence || 1}-${
        item.isUnliwings ? 'unli' : 'reg'
      }`;

      if (!acc[orderKey]) {
        acc[orderKey] = {
          sequence: item.orderSequence || 1,
          timestamp: item.timestamp || Date.now(),
          items: [],
          type: item.isUnliwings
            ? item.orderSequence > 1
              ? 'reorder'
              : 'unliwings'
            : 'regular',
          total: 0,
          flavorHistory: item.flavorHistory || [],
        };
      }

      // Only add if not already in group
      const itemExists = acc[orderKey].items.some(
        (existing) => existing.id === item.id
      );

      if (!itemExists) {
        acc[orderKey].items.push(item);
        acc[orderKey].total += calculateItemTotal(item);
      }

      return acc;
    }, {});
  };

  const sortOrders = (orders) => {
    return Object.entries(orders)
      .sort(([keyA], [keyB]) => {
        const [seqA] = keyA.split('-');
        const [seqB] = keyB.split('-');
        return parseInt(seqA) - parseInt(seqB);
      })
      .map(([key, order]) => ({
        id: key,
        ...order,
      }));
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderStatus = async () => {
      try {
        setIsLoading(true);
        const order = await getOrder(orderId);

        if (!order) {
          throw new Error('Order not found');
        }

        const items =
          order.orders?.flatMap((orderItem) =>
            orderItem.items?.map((item) => ({
              ...item,
              id: item._id,
              orderSequence: item.orderSequence || 1,
              timestamp: orderItem.createdAt || Date.now(),
              orderType: item.isUnliwings
                ? item.orderSequence > 1
                  ? 'reorder'
                  : 'unliwings'
                : 'regular',
              tableNumber: order.tableNumber,
            }))
          ) || [];

        setOrderState((prev) => ({
          ...prev,
          items,
          status: order.status,
          receiptNumber: order.receiptNumber || null,
          total: calculateTotal(items), // Use updated calculateTotal here
          tableNumber: order.tableNumber,
        }));
      } catch (error) {
        console.error('Fetch error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to fetch order status',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderStatus();
  }, [orderId, toast]);

  const handleOrderAgain = () => {
    const itemsToPass = orderState.items.map((item) => ({
      ...item,
      orderItemId: `${item.id}-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      ...(item.isUnliwings && {
        selectedFlavors: [],
        flavorHistory: [...(item.flavorHistory || []), item.selectedFlavors],
        flavorOrderStatus: 'flavor_pending',
        orderSequence: Number(item.orderSequence || 1) + 1,
        orderType: ORDER_TYPES.REORDER,
      }),
    }));

    navigate('/order', {
      state: {
        tableNumber,
        orderId,
        currentItems: itemsToPass,
      },
    });
  };

  const handlePayBill = async () => {
    try {
      setIsLoading(true);
      const cleanTableNumber = tableNumber?.toString().replace(/^Table-/, '');
      const total = calculateTotal(orderState.items);

      const receipt = await generateReceipt({
        tableNumber: cleanTableNumber,
        orderId,
        total, // Add total to payload
      });

      setOrderState((prev) => ({
        ...prev,
        receiptNumber: receipt.receiptNumber,
        status: 'completed',
      }));

      dispatch({
        type: 'CLEAR_TABLE',
        tableNumber: cleanTableNumber,
      });

      toast({
        title: 'Receipt Generated',
        description: `Receipt #${receipt.receiptNumber}. Please proceed to counter for payment.`,
      });
    } catch (error) {
      console.error('Receipt generation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate receipt',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="overflow-hidden shadow-lg">
            <div className="p-6 space-y-6">
              {/* Header Section */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  Wings Express
                </h2>
                <div className="text-sm text-muted-foreground">
                  <p>
                    Blk 20 Lot 2 Marcos Alvarez Avenue, Corner San Gregorio St.
                  </p>
                  <p>Las Piñas, 1747 Metro Manila</p>
                </div>
              </div>

              <Separator />

              {/* Order Details */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{formatDate()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Table:</span>
                  <span>{tableNumber}</span>
                </div>
                {orderState.status && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <StatusBadge status={orderState.status} />
                  </div>
                )}
              </div>

              <Separator />

              {/* Orders Section */}
              <div className="space-y-6">
                {/* Initial Unliwings Orders */}
                {orderState.items.some(
                  (item) => item.isUnliwings && item.orderSequence === 1
                ) && (
                  <div className="space-y-4">
                    {sortOrders(
                      groupOrders(
                        orderState.items.filter(
                          (item) => item.isUnliwings && item.orderSequence === 1
                        )
                      )
                    ).map((order) => (
                      <Card key={order.id} className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-bold text-lg">
                            Unliwings Order #{order.sequence}
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                              {new Date(order.timestamp).toLocaleTimeString()}
                            </span>
                          </h3>
                          <Badge variant="default">Initial Order</Badge>
                        </div>

                        {order.items.map((item, idx) => (
                          <div key={`${item.id}-${idx}`} className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div className="font-medium">
                                {item.name} (
                                {item.originalQuantity || item.quantity}{' '}
                                persons)
                              </div>
                              <div className="text-right">
                                <p>
                                  {item.quantity}x ₱{item.price.toFixed(2)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Total: ₱
                                  {(item.price * item.quantity).toFixed(2)}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2 text-sm pl-4">
                              <div className="flex justify-between">
                                <span>Selected Flavors:</span>
                                <span className="font-medium">
                                  {item.selectedFlavors?.join(', ')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}

                        <div className="flex justify-end pt-3 border-t mt-3">
                          <div className="font-medium">
                            Total: ₱{order.total.toFixed(2)}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Unliwings Reorders */}
                {orderState.items.some(
                  (item) => item.isUnliwings && item.orderSequence > 1
                ) && (
                  <div className="space-y-4">
                    {sortOrders(
                      groupOrders(
                        orderState.items.filter(
                          (item) => item.isUnliwings && item.orderSequence > 1
                        )
                      )
                    ).map((order) => (
                      <Card key={order.id} className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-bold text-lg">
                            Unliwings Re-orders
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                              {new Date(order.timestamp).toLocaleTimeString()}
                            </span>
                          </h3>
                          <Badge variant="secondary">Reorder (Free)</Badge>
                        </div>

                        {order.items.map((item, idx) => (
                          <div key={`${item.id}-${idx}`} className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div className="font-medium">
                                {item.name} (
                                {item.originalQuantity || item.quantity}{' '}
                                persons)
                              </div>
                              <div className="text-right">
                                <p>
                                  {item.quantity}x{' '}
                                  <span className="text-green-600">FREE</span>
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2 text-sm pl-4">
                              <div className="flex justify-between">
                                <span>Selected Flavors:</span>
                                <span className="font-medium">
                                  {item.selectedFlavors?.join(', ')}
                                </span>
                              </div>
                              {item.flavorHistory?.length > 0 && (
                                <div>
                                  <p>Previous Orders:</p>
                                  {item.flavorHistory.map((flavors, index) => (
                                    <p key={index} className="ml-2">
                                      #{index + 1}: {flavors.join(', ')}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        <div className="flex justify-end pt-3 border-t mt-3">
                          <div className="font-medium text-green-600">
                            Free Reorder
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Regular Orders */}
                {orderState.items.some((item) => !item.isUnliwings) && (
                  <div className="space-y-4">
                    {sortOrders(
                      groupOrders(
                        orderState.items.filter((item) => !item.isUnliwings)
                      )
                    ).map((order) => (
                      <Card key={order.id} className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-bold text-lg">
                            Regular Orders
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                              {new Date(order.timestamp).toLocaleTimeString()}
                            </span>
                          </h3>
                          <Badge variant="outline">
                            {order.items[0]?.originalOrderId
                              ? 'Additional Order'
                              : 'New Order'}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          {order.items.map((item, idx) => (
                            <div
                              key={`${item.id}-${idx}`}
                              className="grid grid-cols-3 text-sm gap-4 items-center"
                            >
                              <div className="col-span-2">
                                <div className="font-medium">{item.name}</div>
                                {item.selectedFlavors?.length > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Flavors: {item.selectedFlavors.join(', ')}
                                  </div>
                                )}
                              </div>
                              <div className="col-span-1 text-right">
                                <p>
                                  {item.quantity}x ₱{item.price.toFixed(2)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Total: ₱
                                  {(item.price * item.quantity).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}

                          <div className="flex justify-end pt-3 border-t mt-3">
                            <div className="font-medium">
                              Total: ₱{order.total.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Grand Total Section */}
              <div className="mt-8">
                <Separator className="mb-4" />
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold">Grand Total</h3>
                  </div>
                  <div className="text-2xl font-bold">
                    ₱{calculateGrandTotal().toFixed(2)}
                  </div>
                </div>
              </div>

              {showGenerateReceiptButton && (
                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    onClick={handleOrderAgain}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Order More
                  </Button>
                  <Button
                    onClick={handlePayBill}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Receipt className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? 'Generating...' : 'Generate Receipt'}
                  </Button>
                </div>
              )}

              {showProceedToCounter && (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="font-semibold text-green-600">
                      Receipt #{orderState.receiptNumber}
                    </p>
                    <p className="text-sm text-green-600">
                      Please proceed to the counter for payment
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleOrderAgain}
                    className="w-full"
                  >
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Order More Items
                  </Button>
                </div>
              )}

              {orderState.status === OrderStatus.PAID && (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="font-semibold text-green-600">
                      Payment Completed
                    </p>
                    <p className="text-sm text-green-600">
                      Thank you for dining with us!
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/')}
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    New Order
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default BillOut;
