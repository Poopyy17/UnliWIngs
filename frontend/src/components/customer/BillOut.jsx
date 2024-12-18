import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { generateReceipt, getOrder } from '@/services/api';
import { useState, useEffect } from 'react';
import { useOrder } from '../../../context/orderContext';
import { motion } from 'framer-motion';
import { Loader2, Receipt, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const OrderStatus = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  COMPLETED: 'completed',
  PAID: 'paid',
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
  const {
    orderItems: initialItems,
    tableNumber,
    total: initialTotal,
    orderId,
  } = location.state || {};

  const [isLoading, setIsLoading] = useState(false);
  const [orderState, setOrderState] = useState({
    items: initialItems ? [...initialItems] : [],
    total: initialTotal || 0,
    status: null,
    receiptNumber: null,
  });

  const isUnliwingsItem = (item) => item.isUnliwings === true;

  const showGenerateReceiptButton =
    !orderState.receiptNumber && orderState.status !== OrderStatus.PAID;

  const showProceedToCounter =
    orderState.receiptNumber && orderState.status !== OrderStatus.PAID;

  const groupOrdersByNumber = (items) => {
    if (!items?.length) return [];

    // Group items by their timestamp
    const orderGroups = items.reduce((acc, item) => {
      const timestamp = item.timestamp?.toString() || Date.now().toString();

      if (!acc[timestamp]) {
        acc[timestamp] = {
          id: `order-${timestamp}`,
          items: [],
          orderNumber: Object.keys(acc).length + 1,
          timestamp: new Date(Number(timestamp)),
          total: 0,
        };
      }
      acc[timestamp].items.push(item);
      return acc;
    }, {});

    // Calculate total for each order group
    Object.values(orderGroups).forEach((group) => {
      group.total = group.items.reduce((sum, item) => {
        if (item.isUnliwings) {
          return item.flavorHistory?.length > 0
            ? sum
            : sum + item.price * (item.originalQuantity || item.quantity);
        }
        return sum + item.price * item.quantity;
      }, 0);
    });

    return Object.values(orderGroups).sort((a, b) => a.timestamp - b.timestamp);
  };

  const groupOrders = (items) => {
    if (!items) return {};

    const grouped = items.reduce((acc, item) => {
      if (item.isUnliwings) {
        // Handle Unliwings items
        if (!item.flavorHistory?.length) {
          // Initial order
          if (!acc.initial) acc.initial = [];
          acc.initial.push({
            ...item,
            isInitial: true,
          });
        } else {
          // Reorders
          if (!acc.reorders) acc.reorders = [];
          // Add current order
          acc.reorders.push({
            ...item,
            selectedFlavors: item.selectedFlavors,
          });
          // Add flavor history
          item.flavorHistory.forEach((flavors, index) => {
            acc.reorders.push({
              ...item,
              selectedFlavors: flavors,
              orderNumber: index + 1,
            });
          });
        }
      } else {
        // Regular items
        if (!acc.regular) acc.regular = [];
        acc.regular.push(item);
      }
      return acc;
    }, {});

    return grouped;
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
        const order = await getOrder(orderId);

        setOrderState((prev) => {
          // Check if we have new items to add
          const hasNewItems = order.items.some(
            (newItem) =>
              !prev.items.some(
                (existingItem) =>
                  existingItem.orderId === newItem.orderId &&
                  existingItem.timestamp === newItem.timestamp
              )
          );

          if (hasNewItems || order.status !== prev.status) {
            const mergedItems = mergeOrders(prev.items, order.items);
            return {
              ...prev,
              items: mergedItems,
              status: order.status,
              receiptNumber: order.receiptNumber || null,
            };
          }
          return prev;
        });
      } catch (error) {
        console.error('Failed to fetch order status:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch order status',
          variant: 'destructive',
        });
      }
    };

    fetchOrderStatus();
    return () => {};
  }, [orderId]);

  const mergeOrders = (existingItems, newItems) => {
    if (!existingItems?.length) {
      return newItems.map((item) => ({
        ...item,
        timestamp: Date.now(),
      }));
    }

    // Create timestamp for this batch of new items
    const batchTimestamp = Date.now();

    // Keep existing items unchanged
    const merged = [...existingItems];

    // Add new items with new timestamp
    const newItemsWithTimestamp = newItems.map((newItem) => ({
      ...newItem,
      timestamp: batchTimestamp,
      originalQuantity: newItem.quantity,
      price: newItem.price,
      flavorHistory: newItem.flavorHistory || [],
    }));

    return [...merged, ...newItemsWithTimestamp];
  };

  const handleOrderAgain = () => {
    const existingUnliwings = orderState.items.find((item) => item.isUnliwings);

    let itemsToPass;
    if (existingUnliwings) {
      itemsToPass = orderState.items.map((item) => {
        if (item.isUnliwings) {
          return {
            ...item,
            selectedFlavors: [],
            flavorHistory: [
              ...(item.flavorHistory || []),
              item.selectedFlavors,
            ],
            flavorOrderStatus: 'flavor_pending',
            price: item.price,
            originalQuantity: item.originalQuantity || item.quantity,
          };
        }
        return item;
      });
    } else {
      itemsToPass = orderState.items.filter((item) => !isUnliwingsItem(item));
    }

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
      if (!tableNumber) {
        toast({
          title: 'Error',
          description: 'Table number is required',
          variant: 'destructive',
        });
        return;
      }

      const cleanTableNumber = tableNumber.toString().replace('Table-', '');

      const receipt = await generateReceipt({
        tableNumber: cleanTableNumber,
        orderId,
      });

      setOrderState((prev) => ({
        ...prev,
        receiptNumber: receipt.receiptNumber,
        status: 'completed',
      }));

      // Clear table orders
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

  const calculateTotal = (items) => {
    if (!items) return 0;

    return items.reduce((sum, item) => {
      if (item.isUnliwings) {
        // For Unliwings, only charge initial order
        const isInitialOrder = !item.flavorHistory?.length;
        return isInitialOrder
          ? sum + item.price * (item.originalQuantity || item.quantity)
          : sum;
      }
      return sum + item.price * item.quantity;
    }, 0);
  };

  const calculateGrandTotal = (orders) => {
    return orders.reduce((sum, order) => sum + order.total, 0);
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
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  Restaurant Name
                </h2>
                <div className="text-sm text-muted-foreground">
                  <p>123 Restaurant Street</p>
                  <p>City, State 12345</p>
                </div>
              </div>

              <Separator />

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

              <div className="space-y-4">
                {groupOrdersByNumber(orderState.items).map((order) => (
                  <div
                    key={order.id}
                    className="border rounded-lg p-4 space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">
                        Order #{order.orderNumber}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        {new Date(order.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-4 text-sm gap-4"
                        >
                          <div className="col-span-2">
                            <div className="font-medium">{item.name}</div>
                            {item.isUnliwings && (
                              <div className="text-xs text-muted-foreground mt-1">
                                <div>
                                  Selected: {item.selectedFlavors?.join(', ')}
                                </div>
                                {item.flavorHistory?.length > 0 && (
                                  <div className="text-xs text-blue-500">
                                    (Reorder - No Charge)
                                  </div>
                                )}
                                <div>
                                  ({item.originalQuantity || item.quantity}{' '}
                                  persons)
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {item.originalQuantity || item.quantity}x
                          </div>
                          <div className="text-right">
                            ₱
                            {(item.isUnliwings
                              ? item.flavorHistory?.length > 0
                                ? 0
                                : item.price *
                                  (item.originalQuantity || item.quantity)
                              : item.price * item.quantity
                            ).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-2 border-t">
                      <div className="text-sm font-medium">
                        Order Total: ₱{order.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}

                <Separator />

                {/* Grand Total */}
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Grand Total</span>
                  <span>
                    ₱
                    {calculateGrandTotal(
                      groupOrdersByNumber(orderState.items)
                    ).toFixed(2)}
                  </span>
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

              {orderState === OrderStatus.PAID && (
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
