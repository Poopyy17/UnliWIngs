import { Router } from 'express';
const router = Router();
import Order from '../models/Order.js';

const validateTableNumber = (req, res, next) => {
  const { tableNumber } = req.body;
  if (!['1', '2', '3', '4'].includes(tableNumber)) {
    return res.status(400).json({ message: 'Invalid table number' });
  }
  next();
};

// Create new order
router.post('/', validateTableNumber, async (req, res) => {
  try {
    const { tableNumber, items } = req.body;

    let tableOrder = await Order.findOne({
      tableNumber,
      isPaid: false,
    });

    if (!tableOrder) {
      tableOrder = new Order({
        tableNumber,
        orders: [],
        isTableOccupied: true,
        hasInitialUnliwings: false,
      });
    }

    const nextOrderNumber = await Order.getNextOrderNumber(tableNumber);

    // Get the current highest sequence for this table
    const currentHighestSequence = Math.max(
      ...tableOrder.orders.flatMap((order) =>
        order.items
          .filter((item) => item.isUnliwings)
          .map((item) => item.orderSequence || 0)
      ),
      0
    );

    // Process items with correct sequence
    const processedItems = items.map((item) => {
      if (item.isUnliwings) {
        return {
          ...item,
          flavorOrderStatus: 'flavor_pending',
          // Increment sequence by 1 from highest current sequence
          orderSequence: item.orderSequence || currentHighestSequence + 1,
          flavorHistory: item.flavorHistory || [],
        };
      }
      return item;
    });

    // Rest of the code remains the same
    const hasInitialUnliwings = processedItems.some(
      (item) => item.isUnliwings && item.orderSequence === 1
    );

    if (hasInitialUnliwings) {
      tableOrder.hasInitialUnliwings = true;
    }

    const orderTotal = tableOrder.calculateOrderTotal(processedItems);

    const newOrder = {
      orderNumber: nextOrderNumber,
      items: processedItems,
      status: 'preparing',
      orderTotal,
    };

    tableOrder.orders.push(newOrder);

    if (items.some((item) => item.isUnliwings)) {
      tableOrder.hasUnliwings = true;
    }

    await tableOrder.save();
    res.status(201).json(tableOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).select('-__v');

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single order by ID
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get orders by table
router.get('/table/:tableNumber', async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const tableOrder = await Order.findOne({
      tableNumber,
      isPaid: false,
      isTableOccupied: true,
    });

    if (!tableOrder) {
      return res.json(null);
    }

    res.json(tableOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update order status
router.patch('/:tableNumber/order/:orderNumber/status', async (req, res) => {
  try {
    const { tableNumber, orderNumber } = req.params;
    const { status, itemId } = req.body;

    const tableOrder = await Order.findOne({
      tableNumber,
      isPaid: false,
      'orders.orderNumber': parseInt(orderNumber),
    });

    if (!tableOrder) {
      return res.status(404).json({ message: 'Table order not found' });
    }

    const order = tableOrder.orders.find(
      (o) => o.orderNumber === parseInt(orderNumber)
    );
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const item = order.items.find((i) => i._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    item.status = status;
    await tableOrder.save();

    res.json(tableOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Process payment
router.post('/:tableNumber/pay', async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const receiptNumber = `R${Date.now()}`;

    const tableOrder = await Order.findOneAndUpdate(
      { tableNumber, isPaid: false },
      {
        isPaid: true,
        isTableOccupied: false,
        receiptNumber,
        hasInitialUnliwings: false, // Reset flag
      },
      { new: true }
    );

    if (!tableOrder) {
      return res.status(404).json({ message: 'Table order not found' });
    }

    res.json({
      message: 'Payment processed',
      receiptNumber,
      grandTotal: tableOrder.grandTotal,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:orderId/generate-receipt', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { tableNumber, total } = req.body;
    const receiptNumber = `R${Date.now()}`;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          receiptNumber,
          'orders.$[].items.$[].status': 'completed',
          grandTotal: total,
          hasInitialUnliwings: false,
        },
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      receiptNumber,
      status: 'completed',
      grandTotal: total,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
