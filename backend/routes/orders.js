import { Router } from 'express';
const router = Router();
import Order from '../models/Order.js';

const generateReceiptNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `R${timestamp.slice(-6)}${random}`;
};

const VALID_STATUSES = ['pending', 'preparing', 'completed', 'paid'];

// Create new order
router.post('/', async (req, res) => {
  try {
    const { tableNumber, items, orderId } = req.body;

    let order;
    if (orderId) {
      // If orderId exists, find and update existing order
      order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Merge existing items with new items
      const updatedItems = [...order.items];
      items.forEach((newItem) => {
        const existingItem = updatedItems.find(
          (item) => item.name === newItem.name
        );
        if (existingItem) {
          existingItem.quantity += newItem.quantity;
        } else {
          updatedItems.push(newItem);
        }
      });

      // Update total
      const total = updatedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      order = await Order.findByIdAndUpdate(
        orderId,
        {
          items: updatedItems,
          total,
        },
        { new: true }
      );
    } else {
      // Create new order
      const total = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      order = new Order({
        tableNumber,
        items,
        total,
        status: 'pending',
      });

      order = await order.save();
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Generate receipt
router.post('/:id/receipt', async (req, res) => {
  try {
    const orderId = req.params.id;
    const receiptNumber = generateReceiptNumber();

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        receiptNumber,
        status: 'completed',
        receiptGeneratedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ receiptNumber: updatedOrder.receiptNumber });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

// Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
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
      // Merge existing items with new items
      updatedItems = [...order.items];
      items.forEach((newItem) => {
        const existingItem = updatedItems.find(
          (item) => item.name === newItem.name
        );
        if (existingItem) {
          existingItem.quantity += newItem.quantity;
        } else {
          updatedItems.push(newItem);
        }
      });
    } else {
      // Replace items
      updatedItems = items;
    }

    const total = updatedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

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
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status,
        updatedAt: new Date(),
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

export default router;
