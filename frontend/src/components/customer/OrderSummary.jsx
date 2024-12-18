import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useOrder } from '../../../context/orderContext';
import { useState, useEffect } from 'react';
import { getOrder } from '@/services/api';
import { motion } from 'framer-motion';
import { Loader2, Plus, Receipt, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const OrderSummary = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useOrder();
  const { tableNumber, orderId, currentItems: newItems } = location.state || {};
  const [orderDetails, setOrderDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isUnliwingsItem = (item) => item.isUnliwings === true;

  // Update fetchOrderDetails function
  const fetchOrderDetails = async () => {
    if (!orderId) return;
    try {
      setIsLoading(true);
      const order = await getOrder(orderId);

      if (newItems?.length > 0) {
        const existingUnliwings = order.items.find(isUnliwingsItem);
        const newUnliwings = newItems.find(isUnliwingsItem);

        let mergedItems = [...order.items];

        newItems.forEach((newItem) => {
          // Add timestamp to new items
          const itemWithTimestamp = {
            ...newItem,
            timestamp: new Date(),
            orderId: orderId, // Ensure orderId is set for new items
          };

          if (newItem.isUnliwings) {
            const existingIndex = mergedItems.findIndex(
              (item) => item.isUnliwings && !item.flavorHistory?.length
            );
            if (existingIndex !== -1) {
              mergedItems[existingIndex] = {
                ...itemWithTimestamp,
                flavorHistory: [
                  ...(existingUnliwings?.flavorHistory || []),
                  existingUnliwings?.selectedFlavors,
                ],
                originalQuantity:
                  existingUnliwings?.originalQuantity || newItem.quantity,
              };
            } else {
              mergedItems.push(itemWithTimestamp);
            }
          } else {
            mergedItems.push(itemWithTimestamp);
          }
        });

        setOrderDetails({
          ...order,
          items: mergedItems,
        });

        // Update global state
        dispatch({
          type: 'UPDATE_ITEMS',
          tableNumber,
          items: mergedItems,
          orderId: order._id,
        });
      } else {
        setOrderDetails(order);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      toast({
        title: 'Error',
        description: 'Failed to load order details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('OrderSummary mounted with:', {
      orderId,
      tableNumber,
      newItems,
    });
    fetchOrderDetails();
  }, [orderId]);

  const accumulatedOrders =
    orderDetails?.items || state.orders[tableNumber] || [];

  const calculateTotal = () => {
    return accumulatedOrders.reduce((total, item) => {
      if (item.isUnliwings) {
        // For Unliwings - only charge initial order
        const isReorder = item.flavorHistory?.length > 0;
        return isReorder
          ? total
          : total + item.price * (item.originalQuantity || item.quantity);
      }
      // For non-Unliwings - only include current order items
      if (!item.originalOrderId || item.originalOrderId === orderId) {
        return total + item.price * item.quantity;
      }
      return total;
    }, 0);
  };

  const confirmOrder = () => {
    if (!orderId) {
      toast({
        title: 'Error',
        description: 'Order ID is missing',
        variant: 'destructive',
      });
      return;
    }

    navigate('/bill', {
      state: {
        orderItems: orderDetails?.items || accumulatedOrders,
        tableNumber,
        orderId,
        total: calculateTotal(),
      },
    });
  };

  const handleAddMoreItems = () => {
    navigate('/order', {
      state: {
        tableNumber,
        orderId,
        currentItems: accumulatedOrders,
      },
    });
  };

  if (!tableNumber) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-muted-foreground">No table selected</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto p-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="shadow-lg">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">
                  Order Summary
                </h2>
                <Badge variant="outline" className="font-medium">
                  Table {tableNumber}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-6">
                  {accumulatedOrders
                    .filter(
                      (item) =>
                        item.isUnliwings ||
                        !item.originalOrderId ||
                        item.originalOrderId === orderId
                    )
                    .map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h3 className="font-medium">
                              {item.name}
                              {item.isUnliwings && (
                                <span className="text-sm text-muted-foreground ml-2">
                                  ({item.originalQuantity || item.quantity}{' '}
                                  {(item.originalQuantity || item.quantity) > 1
                                    ? 'persons'
                                    : 'person'}
                                  )
                                </span>
                              )}
                            </h3>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <span>
                                ₱{item.price.toFixed(2)} ×{' '}
                                {item.isUnliwings
                                  ? item.originalQuantity || item.quantity
                                  : item.quantity}
                              </span>
                            </div>
                            {item.isUnliwings && (
                              <div className="space-y-2 mt-2">
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">
                                    Current Order:
                                  </span>{' '}
                                  {item.selectedFlavors?.join(', ')}
                                </div>
                                {item.flavorHistory?.length > 0 && (
                                  <div className="text-sm space-y-1">
                                    <span className="font-medium text-muted-foreground">
                                      Previous Orders:
                                    </span>
                                    {item.flavorHistory.map((flavors, idx) => (
                                      <div
                                        key={idx}
                                        className="text-xs text-muted-foreground pl-2"
                                      >
                                        #{idx + 1}: {flavors.join(', ')}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="font-medium">
                            ₱
                            {(
                              item.price *
                              (item.isUnliwings
                                ? item.originalQuantity || item.quantity
                                : item.quantity)
                            ).toFixed(2)}
                          </p>
                        </div>
                        {index < accumulatedOrders.length - 1 && (
                          <Separator className="my-4" />
                        )}
                      </motion.div>
                    ))}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Separator />
              <div className="w-full flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">
                    ₱{calculateTotal().toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={handleAddMoreItems}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add More
                  </Button>
                  <Button onClick={confirmOrder} className="gap-2">
                    <Receipt className="h-4 w-4" />
                    Confirm Order
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderSummary;
