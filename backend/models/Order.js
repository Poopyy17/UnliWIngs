import { Schema, model } from 'mongoose';

const orderSchema = new Schema(
  {
    tableNumber: {
      type: String,
      required: true,
      enum: ['1', '2', '3', '4'],
    },
    hasInitialUnliwings: {
      type: Boolean,
      default: false,
    },
    orders: [
      {
        orderNumber: {
          type: Number,
          required: true,
        },
        items: [
          {
            name: {
              type: String,
              required: true,
            },
            price: {
              type: Number,
              required: true,
            },
            quantity: {
              type: Number,
              required: true,
            },
            isUnliwings: {
              type: Boolean,
              default: false,
            },
            orderSequence: {
              type: Number,
              default: 1,
            },
            selectedFlavors: {
              type: [String],
              validate: {
                validator: function (flavors) {
                  return this.isUnliwings ? flavors.length > 0 : true;
                },
                message:
                  'Unliwings orders must have at least one flavor selected',
              },
            },
            status: {
              type: String,
              enum: ['preparing', 'accepted'],
              default: 'preparing',
            },
            category: String,
            description: String,
          },
        ],
        orderTotal: {
          type: Number,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isTableOccupied: {
      type: Boolean,
      default: true,
    },
    grandTotal: {
      type: Number,
      default: 0,
    },
    hasUnliwings: {
      type: Boolean,
      default: false,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    receiptNumber: {
      type: String,
      sparse: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Calculate order total considering Unliwings logic
orderSchema.methods.calculateOrderTotal = function (orderItems) {
  return orderItems.reduce((total, item) => {
    if (
      item.isUnliwings &&
      this.hasInitialUnliwings &&
      item.orderSequence > 1
    ) {
      return total; // Only make reorders free if initial order exists
    }
    return total + item.price * item.quantity;
  }, 0);
};

// Update grand total
orderSchema.pre('save', async function (next) {
  if (this.isModified('orders')) {
    // Set hasUnliwings flag if any order has Unliwings
    this.hasUnliwings = this.orders.some((order) =>
      order.items.some((item) => item.isUnliwings)
    );

    // Calculate grand total
    this.grandTotal = this.orders.reduce(
      (total, order) => total + order.orderTotal,
      0
    );
  }
  next();
});

orderSchema.pre('save', async function (next) {
  if (this.isModified('orders')) {
    // Check for initial unliwings order
    const hasInitialUnliwings = this.orders.some((order) =>
      order.items.some((item) => item.isUnliwings && item.orderSequence === 1)
    );

    this.hasInitialUnliwings = hasInitialUnliwings;

    // Calculate grand total
    this.grandTotal = this.orders.reduce(
      (total, order) => total + order.orderTotal,
      0
    );
  }

  // Reset hasInitialUnliwings when order is paid
  if (this.isModified('isPaid') && this.isPaid) {
    this.hasInitialUnliwings = false;
  }

  next();
});

// Get next order number for table
orderSchema.statics.getNextOrderNumber = async function (tableNumber) {
  const table = await this.findOne({ tableNumber });
  return table ? table.orders.length + 1 : 1;
};

export default model('Order', orderSchema);
