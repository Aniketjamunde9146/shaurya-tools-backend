import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import aiRoute from "./routes/ai.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://shaurya-tools.vercel.app"
  ],
  methods: ["GET", "POST"],
  credentials: true
}));


app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);

app.use("/api/ai", aiRoute);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
