const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: { origin: "*" } // Allows students to connect from any frontend URL
});

// Simple Booking Schema
const BookingSchema = new mongoose.Schema({
    movieId: String,
    seatId: String,
    userEmail: String
});
const Booking = mongoose.model('Booking', BookingSchema);

// Real-time logic
io.on('connection', (socket) => {
    console.log('A student connected:', socket.id);

    // When a student clicks a seat
    socket.on('bookSeat', async (data) => {
        // Broadcast to everyone else immediately
        io.emit('seatUpdated', data.seatId); 
        
        // Save to DB in background
        const newBooking = new Booking(data);
        await newBooking.save();
    });
});

mongoose.connect(process.env.MONGO_URI).then(() => {
    server.listen(5000, () => console.log('Server running on port 5000'));
});