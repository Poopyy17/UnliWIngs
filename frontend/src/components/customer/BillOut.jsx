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

  const [receiptNumber, setReceiptNumber] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [currentItems, setCurrentItems] = useState(initialItems);
  const [currentTotal, setCurrentTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);

  const showGenerateReceiptButton =
    !receiptNumber && orderStatus !== OrderStatus.PAID;
  const showProceedToCounter =
    receiptNumber && orderStatus !== OrderStatus.PAID;

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
        setOrderStatus(order.status);
        setCurrentItems(order.items);
        setCurrentTotal(order.total);
        if (order.receiptNumber) {
          setReceiptNumber(order.receiptNumber);
        }
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
    const interval = setInterval(fetchOrderStatus, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  const handleOrderAgain = () => {
    navigate('/order', { state: { tableNumber, orderId } });
  };

  const handlePayBill = async () => {
    try {
      setIsLoading(true);
      if (!orderId) {
        toast({
          title: 'Error',
          description: 'Order ID is missing',
          variant: 'destructive',
        });
        return;
      }

      const receipt = await generateReceipt(orderId);
      setReceiptNumber(receipt.receiptNumber);
      setOrderStatus('completed');

      toast({
        title: 'Receipt Generated',
        description: `Receipt #${receipt.receiptNumber}. Please proceed to counter for payment.`,
      });
    } catch (error) {
      console.error('Receipt generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate receipt',
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
                {orderStatus && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <StatusBadge status={orderStatus} />
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="grid grid-cols-4 text-sm font-medium text-muted-foreground">
                  <span className="col-span-2">Item</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Price</span>
                </div>

                {currentItems?.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="grid grid-cols-4 text-sm"
                  >
                    <span className="col-span-2 font-medium">{item.name}</span>
                    <span className="text-right">{item.quantity}</span>
                    <span className="text-right">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </motion.div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold">
                  ${currentTotal?.toFixed(2)}
                </span>
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
                      Receipt #{receiptNumber}
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

              {orderStatus === OrderStatus.PAID && (
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
