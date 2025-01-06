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
import { motion } from 'framer-motion';
import { Loader2, Plus, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getOrder } from '@/services/api';

const ORDER_TYPES = {
  UNLIWINGS: 'unliwings',
  REGULAR: 'regular',
  REORDER: 'reorder',
};

const OrderSummary = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useOrder();
  const { tableNumber, orderId, orders } = location.state || {};
  const [orderDetails, setOrderDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const formatTableNumber = (number) => {
    return number?.toString().replace('Table-', '');
  };

  const getItemKey = (item) => {
    return `${item._id || item.id}-${item.orderSequence || 1}`;
  };

  const determineOrderType = (item) => {
    if (!item.isUnliwings) return ORDER_TYPES.REGULAR;
    return item.orderSequence > 1 ? ORDER_TYPES.REORDER : ORDER_TYPES.UNLIWINGS;
  };

  const fetchOrderDetails = async () => {
    if (!orderId) return;
    try {
      setIsLoading(true);
      const response = await getOrder(orderId);

      if (!response) {
        throw new Error('No order found');
      }

      const cleanTableNumber = formatTableNumber(tableNumber);

      // Process items with hasInitialUnliwings check
      const processedItems = (response.orders || []).map((order) => ({
        ...order,
        items: order.items.map((item) => ({
          ...item,
          orderType: determineOrderType(item),
          orderSequence: item.orderSequence || 1,
          flavorHistory: item.flavorHistory || [],
        })),
      }));

      setOrderDetails({
        ...response,
        orders: processedItems,
        tableNumber: cleanTableNumber,
        hasInitialUnliwings: response.hasInitialUnliwings,
      });
    } catch (error) {
      console.error('Order fetch error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load order',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const calculateTotal = () => {
    if (!orderDetails?.orders) return 0;

    return orderDetails.orders.reduce((total, order) => {
      return (
        total +
        order.items.reduce((orderTotal, item) => {
          // Only make reorders free if hasInitialUnliwings is true
          if (
            item.isUnliwings &&
            orderDetails.hasInitialUnliwings &&
            item.orderSequence > 1
          ) {
            return orderTotal;
          }
          return orderTotal + item.price * item.quantity;
        }, 0)
      );
    }, 0);
  };

  const handleAddMoreItems = () => {
    navigate('/order', {
      state: {
        tableNumber,
        orderId,
        currentItems:
          orderDetails?.orders?.flatMap((order) => order.items) || [],
      },
    });
  };

  const confirmOrder = () => {
    navigate('/bill', {
      state: {
        orderId,
        tableNumber,
        orders: orderDetails?.orders || [],
        total: calculateTotal(),
      },
    });
  };

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
                  {tableNumber}
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
                  {orderDetails?.orders?.map((order, orderIndex) => (
                    <motion.div
                      key={order._id || orderIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: orderIndex * 0.1 }}
                    >
                      {/* Add order timestamp */}
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium text-sm text-muted-foreground">
                          Order #{orderIndex + 1}
                        </h3>
                        <span className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      {order.items.map((item, itemIndex) => (
                        <div key={`${item._id}-${itemIndex}`} className="mb-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{item.name}</h3>
                                {item.isUnliwings && (
                                  <Badge variant="outline">
                                    {item.orderType}
                                  </Badge>
                                )}
                              </div>
                              {item.selectedFlavors?.length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                  Flavors: {item.selectedFlavors.join(', ')}
                                </p>
                              )}
                              {item.flavorHistory?.length > 0 && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  <p>Previous orders:</p>
                                  {item.flavorHistory.map((flavors, idx) => (
                                    <p key={idx} className="ml-2">
                                      #{idx + 1}: {flavors.join(', ')}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <p>
                                {item.quantity}x
                                {item.isUnliwings &&
                                item.orderSequence > 1 &&
                                orderDetails.hasInitialUnliwings ? (
                                  <span className="text-green-600"> FREE</span>
                                ) : (
                                  <span> ₱{item.price.toFixed(2)}</span>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {item.isUnliwings &&
                                orderDetails.hasInitialUnliwings &&
                                item.orderSequence > 1 ? (
                                  <span>FREE</span>
                                ) : (
                                  <span>
                                    Total: ₱
                                    {(item.price * item.quantity).toFixed(2)}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          {itemIndex < order.items.length - 1 && (
                            <Separator className="my-4" />
                          )}
                        </div>
                      ))}

                      {orderIndex < orderDetails.orders.length - 1 && (
                        <Separator className="my-6" />
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
