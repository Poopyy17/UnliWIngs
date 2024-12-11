import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderTimer } from "./OrderTimer";
import { cn } from "@/lib/utils";
import { getStatusColorHex } from "@/utils/colors";

const OrderStatus = {
  PENDING: "pending",
  PREPARING: "preparing",
  COMPLETED: "completed",
  PAID: "paid",
};

const StatusFlow = {
  [OrderStatus.PENDING]: {
    next: OrderStatus.PREPARING,
    buttonText: "Accept Order",
    buttonColor: "default",
  },
  [OrderStatus.PREPARING]: {
    next: OrderStatus.COMPLETED,
    buttonText: "Mark as Complete",
    buttonColor: "default",
  },
  [OrderStatus.COMPLETED]: {
    next: OrderStatus.PAID,
    buttonText: "Process Payment",
    buttonColor: "default",
    requiresReceipt: true,
  },
};

const ReceiptBadge = ({ receiptNumber }) =>
  receiptNumber ? (
    <Badge className="bg-blue-500 ml-2">Receipt #{receiptNumber}</Badge>
  ) : null;

const isUnliwingsItem = (item) => item.isUnliwings === true;

const OrdersList = ({ orders, onStatusUpdate, onPayment, className }) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter orders by table number only
  const filteredOrders = orders.filter((order) =>
    order.tableNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    const colors = {
      [OrderStatus.PENDING]: "bg-yellow-500",
      [OrderStatus.PREPARING]: "bg-blue-500",
      [OrderStatus.COMPLETED]: "bg-green-500",
      [OrderStatus.PAID]: "bg-green-700",
    };
    return colors[status] || "bg-gray-500";
  };

  const renderItemDetails = (item) => {
    return (
      <div className="flex flex-col">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            {item.name} x{item.quantity}
            {item.isUnliwings && (
              <>
                <Badge variant="outline" className="ml-2">
                  Unlimited
                </Badge>
                {item.flavorHistory?.length > 0 && (
                  <Badge variant="outline" className="bg-blue-50">
                    Reorder #{item.flavorHistory.length + 1}
                  </Badge>
                )}
              </>
            )}
          </span>
          <span>${(item.price * item.quantity).toFixed(2)}</span>
        </div>
        {item.isUnliwings && (
          <div className="text-xs text-muted-foreground mt-1 ml-4 border-l-2 border-blue-200 pl-2">
            <div className="font-medium">Current Order:</div>
            <div>• {item.selectedFlavors?.join(", ")}</div>
            {item.flavorHistory?.length > 0 && (
              <div className="mt-2">
                <div className="font-medium">Previous Orders:</div>
                {item.flavorHistory.map((flavors, i) => (
                  <div key={i} className="ml-2">
                    • Order #{i + 1}: {flavors.join(", ")}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between items-center mb-4">
        <Input
          placeholder="Search by table number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="grid gap-4">
        {filteredOrders.map((order) => (
          <Card key={order._id} className="overflow-hidden">
            <div
              className="border-l-4 px-4 py-3"
              style={{ borderColor: getStatusColorHex(order.status) }}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Table {order.tableNumber}</h3>
                    <Badge className={cn(getStatusColor(order.status))}>
                      {order.status}
                    </Badge>
                    <ReceiptBadge receiptNumber={order.receiptNumber} />
                    {order.items.some(
                      (item) =>
                        item.isUnliwings && item.flavorHistory?.length > 0
                    ) && (
                      <Badge variant="outline" className="bg-blue-50">
                        Reorder
                      </Badge>
                    )}
                  </div>
                  <OrderTimer
                    startTime={order.createdAt}
                    status={order.status}
                  />
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">${order.total.toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {order.items.map((item, index) => (
                  <div key={index}>{renderItemDetails(item)}</div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                {order.status !== OrderStatus.PAID &&
                  StatusFlow[order.status] && (
                    <>
                      {order.status !== OrderStatus.COMPLETED && (
                        <Button
                          onClick={() =>
                            onStatusUpdate(
                              order._id,
                              StatusFlow[order.status].next
                            )
                          }
                          variant="outline"
                          className="hover:bg-blue-50"
                        >
                          {StatusFlow[order.status].buttonText}
                        </Button>
                      )}
                      {order.status === OrderStatus.COMPLETED &&
                        order.receiptNumber && (
                          <Button
                            onClick={() => onPayment(order._id)}
                            variant="outline"
                            className="hover:bg-green-50"
                          >
                            Process Payment
                          </Button>
                        )}
                    </>
                  )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OrdersList;
