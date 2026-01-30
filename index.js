const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. Updated Express CORS - Removed the trailing slash!
const allowedOrigin = "https://livewirebooking.vercel.app"; 

app.use(cors({
    origin: allowedOrigin,
    methods: ["GET", "POST"]
}));

app.get('/', (req, res) => {
    res.send("🎬 BookMyShow Clone Backend is Live!");
});

const server = http.createServer(app);

// 2. Updated Socket.io CORS - Removed trailing slash and added credentials
const io = new Server(server, {
    cors: {
        origin: allowedOrigin, // EXACT match, no "/" at the end
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true // Helps with older socket client compatibility
});

const BookingSchema = new mongoose.Schema({
    movieId: { type: String, required: true },
    seatId: { type: String, required: true },
    userEmail: { type: String, default: 'student@example.com' },
    bookedAt: { type: Date, default: Date.now }
});
const Booking = mongoose.model('Booking', BookingSchema);

io.on('connection', async (socket) => {
    console.log('New student connected:', socket.id);

    try {
        const existingBookings = await Booking.find({ movieId: 'movie123' });
        const bookedSeatIds = existingBookings.map(b => b.seatId);
        socket.emit('initialSeats', bookedSeatIds);
    } catch (err) {
        console.error("Error fetching initial seats:", err);
    }

    socket.on('bookSeat', async (data) => {
        try {
            const exists = await Booking.findOne({ movieId: data.movieId, seatId: data.seatId });
            if (exists) return;

            io.emit('seatUpdated', data.seatId); 
            
            const newBooking = new Booking(data);
            await newBooking.save();
        } catch (err) {
            console.error("Booking error:", err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Student disconnected');
    });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ Connected to MongoDB Atlas");
        server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err.message);
    });