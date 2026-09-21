import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import aiRoute from "./routes/ai.js";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const app = express();
app.disable("x-powered-by");
app.use(helmet());

/* =========================
   CORS Configuration
========================= */

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://shauryatools.vercel.app",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true,
  })
);

/* =========================
   Middlewares
========================= */

app.use(express.json({ limit: "32kb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.setHeader("Retry-After", "900");
    return res.status(429).json({
      success: false,
      error: "Too many requests. Please try again later.",
    });
  },
});

app.use(limiter);

/* =========================
   Health Route
========================= */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Shaurya Tools Backend Running 🚀"
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

  const status = err.type === "entity.parse.failed" || err.type === "entity.too.large"
    ? 400
    : 500;

  res.status(status).json({
    success: false,
    error: status === 400 ? "Invalid JSON request body" : "Internal Server Error"
  });
});

/* =========================
   Server Start
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
