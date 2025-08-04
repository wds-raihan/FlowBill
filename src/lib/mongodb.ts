/**
 * MongoDB Connection Utilities
 *
 * This file provides two methods for connecting to MongoDB:
 * 1. Direct connection using the MongoDB native driver (clientPromise)
 * 2. Mongoose connection for schema-based operations (connectDB)
 *
 * Both methods implement connection pooling and caching for optimal performance.
 */

import { MongoClient, MongoClientOptions } from "mongodb";
import mongoose, { ConnectOptions } from "mongoose";
import { GlobalWithMongo, CachedMongoose, GlobalWithMongoose } from "@/types/mongodb";

// Validate environment variable
if (!process.env.MONGODB_URI) {
  throw new Error(
    'Missing environment variable: "MONGODB_URI". Please define it in your .env.local file.'
  );
}

const MONGODB_URI = process.env.MONGODB_URI;
const isDevelopment = process.env.NODE_ENV === "development";

// =========================================================
// MongoDB Native Driver Connection (for NextAuth and direct operations)
// =========================================================

// Define MongoDB client options
const mongoClientOptions: MongoClientOptions = {
  // Add any specific options here if needed
};

// Setup MongoDB connection with caching for development
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (isDevelopment) {
  // In development, use a global variable to preserve connection across HMR
  const globalWithMongo = global as unknown as GlobalWithMongo;

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI, mongoClientOptions);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production, create a new connection
  client = new MongoClient(MONGODB_URI, mongoClientOptions);
  clientPromise = client.connect();
}

// Export MongoDB client promise for use with NextAuth and direct MongoDB operations
export default clientPromise;

// =========================================================
// Mongoose Connection (for schema-based operations)
// =========================================================

// Setup mongoose connection caching
const globalWithMongoose = global as unknown as GlobalWithMongoose;

// Initialize cache
if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = { conn: null, promise: null };
}

const cached = globalWithMongoose.mongoose;

// Mongoose connection options
const mongooseConnectOptions: ConnectOptions = {
  bufferCommands: false,
  // Add any other Mongoose-specific options here
};

/**
 * Connects to MongoDB using Mongoose with connection pooling
 *
 * @returns Mongoose connection instance
 */
export async function connectDB(): Promise<typeof mongoose> {
  // Return existing connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // Create new connection promise if none exists
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, mongooseConnectOptions)
      .then((mongoose) => {
        console.log("MongoDB connected successfully via Mongoose");
        return mongoose;
      })
      .catch((err) => {
        console.error("MongoDB connection error:", err);
        cached.promise = null;
        throw err;
      });
  }

  // Wait for connection to resolve
  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}