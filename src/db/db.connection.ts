import { connect } from "mongoose";
import { UserModel } from "./model/User.model";

const connectDB = async (): Promise<void> => {
  try {
    const result = await connect(process.env.MONGO_URI as string, {
      serverSelectionTimeoutMS: 30000,
    });

    await UserModel.syncIndexes();
    

    console.log(result.models);
    console.log("MongoDB connected ========= ✅ ");
  } catch (error) {
    console.log(`MongoDB connection error ❌ `);
  }
};

export default connectDB;
