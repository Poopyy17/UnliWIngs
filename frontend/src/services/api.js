const API_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL;

export const createOrder = async (orderData) => {
  console.log('Creating order with data:', orderData);

  if (!orderData.tableNumber) {
    throw new Error('Table number is required');
  }

  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...orderData,
      tableNumber: orderData.tableNumber.toString().replace('Table-', ''),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create order');
  }

  return response.json();
};

export const getOrders = async () => {
  try {
    const response = await fetch(`${API_URL}/orders`);
    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }
    const orders = await response.json();

    // Add isPending property for better filtering
    return orders.map((order) => ({
      ...order,
      isPending: order.status === 'completed' && !order.isPaid,
    }));
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

export const getOrder = async (orderId) => {
  try {
    console.log('Fetching order:', orderId);
    const response = await fetch(`${API_URL}/orders/${orderId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch order details');
    }

    const order = await response.json();
    console.log('Fetched order:', order);
    return order;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
};

export const updateOrder = async (orderId, orderData) => {
  try {
    console.log('Updating order:', { orderId, orderData });

    // Validate total if provided
    if (
      orderData.total &&
      (typeof orderData.total !== 'number' || isNaN(orderData.total))
    ) {
      throw new Error('Invalid total amount');
    }

    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: orderData.items,
        ...(orderData.total && { total: orderData.total }),
        action: orderData.action || 'update',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update order');
    }

    const updatedOrder = await response.json();
    console.log('Order updated:', updatedOrder);
    return updatedOrder;
  } catch (error) {
    console.error('Update order error:', error);
    throw error;
  }
};

export const updateFlavorStatus = async (orderId, itemId, status) => {
  try {
    console.log('Updating flavor status:', { orderId, itemId, status });
    const response = await fetch(`${API_URL}/orders/${orderId}/flavor-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ itemId, status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update flavor status');
    }

    const updatedOrder = await response.json();
    console.log('Updated order:', updatedOrder);
    return updatedOrder;
  } catch (error) {
    console.error('Error updating flavor status:', error);
    throw error;
  }
};
export const getOrdersByTable = async () => {
  try {
    const orders = await getOrders();
    // Initialize tables object with empty arrays for all tables
    const groupedOrders = { 1: [], 2: [], 3: [], 4: [] };

    orders.forEach((order) => {
      if (order.tableNumber) {
        const tableNum = order.tableNumber.toString();
        groupedOrders[tableNum].push(order);
      }
    });

    console.log('Grouped orders by table:', groupedOrders);
    return groupedOrders;
  } catch (error) {
    console.error('Error grouping orders:', error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId, status) => {
  const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status,
      updateType: 'both', // Add this to handle both order and flavor status
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update order status');
  }

  return response.json();
};

export const processTablePayment = async (tableNumber) => {
  // First generate receipt
  await generateReceipt({ tableNumber });

  // Then process payment
  const response = await fetch(`${API_URL}/orders/table/${tableNumber}/pay`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to process table payment');
  }

  return response.json();
};

export const generateReceipt = async ({ tableNumber, orderId }) => {
  console.log('Generating receipt for:', { tableNumber, orderId });

  const response = await fetch(`${API_URL}/orders/receipt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tableNumber,
      orderId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate receipt');
  }

  return response.json();
};

export const getTableOrders = async (tableNumber) => {
  try {
    const orders = await getOrders();
    return orders.filter(
      (order) =>
        order.tableNumber === tableNumber &&
        !order.isPaid &&
        order.status !== 'completed'
    );
  } catch (error) {
    console.error('Error fetching table orders:', error);
    throw error;
  }
};
