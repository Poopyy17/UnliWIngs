import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createOrder, updateOrder } from '@/services/api';
import { useOrder } from '../../../context/orderContext';
import { motion } from 'framer-motion';
import { MinusCircle, PlusCircle, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const MOCK_MENU = [
  {
    id: 1,
    name: 'Burger',
    price: 10.99,
    category: 'Main',
    description: 'Classic beef burger with cheese',
  },
  {
    id: 2,
    name: 'Pizza',
    price: 12.99,
    category: 'Main',
    description: 'Margherita pizza with fresh basil',
  },
  {
    id: 3,
    name: 'Fries',
    price: 4.99,
    category: 'Sides',
    description: 'Crispy golden fries',
  },
  {
    id: 4,
    name: 'Soda',
    price: 2.99,
    category: 'Drinks',
    description: 'Refreshing cola drink',
  },
];

const OrderMenu = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatch } = useOrder();
  const [orderItems, setOrderItems] = useState([]);
  const tableNumber = location.state?.tableNumber;

  // Group menu items by category
  const menuByCategory = MOCK_MENU.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const addToOrder = (newItem) => {
    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === newItem.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevItems, { ...newItem, quantity: 1 }];
    });
  };

  const removeFromOrder = (itemId) => {
    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prevItems.map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prevItems.filter((item) => item.id !== itemId);
    });
  };

  const getItemQuantity = (itemId) => {
    const item = orderItems.find((item) => item.id === itemId);
    return item ? item.quantity : 0;
  };

  const submitOrder = async () => {
    try {
      if (orderItems.length === 0) {
        toast({
          title: 'Error',
          description: 'Please add items to your order',
          variant: 'destructive',
        });
        return;
      }

      let response;
      if (location.state?.orderId) {
        response = await updateOrder(location.state.orderId, orderItems);
      } else {
        response = await createOrder({
          tableNumber,
          items: orderItems,
        });
      }

      if (!response._id) {
        throw new Error(response.message || 'Failed to create/update order');
      }

      dispatch({
        type: 'UPDATE_ITEMS',
        tableNumber,
        items: response.items,
        orderId: response._id,
      });

      navigate('/summary', {
        state: {
          tableNumber,
          orderId: response._id,
        },
      });
    } catch (error) {
      console.error('Order submission error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit order',
        variant: 'destructive',
      });
    }
  };

  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 pb-32">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Menu</h1>
            {tableNumber && (
              <Badge variant="outline" className="mt-2">
                Table {tableNumber}
              </Badge>
            )}
          </div>
        </div>

        <ScrollArea className="h-full">
          {Object.entries(menuByCategory).map(([category, items]) => (
            <div key={category} className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => {
                  const quantity = getItemQuantity(item.id);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{item.name}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            </div>
                            <span className="font-semibold">
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                          <div className="mt-4">
                            {quantity > 0 ? (
                              <div className="flex items-center justify-between">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeFromOrder(item.id)}
                                >
                                  <MinusCircle className="h-4 w-4" />
                                </Button>
                                <span className="font-medium">{quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => addToOrder(item)}
                                >
                                  <PlusCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => addToOrder(item)}
                              >
                                Add to Order
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {orderItems.length > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg"
        >
          <div className="container mx-auto p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-2 rounded-full">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">
                    {totalItems} {totalItems === 1 ? 'item' : 'items'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total: ${totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              <Button size="lg" onClick={submitOrder}>
                Review Order
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default OrderMenu;
