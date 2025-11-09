import { Admin } from "../models/adminModels.js";
import bcrypt from "bcryptjs";

export const listAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}).select("username email role status");
    const users = admins.map((u) => ({
      id: u._id.toString(),
      name: u.username,
      email: u.email,
      role: u.role,
      status: u.status || "Active",
    }));
    return res.status(200).json({ users });
  } catch (err) {
    console.error("createAdmin error:", err);
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, role, status } = req.body || {};
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "name, email, password, role are required" });
    }
    const exists = await Admin.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    let storeRole = role;
    const map = { Admin: "admin", "Office Admin": "officeAdmin", Showroom: "showroom", Customer: "showroom" };
    if (map[role]) storeRole = map[role];

    const hashed = await bcrypt.hash(password, 10);
    const user = await Admin.create({ username: name, email, password: hashed, role: storeRole, status: status || "Active" });
    return res.status(201).json({
      user: { id: user._id.toString(), name: user.username, email: user.email, role: user.role, status: user.status || "Active" },
    });
  } catch (err) {
    console.error("createAdmin error:", err);
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status } = req.body || {};
    const update = {};
    if (name) update.username = name;
    if (email) update.email = email;
    if (role) {
      const map = { Admin: "admin", "Office Admin": "officeAdmin", Showroom: "showroom", Customer: "showroom" };
      update.role = map[role] || role;
    }
    if (status) update.status = status;
    if (password) update.password = await bcrypt.hash(password, 10);

    const user = await Admin.findByIdAndUpdate(id, update, { new: true });
    if (!user) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({
      user: { id: user._id.toString(), name: user.username, email: user.email, role: user.role, status: user.status || "Active" },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Admin.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

