require("dotenv").config();
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);

let db;

const connectDB = async () => {
  try {
    await client.connect();
    db = client.db("wedplan");

    console.log("MongoDB Connected Successfully! 🎉");
    return db;
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

const getDB = () => {
  if (!db) {
    throw new Error("Database is not connected yet!");
  }
  return db;
};

module.exports = { connectDB, getDB };
