import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getOrders,
  updateOrderStatus,
  processTablePayment,
} from '@/services/api';
import { Loading } from '@/components/ui/loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUpRight,
  DollarSign,
  Package,
  TrendingUp,
  ClipboardX,
  PackageOpen,
  CreditCard,
  CheckCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import OrdersList from './OrdersList';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const Dashboard = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const isUnliwingsItem = (item) => item.isUnliwings === true;

  const calculateTableTotal = (orders) => {
    return orders.reduce((sum, order) => {
      const orderTotal = order.items.reduce((itemSum, item) => {
        // Skip items from different orders
        if (
          !item.isUnliwings &&
          item.originalOrderId &&
          item.originalOrderId !== order._id
        ) {
          return itemSum;
        }

        if (item.isUnliwings) {
          return item.flavorHistory?.length > 0
            ? itemSum
            : itemSum + item.price * (item.originalQuantity || item.quantity);
        }

        return itemSum + item.price * item.quantity;
      }, 0);
      return sum + orderTotal;
    }, 0);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter((order) =>
    ['pending', 'accepted', 'preparing'].includes(order.status)
  );

  const todaysRevenue = orders
    .filter((order) => {
      const orderDate = new Date(order.createdAt);
      const today = new Date();
      return orderDate.toDateString() === today.toDateString() && order.isPaid;
    })
    .reduce((sum, order) => sum + order.total, 0);

  const totalOrders = orders.length;
  const completedOrders = orders.filter(
    (order) => order.status === 'completed'
  ).length;

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => {
      if (item.isUnliwings) {
        // Only charge for initial order based on original quantity
        const isReorder = item.flavorHistory?.length > 0;
        return isReorder ? sum : sum + item.price * item.originalQuantity;
      }
      return sum + item.price * item.quantity;
    }, 0);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const updatedOrder = await updateOrderStatus(orderId, newStatus);

      // Update orders state and move to correct tab
      setOrders((prevOrders) =>
        prevOrders.map((order) => {
          if (order._id === orderId) {
            return {
              ...updatedOrder,
              total: calculateTotal(updatedOrder.items), // Recalculate total
            };
          }
          return order;
        })
      );

      await fetchOrders(); // Refresh orders list

      toast({
        title: 'Status Updated',
        description: `Order status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  const groupOrdersById = (items) => {
    return items.reduce((acc, item) => {
      const orderId = item.orderId;
      if (!acc[orderId]) {
        acc[orderId] = [];
      }
      acc[orderId].push(item);
      return acc;
    }, {});
  };

  const groupOrdersForPayment = (orders) => {
    if (!Array.isArray(orders)) {
      console.log('Orders is not an array:', orders);
      return [];
    }

    const groupedByTable = orders.reduce((acc, order) => {
      if (!order?.tableNumber) return acc;

      const key = order.tableNumber.toString();
      if (!acc[key]) {
        acc[key] = {
          tableNumber: key,
          orders: [],
          total: 0,
          receiptNumber: order.receiptNumber,
        };
      }
      acc[key].orders.push(order);
      acc[key].total += calculateTotal(order.items || []);
      return acc;
    }, {});

    return Object.values(groupedByTable);
  };

  const handleTablePayment = async (tableNumber) => {
    try {
      await processTablePayment(tableNumber);
      await fetchOrders(); // Refresh orders
      toast({
        title: 'Payment Processed',
        description: `All orders for Table ${tableNumber} have been paid`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process table payment',
        variant: 'destructive',
      });
    }
  };

  const EmptyState = ({ icon: Icon, title, description }) => {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] border border-dashed rounded-lg bg-muted/5">
        <Icon className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium text-muted-foreground">
          {title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground/70">{description}</p>
      </div>
    );
  };

  const groupOrdersByTable = (orders) => {
    const tables = {
      1: [],
      2: [],
      3: [],
      4: [],
    };

    orders.forEach((order) => {
      if (order.tableNumber && order.status !== 'completed') {
        const tableNum = order.tableNumber.toString().replace('Table-', '');

        if (!tables.hasOwnProperty(tableNum)) {
          console.warn(`Invalid table number: ${tableNum}`);
          return;
        }

        const hasPendingReorders = order.items.some(
          (item) =>
            item.isUnliwings && item.flavorOrderStatus === 'flavor_pending'
        );

        if (
          ['pending', 'accepted', 'preparing'].includes(order.status) ||
          hasPendingReorders
        ) {
          tables[tableNum].push(order);
        }
      }
    });

    return tables;
  };

  const StatusIcon = ({ status }) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'preparing':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <div className="h-full flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loading />
            ) : (
              <>
                <div className="text-2xl font-bold">{activeOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                  {((activeOrders.length / totalOrders) * 100).toFixed(1)}% of
                  total orders
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loading />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${todaysRevenue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  +10.1% from yesterday
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Orders
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loading />
            ) : (
              <>
                <div className="text-2xl font-bold">{completedOrders}</div>
                <p className="text-xs text-muted-foreground">
                  {((completedOrders / totalOrders) * 100).toFixed(1)}%
                  completion rate
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loading />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalOrders}</div>
                <p className="text-xs text-muted-foreground">All time orders</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Orders</TabsTrigger>
          <TabsTrigger value="forPayment">For Payment</TabsTrigger>
          <TabsTrigger value="completed">Completed Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loading />
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(groupOrdersByTable(activeOrders)).map(
                ([tableNumber, tableOrders]) => (
                  <Card key={tableNumber} className="p-4 h-full">
                    <div className="flex flex-col h-full">
                      {/* Table Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            Table {tableNumber}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {tableOrders.length} active order
                            {tableOrders.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Badge
                          variant={
                            tableOrders.length > 0 ? 'default' : 'secondary'
                          }
                        >
                          {tableOrders.length > 0 ? 'Occupied' : 'Available'}
                        </Badge>
                      </div>

                      {/* Table Total */}
                      {tableOrders.length > 0 && (
                        <div className="mb-4 p-3 bg-muted/10 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Table Total
                            </span>
                            <span className="text-lg font-bold">
                              ₱{calculateTableTotal(tableOrders).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Orders List */}
                      {tableOrders.length > 0 && (
                        <Accordion type="single" collapsible className="w-full">
                          {tableOrders.map((order) => (
                            <AccordionItem key={order._id} value={order._id}>
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <StatusIcon status={order.status} />
                                    <span>Order #{order._id.slice(-4)}</span>
                                    <span className="text-sm text-muted-foreground">
                                      (₱{order.total.toFixed(2)})
                                    </span>
                                  </div>
                                  <Badge
                                    variant={
                                      order.items.some(
                                        (item) =>
                                          item.isUnliwings &&
                                          item.flavorOrderStatus ===
                                            'flavor_accepted'
                                      )
                                        ? 'success'
                                        : 'default'
                                    }
                                    className="ml-2"
                                  >
                                    {order.items.some(
                                      (item) =>
                                        item.isUnliwings &&
                                        item.flavorOrderStatus ===
                                          'flavor_accepted'
                                    )
                                      ? 'Accepted'
                                      : order.status}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-4 p-2">
                                  {order.items
                                    .filter(
                                      (item) =>
                                        !item.originalOrderId ||
                                        item.originalOrderId === order._id ||
                                        item.isUnliwings
                                    )
                                    .map((item, idx) => (
                                      <div
                                        key={idx}
                                        className={cn(
                                          'p-3 rounded-lg',
                                          item.isUnliwings &&
                                            'border border-blue-200 bg-blue-50'
                                        )}
                                      >
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <p className="font-medium">
                                              {item.name}
                                            </p>
                                            {item.isUnliwings && (
                                              <div className="text-sm text-muted-foreground mt-1">
                                                <p>
                                                  Current Flavors:{' '}
                                                  {item.selectedFlavors?.join(
                                                    ', '
                                                  )}
                                                </p>
                                                {item.flavorHistory?.length >
                                                  0 && (
                                                  <div className="mt-1">
                                                    <p>Previous Orders:</p>
                                                    {item.flavorHistory.map(
                                                      (flavors, i) => (
                                                        <p
                                                          key={i}
                                                          className="ml-2"
                                                        >
                                                          #{i + 1}:{' '}
                                                          {flavors.join(', ')}
                                                        </p>
                                                      )
                                                    )}
                                                  </div>
                                                )}
                                                <p className="mt-1">
                                                  Quantity:{' '}
                                                  {item.originalQuantity ||
                                                    item.quantity}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                          <p className="font-medium">
                                            ₱
                                            {item.isUnliwings &&
                                            item.flavorHistory?.length > 0
                                              ? '0.00' // Show zero for re-orders
                                              : (
                                                  item.price *
                                                  (item.originalQuantity ||
                                                    item.quantity)
                                                ).toFixed(2)}
                                          </p>
                                        </div>

                                        {/* Accept Flavor Button */}
                                        {item.isUnliwings &&
                                          item.flavorOrderStatus ===
                                            'flavor_pending' && (
                                            <div className="mt-2">
                                              <Button
                                                size="sm"
                                                onClick={() =>
                                                  handleStatusUpdate(
                                                    order._id,
                                                    'accepted'
                                                  )
                                                }
                                                variant="outline"
                                              >
                                                Accept New Flavors
                                              </Button>
                                            </div>
                                          )}
                                      </div>
                                    ))}
                                  {/* Individual Order Total */}
                                  <div className="flex justify-between items-center pt-4 border-t">
                                    <span className="font-semibold">
                                      Order Total:
                                    </span>
                                    <span className="font-bold">
                                      ₱
                                      {order.items
                                        .reduce((sum, item) => {
                                          if (item.isUnliwings) {
                                            return item.flavorHistory?.length >
                                              0
                                              ? sum
                                              : sum +
                                                  item.price *
                                                    (item.originalQuantity ||
                                                      item.quantity);
                                          }
                                          if (
                                            !item.originalOrderId ||
                                            item.originalOrderId === order._id
                                          ) {
                                            return (
                                              sum + item.price * item.quantity
                                            );
                                          }
                                          return sum;
                                        }, 0)
                                        .toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                    </div>
                  </Card>
                )
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="forPayment" className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loading />
            </div>
          ) : (
            <>
              {orders.filter(
                (order) => order.status === 'completed' && !order.isPaid
              ).length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No Orders for Payment"
                  description="Orders awaiting payment will appear here"
                />
              ) : (
                <OrdersList
                  orders={orders.filter(
                    (order) => order.status === 'completed' && !order.isPaid
                  )}
                  onStatusUpdate={handleStatusUpdate}
                  onPayment={handleTablePayment}
                  className="mt-4"
                  isPaymentView={true}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loading />
            </div>
          ) : (
            <>
              {orders.filter((order) => order.status === 'paid').length ===
              0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title="No Completed Orders"
                  description="Completed orders will appear here"
                />
              ) : (
                <OrdersList
                  orders={orders.filter((order) => order.status === 'paid')}
                  onStatusUpdate={handleStatusUpdate}
                  onPayment={handleTablePayment}
                  className="mt-4"
                  isPaymentView={false}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
