import { Category } from "../models/categoryModel.js";

export const listCategories = async (req, res) => {
  try {
    const cats = await Category.find({}).select("name description status createdAt");
    const categories = cats.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      description: c.description || "",
      status: c.status || "Active",
      createdAt: c.createdAt,
    }));
    return res.status(200).json({ categories });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description = "", status = "Active" } = req.body || {};
    if (!name) return res.status(400).json({ message: "name is required" });
    const exists = await Category.findOne({ name: name.trim() });
    if (exists) return res.status(409).json({ message: "Category already exists" });

    const category = await Category.create({ name: name.trim(), description, status });
    return res.status(201).json({
      category: {
        id: category._id.toString(),
        name: category.name,
        description: category.description || "",
        status: category.status || "Active",
        createdAt: category.createdAt,
      },
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Category already exists" });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body || {};
    const update = {};
    if (name) update.name = name.trim();
    if (typeof description === "string") update.description = description;
    if (status) update.status = status;

    const category = await Category.findByIdAndUpdate(id, update, { new: true });
    if (!category) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({
      category: {
        id: category._id.toString(),
        name: category.name,
        description: category.description || "",
        status: category.status || "Active",
        createdAt: category.createdAt,
      },
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Category name already exists" });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

