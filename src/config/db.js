const mongoose = require("mongoose");

let pending = null;

// Safe to call many times. On Vercel every request can start a fresh function,
// so the connection is created once and then reused.
module.exports = function connectDB() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();

  if (!pending) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return Promise.reject(
        new Error("MONGODB_URI is not set. Copy .env.example to .env and fill it in.")
      );
    }
    pending = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 5 })
      .catch((err) => {
        pending = null; // let the next request try again
        throw err;
      });
  }
  return pending;
};
