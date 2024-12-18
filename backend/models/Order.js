import { Schema, model } from 'mongoose';

const orderSchema = new Schema(
  {
    tableNumber: {
      type: String,
      required: true,
      enum: ['1', '2', '3', '4'],
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
        originalQuantity: {
          type: Number,
        },
        selectedFlavors: [String],
        flavorHistory: [[String]], // Array of flavor arrays
        flavorOrderStatus: {
          type: String,
          enum: ['flavor_pending', 'flavor_accepted', 'flavor_completed'],
          default: 'flavor_pending',
        },
        flavorOrderStatuses: [
          {
            flavors: [String],
            status: {
              type: String,
              enum: ['flavor_pending', 'flavor_accepted', 'flavor_completed'],
              default: 'flavor_pending',
            },
            orderedAt: Date,
            completedAt: Date,
          },
        ],
        category: String,
        description: String,
      },
    ],
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'preparing', 'completed', 'paid'],
      default: 'pending',
    },
    receiptNumber: {
      type: String,
      sparse: true,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

orderSchema.index({ receiptNumber: 1 }, { sparse: true });

export default model('Order', orderSchema);
