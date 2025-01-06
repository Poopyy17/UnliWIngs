const API_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL;
import api from '../config/axiosInstance';

export const createOrder = async (orderData) => {
  try {
    const {
      tableNumber,
      items,
      status,
      isTableOccupied,
      hasUnliwings,
      orderNumber,
      grandTotal,
      hasInitialUnliwings,
    } = orderData;

    const response = await api.post('/orders', {
      tableNumber,
      items: items.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        isUnliwings: item.isUnliwings || false,
        selectedFlavors: item.selectedFlavors || [],
        category: item.category,
        description: item.description,
        status: item.status || 'preparing',
        orderTotal: item.orderTotal,
        orderSequence: item.orderSequence || 1,
        flavorOrderStatus: item.flavorOrderStatus,
        flavorHistory: item.flavorHistory,
      })),
      status,
      isTableOccupied,
      hasUnliwings,
      hasInitialUnliwings,
      orderNumber,
      grandTotal,
    });
    return response.data;
  } catch (error) {
    console.error('Create order error:', error);
    throw error;
  }
};

export const getTableOrders = async (tableNumber) => {
  try {
    const response = await api.get(`/orders/table/${tableNumber}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching table orders:', error);
    throw error;
  }
};

export const getOrder = async (orderId) => {
  try {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
};

export const getOrders = async () => {
  try {
    const response = await api.get('/orders');
    return response.data;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch orders');
  }
};

export const updateOrderStatus = async (
  tableNumber,
  orderNumber,
  itemId,
  status
) => {
  try {
    const response = await api.patch(
      `/orders/${tableNumber}/order/${orderNumber}/status`,
      {
        itemId,
        status,
        updatedAt: new Date().toISOString(),
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

export const processTablePayment = async (tableNumber) => {
  try {
    const response = await api.post(`/orders/${tableNumber}/pay`, {
      paidAt: new Date().toISOString(),
      status: 'completed',
    });
    return response.data;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
};

export const getAllActiveOrders = async () => {
  try {
    const response = await api.get('/orders/active');
    return response.data;
  } catch (error) {
    console.error('Error fetching active orders:', error);
    throw error;
  }
};

export const getCompletedOrders = async () => {
  try {
    const response = await api.get('/orders/completed');
    return response.data;
  } catch (error) {
    console.error('Error fetching completed orders:', error);
    throw error;
  }
};

export const generateReceipt = async ({ tableNumber, orderId, total }) => {
  try {
    const response = await api.post(`/orders/${orderId}/generate-receipt`, {
      tableNumber,
      total,
      hasInitialUnliwings: false,
      generatedAt: new Date().toISOString(),
    });
    return response.data;
  } catch (error) {
    console.error('Error generating receipt:', error);
    throw error;
  }
};
