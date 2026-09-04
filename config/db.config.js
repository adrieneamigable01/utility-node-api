// module.exports = {
//   HOST: process.env.DB_HOST || "localhost", // or "148.222.53.10"
//   USER: process.env.DB_USER || "root",
//   PASSWORD: process.env.DB_PASS || "",
//   DB: process.env.DB_NAME || "utility_monitoring",
//   dialect: "mysql",
//   pool: {
//     max: 5,
//     min: 0,
//     acquire: 30000,
//     idle: 10000
//   }
// };


module.exports = {
  HOST: process.env.DB_HOST || "localhost", // or "148.222.53.10"
  USER: process.env.DB_USER || "root",
  PASSWORD: process.env.DB_PASS || "",
  DB: process.env.DB_NAME || "utility_monitoring",
  dialect: "mysql",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};
