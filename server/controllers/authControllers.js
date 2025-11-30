import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin } from "../models/adminModels.js";
import { JWT_SECRET, JWT_SIGN_OPTS as SIGN_OPTS } from "../config/jwtConfig.js";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "none",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "email and password are required" });

    const user = await Admin.findOne({ email });
    if (!user) {
      console.log("No user found with email:", email);
      return res.status(401).json({

        message: "Invalid credentials"
      });
    }

    if (user.status === "Suspend") return res.status(403).json({ message: "Account suspended" });

    let ok = false;
    try {
      ok = await bcrypt.compare(password, user.password || "");
    } catch { }
    if (!ok) {

      if ((user.password || "") === password) {
        const newHash = await bcrypt.hash(password, 10);
        try { await Admin.findByIdAndUpdate(user._id, { password: newHash }); } catch { }
        ok = true;
      }
    }
    if (!ok) {
      console.log("Password mismatch for user:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const canonical = (v) => (v || "").toString().replace(/[^a-z]/gi, "").toLowerCase();
    const roleKey = canonical(user.role);
    const roleMap = { admin: "admin", officeAdmin: "officeAdmin", showroom: "showroom", customer: "showroom", office: "officeAdmin" };
    const normRole = roleMap[roleKey] || (['admin', 'officeAdmin', 'showroom'].includes(user.role) ? user.role : 'showroom');

    const token = jwt.sign({ id: user._id.toString(), role: normRole }, JWT_SECRET, SIGN_OPTS);
    try { res.cookie("token", token, COOKIE_OPTS); } catch { }
    return res.status(200).json({
      token,
      user: {
        id: user._id.toString(),
        name: user.username,
        email: user.email,
        role: normRole,
        status: user.status || "Active",
        showroomName: user.showroomName || "",
      },
    });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const logout = async (req, res) => {
  try { res.clearCookie("token", { ...COOKIE_OPTS, maxAge: 0 }); } catch { }
  return res.status(200).json({ message: "Logged out" });
};

export const me = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await Admin.findById(userId).select("username email role status showroomName");
    if (!user) {
      console.log("User not found for ID:", userId);
      return res.status(401).json({ message: "Not user" });
    }
    if (user.status === "Suspend") return res.status(403).json({ message: "Account suspended" });
    return res.status(200).json({
      user: {
        id: user._id.toString(),
        name: user.username,
        email: user.email,
        role: user.role,
        status: user.status || "Active",
        showroomName: user.showroomName || "",
      },
    });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};


