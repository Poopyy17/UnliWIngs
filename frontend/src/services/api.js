const API_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL;

export const createOrder = async (orderData) => {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create order');
  }

  return response.json();
};

export const getOrders = async () => {
  const response = await fetch(`${API_URL}/orders`);
  return response.json();
};

export const getOrder = async (orderId) => {
  const response = await fetch(`${API_URL}/orders/${orderId}`);
  return response.json();
};

export const updateOrder = async (orderId, items) => {
  const response = await fetch(`${API_URL}/orders/${orderId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items,
      action: 'add', // Add flag to indicate this is an addition
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update order');
  }

  const updatedOrder = await response.json();

  if (!updatedOrder.items || !updatedOrder._id) {
    throw new Error('Invalid response from server');
  }

  return updatedOrder;
};

export const updateOrderStatus = async (orderId, status) => {
  const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update order status');
  }

  return response.json();
};

export const generateReceipt = async (orderId) => {
  const response = await fetch(`${API_URL}/orders/${orderId}/receipt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to generate receipt');
  return response.json();
};

export const markOrderAsPaid = async (orderId) => {
  const response = await fetch(`${API_URL}/orders/${orderId}/pay`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.json();
};
