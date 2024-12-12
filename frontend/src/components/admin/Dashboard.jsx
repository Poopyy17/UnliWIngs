import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getOrders, updateOrderStatus, markOrderAsPaid } from "@/services/api";
import { Loading } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight,
  DollarSign,
  Package,
  TrendingUp,
  ClipboardX,
  PackageOpen,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import OrdersList from "./OrdersList";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const isUnliwingsItem = (item) => item.isUnliwings === true;

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
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter((order) =>
    ["pending", "preparing"].includes(order.status)
  );

  const activeTablesCount = new Set(
    activeOrders.map((order) => order.tableNumber)
  ).size;

  const todaysRevenue = orders
    .filter((order) => {
      const orderDate = new Date(order.createdAt);
      const today = new Date();
      return orderDate.toDateString() === today.toDateString() && order.isPaid;
    })
    .reduce((sum, order) => sum + order.total, 0);

  const totalOrders = orders.length;
  const completedOrders = orders.filter(
    (order) => order.status === "completed"
  ).length;

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const updatedOrder = await updateOrderStatus(orderId, newStatus);
      setOrders(
        orders.map((order) => (order._id === orderId ? updatedOrder : order))
      );
      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const handlePayment = async (orderId) => {
    try {
      const updatedOrder = await markOrderAsPaid(orderId);
      setOrders(
        orders.map((order) => (order._id === orderId ? updatedOrder : order))
      );
      toast({
        title: "Payment Processed",
        description: "Order has been marked as paid",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
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
    const tables = { 1: [], 2: [], 3: [], 4: [] };
    orders.forEach((order) => {
      if (tables[order.tableNumber]) {
        tables[order.tableNumber].push(order);
      }
    });
    return tables;
  };

  const tableStatus = (tableOrders) => {
    return tableOrders.length > 0 ? "Occupied" : "Unoccupied";
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
            <>
              {activeOrders.length === 0 ? (
                <EmptyState
                  icon={PackageOpen}
                  title="No Active Orders"
                  description="New orders will appear here when customers place them"
                />
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(groupOrdersByTable(activeOrders)).map(
                    ([tableNumber, tableOrders]) => (
                      <Card key={tableNumber} className="p-4 h-full">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">
                            Table {tableNumber} - {tableStatus(tableOrders)}
                          </h3>
                          <Badge>
                            {tableOrders.length}{" "}
                            {tableOrders.length === 1 ? "Order" : "Orders"}
                          </Badge>
                        </div>
                        <div className="overflow-y-auto max-h-96">
                          <OrdersList
                            orders={tableOrders}
                            onStatusUpdate={handleStatusUpdate}
                            onPayment={handlePayment}
                            className="mt-4"
                          />
                        </div>
                      </Card>
                    )
                  )}
                </div>
              )}
            </>
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
                (order) => order.status === "completed" && !order.isPaid
              ).length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No Orders for Payment"
                  description="Orders awaiting payment will appear here"
                />
              ) : (
                <OrdersList
                  orders={orders.filter(
                    (order) => order.status === "completed" && !order.isPaid
                  )}
                  onStatusUpdate={handleStatusUpdate}
                  onPayment={handlePayment}
                  className="mt-4"
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
              {orders.filter((order) => order.isPaid).length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title="No Completed Orders"
                  description="Completed orders will appear here"
                />
              ) : (
                <OrdersList
                  orders={orders.filter((order) => order.isPaid)}
                  onStatusUpdate={handleStatusUpdate}
                  onPayment={handlePayment}
                  className="mt-4"
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
