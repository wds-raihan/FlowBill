/**
 * MongoDB Type Definitions
 *
 * This file contains TypeScript type definitions related to MongoDB connections
 * and database operations.
 */

import { MongoClient } from "mongodb";
import mongoose from "mongoose";

/**
 * Global MongoDB client type for development environment
 */
export interface GlobalWithMongo extends Global {
  _mongoClientPromise?: Promise<MongoClient>;
}

/**
 * Cached Mongoose connection type
 */
export interface CachedMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

/**
 * Global Mongoose connection type for development environment
 */
export interface GlobalWithMongoose extends NodeJS.Global {
  mongoose?: CachedMongoose;
}
