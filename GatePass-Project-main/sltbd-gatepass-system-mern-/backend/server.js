const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const userRoutes = require('./routes/userRoutes');
const itemRoutes = require('./routes/itemRoutes');
const myReceiptRoutes = require('./routes/myReceiptRoutes');
const approveRoutes = require('./routes/approvalRoutes');
const verifyRoutes = require('./routes/verifyRoutes');
const dispatchRoutes = require('./routes/dispatchroutes');
const adminRouters = require('./routes/adminRoutes');
const receiveRoutes = require('./routes/receiveRoutes');
const emailRoutes = require('./routes/emailRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const healthRouter = require('./routes/health');



mongoose.set('strictQuery', false);

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors());

app.use('/api', healthRouter);  // DEVOPS update 12/16/2025 Add a Health check endpoint
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/item', itemRoutes);
app.use('/api/reicept', myReceiptRoutes);
app.use('/api/approve', approveRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/admin', adminRouters);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/receive', receiveRoutes);
app.use('/api/email', emailRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
