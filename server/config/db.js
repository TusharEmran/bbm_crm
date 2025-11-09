import mongoose from "mongoose";
export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true
        })
        const c = mongoose.connection;
        console.log(
            `MongoDB connected successfully -> host: ${c.host}, db: ${c.name}, port: ${c.port}`
        );
    } catch (error) {
        return console.error("MongoDB connection error:", error);
    }
};
