const express = require('express');
const cookieParser = require('cookie-parser');

// ROUTES
const authRoutes = require('./routes/auth.routes')
const chatRoutes = require('./routes/chat.routes')

const app = express();


// MIDDLEWARE
app.use(express.json());
app.use(cookieParser())

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);


module.exports = app;