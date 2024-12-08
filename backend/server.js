import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import ordersRouter from './routes/orders.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Database connected'))
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1); // Exit the process with an error code
  });

// Routes
app.use('/api/orders', ordersRouter);

// Root route
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Test database connection route
app.get('/test-db', async (req, res) => {
  try {
    const result = await mongoose.connection.db.admin().ping();
    res.send('Database connection is working');
  } catch (err) {
    res.status(500).send('Database connection error');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
