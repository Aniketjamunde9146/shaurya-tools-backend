import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import aiRoute from "./routes/ai.js";

dotenv.config();

const app = express();

/* =========================
   CORS Configuration
========================= */

app.use(
  cors({
    origin: [
      "http://localhost:5173",                 // Local dev
      "https://shaurya-tools.vercel.app"       // Your frontend domain
    ],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

/* =========================
   Middlewares
========================= */

app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // 100 requests per IP
  message: {
    success: false,
    error: "Too many requests. Please try again later."
  }
});

app.use(limiter);

/* =========================
   Health Check Route
========================= */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Shaurya Tools Backend is running 🚀"
  });
});

/* =========================
   API Routes
========================= */

app.use("/api/ai", aiRoute);

/* =========================
   404 Handler
========================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found"
  });
});

/* =========================
   Global Error Handler
========================= */

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err.message);

  res.status(500).json({
    success: false,
    error: "Internal Server Error"
  });
});

/* =========================
   Server Start
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
