import { Schema, model } from 'mongoose';

const orderSchema = new Schema(
  {
    tableNumber: {
      type: String,
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
      },
    ],
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'completed', 'paid'],
      default: 'pending',
    },
    receiptNumber: {
      type: String,
      sparse: true, // Only index non-null values
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Create sparse index for receiptNumber
orderSchema.index({ receiptNumber: 1 }, { sparse: true });

export default model('Order', orderSchema);
