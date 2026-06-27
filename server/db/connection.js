import mongoose from "mongoose";

let connectionPromise = null;
let lastConnectionError = "";

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

export function databaseHealth() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return {
    mode: "mongo",
    ready: isDatabaseReady(),
    state: states[mongoose.connection.readyState] || "unknown",
    host: mongoose.connection.host || "",
    name: mongoose.connection.name || "",
    lastError: lastConnectionError
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required. This chatbot does not use a local in-memory store.");
  }

  if (isDatabaseReady()) return { connected: true, mode: "mongo" };

  if (!connectionPromise) {
    mongoose.set("strictQuery", true);
    connectionPromise = (async () => {
      const attempts = Math.max(1, Math.min(Number(process.env.MONGODB_CONNECT_RETRIES || 3), 10));
      let lastError;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10),
            minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE || 1),
            serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10000),
            socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS || 45000),
            heartbeatFrequencyMS: Number(process.env.MONGODB_HEARTBEAT_FREQUENCY_MS || 10000),
            retryWrites: true
          });
          lastConnectionError = "";
          console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
          return { connected: true, mode: "mongo" };
        } catch (error) {
          lastError = error;
          lastConnectionError = error.message;
          if (attempt < attempts) {
            console.warn(`MongoDB connection attempt ${attempt}/${attempts} failed: ${error.message}`);
            await wait(Math.min(1000 * attempt, 5000));
          }
        }
      }
      connectionPromise = null;
      throw lastError;
    })();
  }

  return connectionPromise;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

mongoose.connection.on("error", (error) => {
  lastConnectionError = error.message;
});
