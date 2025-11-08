import dotenv from "dotenv"
// Load environment variables FIRST before any other imports
dotenv.config();

import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js"
import userRouter from "./routes/adminsRoute.js"
const app = express();

const PORT = process.env.PORT || 5000;

// Support multiple origins via comma-separated env (CORS_ORIGINS or CORS_ORIGIN)
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: ALLOWED_ORIGINS,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions));
// Explicitly handle preflight for all routes
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api/user', userRouter);
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});