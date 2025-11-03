import mongoose from 'mongoose';

// MongoDB connection
const connectToDb = async () => {
  try {
    const mongo = await mongoose.connect(
      "mongodb://localhost:27017/discordClone"
    );
    console.log("MongoDB connected successfully:", mongo.connection.name);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
};

// connectToDb();
export default connectToDb;
