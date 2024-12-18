import { Router } from 'express';
const router = Router();
import Order from '../models/Order.js';

const VALID_STATUSES = [
  'pending',
  'accepted', // Add accepted status
  'preparing',
  'completed',
  'paid',
];

const VALID_FLAVOR_STATUSES = [
  'flavor_pending',
  'flavor_accepted',
  'flavor_completed',
];
const isUnliwingsItem = (item) => item.isUnliwings === true;

const validateTableNumber = (req, res, next) => {
  const { tableNumber } = req.body;
  const cleanTableNumber = tableNumber.toString().replace('Table-', '');

  if (!cleanTableNumber || !['1', '2', '3', '4'].includes(cleanTableNumber)) {
    return res.status(400).json({ message: 'Invalid table number' });
  }
  req.body.tableNumber = cleanTableNumber;
  next();
};

const generateReceiptNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `R${timestamp.slice(-6)}${random}`;
};

const calculateTotal = (items) => {
  return items.reduce((sum, item) => {
    if (item.isUnliwings) {
      // Always use originalQuantity for Unliwings pricing
      return sum + item.price * (item.originalQuantity || item.quantity);
    }
    return sum + item.price * item.quantity;
  }, 0);
};

// Create new order
router.post('/', validateTableNumber, async (req, res) => {
  try {
    const { tableNumber, items } = req.body;
    console.log('Received order:', { tableNumber, itemCount: items.length });

    const total = calculateTotal(items);
    const order = new Order({
      tableNumber,
      items,
      total,
      status: 'pending',
    });

    console.log('Creating order:', order);
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update receipt generation route
router.post('/receipt', async (req, res) => {
  try {
    const { tableNumber } = req.body;
    const receiptNumber = generateReceiptNumber();

    // Find all unpaid orders for the table
    const tableOrders = await Order.find({
      tableNumber: tableNumber.toString(),
      status: { $nin: ['paid'] },
      isPaid: { $ne: true },
    });

    if (!tableOrders.length) {
      return res
        .status(404)
        .json({ message: 'No active orders found for table' });
    }

    // Update all orders with receipt number and mark as completed
    const updatePromises = tableOrders.map((order) =>
      Order.findByIdAndUpdate(
        order._id,
        {
          receiptNumber,
          status: 'completed',
          receiptGeneratedAt: new Date(),
        },
        { new: true }
      )
    );

    const updatedOrders = await Promise.all(updatePromises);
    res.json({
      receiptNumber,
      ordersCompleted: updatedOrders.length,
      orders: updatedOrders,
    });
  } catch (error) {
    console.error('Receipt generation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all orders
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all orders...');

    const orders = await Order.find().sort({ createdAt: -1 }).lean().exec();

    // Enhanced logging
    console.log('Orders by table:');
    orders.forEach((order) => {
      console.log(`Table ${order.tableNumber}:`, {
        id: order._id,
        status: order.status,
        items: order.items.length,
      });
    });

    // Group active orders by table
    const activeOrders = orders.filter((order) =>
      ['pending', 'accepted', 'preparing'].includes(order.status)
    );

    console.log(
      'Active orders by table:',
      activeOrders.reduce((acc, order) => {
        acc[order.tableNumber] = acc[order.tableNumber] || [];
        acc[order.tableNumber].push(order);
        return acc;
      }, {})
    );

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single orders
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { items, action } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    let updatedItems;
    if (action === 'add') {
      const newUnliwingsItems = items.filter(isUnliwingsItem);
      const newRegularItems = items.filter((item) => !isUnliwingsItem(item));

      // Handle regular items
      const updatedRegularItems = [
        ...order.items.filter((item) => !isUnliwingsItem(item)),
      ];
      newRegularItems.forEach((newItem) => {
        const existingItem = updatedRegularItems.find(
          (item) => item.id === newItem.id
        );
        if (existingItem) {
          existingItem.quantity += newItem.quantity;
        } else {
          updatedRegularItems.push(newItem);
        }
      });

      // Handle Unliwings
      const existingUnliwings = order.items.find(isUnliwingsItem);
      let updatedUnliwingsItems = [];

      if (existingUnliwings && newUnliwingsItems.length > 0) {
        // This is a reorder
        updatedUnliwingsItems = [
          {
            ...existingUnliwings,
            selectedFlavors: newUnliwingsItems[0].selectedFlavors,
            flavorHistory: [
              ...(existingUnliwings.flavorHistory || []),
              existingUnliwings.selectedFlavors,
            ],
            flavorOrderStatus: 'flavor_pending',
            flavorOrderStatuses: [
              ...(existingUnliwings.flavorOrderStatuses || []),
              {
                flavors: existingUnliwings.selectedFlavors,
                status: 'flavor_completed',
                orderedAt: existingUnliwings.createdAt,
                completedAt: new Date(),
              },
            ],
            originalQuantity:
              existingUnliwings.originalQuantity || existingUnliwings.quantity,
            quantity: 1,
          },
        ];
      } else if (newUnliwingsItems.length > 0) {
        // This is a new Unliwings order
        updatedUnliwingsItems = newUnliwingsItems.map((item) => ({
          ...item,
          originalQuantity: item.quantity,
          flavorHistory: [],
          flavorOrderStatus: 'flavor_pending',
          flavorOrderStatuses: [
            {
              flavors: item.selectedFlavors,
              status: 'flavor_pending',
              orderedAt: new Date(),
              completedAt: null,
            },
          ],
          orderedAt: new Date(),
        }));
      }

      updatedItems = [...updatedRegularItems, ...updatedUnliwingsItems];
    } else {
      updatedItems = items;
    }

    const total = calculateTotal(updatedItems);

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        items: updatedItems,
        total,
      },
      { new: true }
    );

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, updateType } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    let updateData = {};

    // Handle both order status and flavor status
    if (updateType === 'both') {
      updateData = {
        status,
        items: order.items.map((item) => {
          if (item.isUnliwings && item.flavorOrderStatus === 'flavor_pending') {
            return {
              ...item,
              flavorOrderStatus: 'flavor_accepted',
            };
          }
          return item;
        }),
        updatedAt: new Date(),
      };
    } else {
      updateData = {
        status,
        updatedAt: new Date(),
      };
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
    });

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch('/:id/flavor-status', async (req, res) => {
  try {
    const { itemId, status } = req.body;

    if (!VALID_FLAVOR_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid flavor status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updatedItems = order.items.map((item) => {
      if (item._id.toString() === itemId && item.isUnliwings) {
        const currentStatus =
          item.flavorOrderStatuses[item.flavorOrderStatuses.length - 1];
        return {
          ...item,
          flavorOrderStatus: status,
          flavorOrderStatuses: [
            ...item.flavorOrderStatuses.slice(0, -1),
            {
              ...currentStatus,
              status,
              completedAt:
                status === 'flavor_completed'
                  ? new Date()
                  : currentStatus.completedAt,
            },
          ],
        };
      }
      return item;
    });

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { items: updatedItems },
      { new: true }
    );

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mark order as paid
router.patch('/:id/pay', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: 'paid',
        isPaid: true,
        paidAt: new Date(),
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch('/table/:tableNumber/pay', async (req, res) => {
  try {
    const { tableNumber } = req.params;

    // Find all completed and unpaid orders for the table
    const orders = await Order.find({
      tableNumber: tableNumber.toString(),
      status: 'completed',
      isPaid: { $ne: true },
    });

    if (!orders.length) {
      return res.status(404).json({
        message: 'No unpaid orders found for table',
        tableNumber,
      });
    }

    // Update all orders to paid status
    const updatePromises = orders.map((order) =>
      Order.findByIdAndUpdate(
        order._id,
        {
          status: 'paid',
          isPaid: true,
          paidAt: new Date(),
          total: order.total, // Ensure total is saved
        },
        { new: true }
      )
    );

    const updatedOrders = await Promise.all(updatePromises);

    // Calculate total amount paid
    const totalPaid = updatedOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );

    res.json({
      success: true,
      tableNumber,
      ordersProcessed: updatedOrders.length,
      totalPaid,
      orders: updatedOrders,
    });
  } catch (error) {
    console.error('Table payment error:', error);
    res.status(400).json({
      message: error.message,
      tableNumber: req.params.tableNumber,
    });
  }
});

export default router;
