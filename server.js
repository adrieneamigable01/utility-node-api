const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./models");

const app = express();

/**
 * ✅ CORS — Flutter Web SAFE
 */
app.use(cors({
  origin: true,          // 🔥 allow ALL origins
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: false     // 🔥 MUST be false
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * ✅ HTTP + SOCKET.IO
 */
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST"]
  },
  transports: ["polling", "websocket"], // 🔥 VERY IMPORTANT
  allowEIO3: true
});

// Make io accessible in controllers
app.set("io", io);

/**
 * ✅ SOCKET EVENTS
 */
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

/**
 * ✅ ROUTES
 */
const apiRoutes = require("./routes/index");
app.use("/", apiRoutes);




/**
 * ✅ DB
 */
db.databaseConf.sync();

/**
 * ✅ START SERVER
 */
const PORT = 8080;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
