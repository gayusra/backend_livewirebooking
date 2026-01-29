const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. Better CORS Configuration (Allows Browser and Vercel)
app.use(cors());

// Health Check Route (Fixes the "Cannot GET /" error)
app.get('/', (req, res) => {
    res.send("🎬 BookMyShow Clone Backend is Live!");
});

const server = http.createServer(app);

// 2. Initialize Socket.io with proper settings
const io = new Server(server, {
    cors: {
        origin: "*", // In production, replace with your Vercel URL
        methods: ["GET", "POST"]
    }
});

// 3. Define Booking Schema
const BookingSchema = new mongoose.Schema({
    movieId: { type: String, required: true },
    seatId: { type: String, required: true },
    userEmail: { type: String, default: 'student@example.com' },
    bookedAt: { type: Date, default: Date.now }
});
const Booking = mongoose.model('Booking', BookingSchema);

// 4. Real-time Logic with Persistence
io.on('connection', async (socket) => {
    console.log('New student connected:', socket.id);

    try {
        // FETCH EXISTING BOOKINGS: When a student connects, send them all currently booked seats
        // This ensures the red seats stay red even after a page refresh
        const existingBookings = await Booking.find({ movieId: 'movie123' });
        const bookedSeatIds = existingBookings.map(b => b.seatId);
        
        socket.emit('initialSeats', bookedSeatIds);
        console.log(`Sent ${bookedSeatIds.length} existing bookings to ${socket.id}`);
    } catch (err) {
        console.error("Error fetching initial seats:", err);
    }

    // Handle new booking events
    socket.on('bookSeat', async (data) => {
        try {
            // Check if seat is already booked (Double-check logic)
            const exists = await Booking.findOne({ movieId: data.movieId, seatId: data.seatId });
            if (exists) return;

            // Broadcast to EVERYONE immediately for real-time feel
            io.emit('seatUpdated', data.seatId); 
            
            // Save to Database
            const newBooking = new Booking(data);
            await newBooking.save();
            console.log(`Seat ${data.seatId} booked successfully.`);
        } catch (err) {
            console.error("Booking error:", err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Student disconnected');
    });
});

// 5. Dynamic Port for Render (Crucial!)
const PORT = process.env.PORT || 5000;

// 6. Connect to MongoDB and Start Server
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ Connected to MongoDB Atlas");
        server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err.message);
    });