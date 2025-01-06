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
import { v4 as uuidv4 } from 'uuid';

const Dashboard = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});

  const OrderStatus = {
    PREPARING: 'preparing',
    ACCEPTED: 'accepted',
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

  const activeOrders = orders.filter(
    (order) => !order.isPaid && order.isTableOccupied
  );

  const todaysRevenue = orders
    .filter((order) => {
      const orderDate = new Date(order.createdAt);
      const today = new Date();
      return orderDate.toDateString() === today.toDateString() && order.isPaid;
    })
    .reduce((sum, order) => sum + order.grandTotal, 0);

  const totalOrders = orders.length;
  const completedOrders = orders.filter((order) => order.isPaid).length;

  const handleStatusUpdate = async (
    tableNumber,
    orderNumber,
    itemId,
    newStatus
  ) => {
    try {
      await updateOrderStatus(tableNumber, orderNumber, itemId, newStatus);

      setOrders((prevOrders) => {
        return prevOrders.map((tableOrder) => {
          if (tableOrder.tableNumber === parseInt(tableNumber)) {
            return {
              ...tableOrder,
              orders: tableOrder.orders.map((order) => {
                if (order.orderNumber === orderNumber) {
                  return {
                    ...order,
                    items: order.items.map((item) => {
                      if (item._id === itemId) {
                        return { ...item, status: newStatus };
                      }
                      return item;
                    }),
                  };
                }
                return order;
              }),
            };
          }
          return tableOrder;
        });
      });

      toast({
        title: 'Status Updated',
        description: `Item status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Status update error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item status',
        variant: 'destructive',
      });
    }
  };

  const handleTablePayment = async (tableNumber) => {
    try {
      const result = await processTablePayment(tableNumber);
      await fetchOrders();
      toast({
        title: 'Payment Processed',
        description: `Receipt #${
          result.receiptNumber
        } - Total: ₱${result.grandTotal.toFixed(2)}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process payment',
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
      1: null,
      2: null,
      3: null,
      4: null,
    };

    orders.forEach((tableOrder) => {
      if (tableOrder.tableNumber) {
        tables[tableOrder.tableNumber] = tableOrder;
      }
    });

    return tables;
  };

  const StatusIcon = ({ status }) => {
    switch (status) {
      case 'accepted':
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

      {/* Stats Cards */}
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
                  ₱{todaysRevenue.toFixed(2)}
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

      {/* Orders Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Orders</TabsTrigger>
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
                ([tableNumber, tableOrder]) => (
                  <Card key={tableNumber} className="p-4 h-full">
                    <div className="flex flex-col h-full">
                      {/* Table Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            Table {tableNumber}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {tableOrder?.orders?.length || 0} orders
                          </p>
                        </div>
                        <Badge variant={tableOrder ? 'default' : 'secondary'}>
                          {tableOrder ? 'Occupied' : 'Available'}
                        </Badge>
                      </div>

                      {/* Orders List */}
                      {tableOrder && (
                        <Accordion
                          type="single"
                          collapsible
                          className="w-full"
                          value={expandedItems[tableNumber]}
                          onValueChange={(value) =>
                            setExpandedItems((prev) => ({
                              ...prev,
                              [tableNumber]: value,
                            }))
                          }
                        >
                          {tableOrder.orders.map((order) => (
                            <AccordionItem
                              key={`${tableNumber}-${order.orderNumber}`}
                              value={`${tableNumber}-${order.orderNumber}`}
                            >
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <StatusIcon status={order.status} />
                                    <span>Order #{order.orderNumber}</span>
                                    <span className="text-sm text-muted-foreground">
                                      (₱{order.orderTotal.toFixed(2)})
                                    </span>
                                  </div>
                                  <Badge
                                    variant={
                                      order.status === 'accepted'
                                        ? 'success'
                                        : 'default'
                                    }
                                  >
                                    {order.status}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-4 p-2">
                                  {order.items.map((item, idx) => (
                                    <div
                                      key={`${tableNumber}-${
                                        order.orderNumber
                                      }-${item._id || `item-${idx}`}`}
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
                                                Selected Flavors:{' '}
                                                {item.selectedFlavors?.join(
                                                  ', '
                                                )}
                                              </p>
                                              <p>Quantity: {item.quantity}</p>
                                            </div>
                                          )}
                                        </div>
                                        <p className="font-medium">
                                          ₱
                                          {(item.price * item.quantity).toFixed(
                                            2
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  ))}

                                  {/* Order Total */}
                                  <div className="flex justify-between items-center pt-4 border-t">
                                    <span className="font-semibold">
                                      Order Total:
                                    </span>
                                    <span className="font-bold">
                                      ₱{order.orderTotal.toFixed(2)}
                                    </span>
                                  </div>

                                  {/* Accept Order Button */}
                                  {order.status === 'preparing' && (
                                    <Button
                                      onClick={() =>
                                        handleStatusUpdate(
                                          tableNumber,
                                          order.orderNumber,
                                          'accepted'
                                        )
                                      }
                                      className="mt-4 w-full"
                                      variant="outline"
                                    >
                                      Accept Order
                                    </Button>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}

                      {/* Payment Section */}
                      {tableOrder && (
                        <div className="mt-4 p-3 bg-muted/10 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Table Total
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold">
                                ₱{tableOrder.grandTotal.toFixed(2)}
                              </span>
                              <Button
                                onClick={() => handleTablePayment(tableNumber)}
                                variant="outline"
                                size="sm"
                              >
                                Process Payment
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loading />
            </div>
          ) : (
            <>
              {orders.filter((order) => order.isPaid).length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title="No Completed Orders"
                  description="Completed orders will appear here"
                />
              ) : (
                <OrdersList
                  orders={orders.filter((order) => order.isPaid)}
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
