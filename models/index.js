/**
 * Sequelize Models
 * Utility Monitoring API
 */

const dbConfig = require("../config/db.config");
const Sequelize = require("sequelize");

const database = new Sequelize(
    dbConfig.DB,
    dbConfig.USER,
    dbConfig.PASSWORD,
    {
        host: dbConfig.HOST,
        dialect: dbConfig.dialect,

        pool: {
            max: dbConfig.pool.max,
            min: dbConfig.pool.min,
            acquire: dbConfig.pool.acquire,
            idle: dbConfig.pool.idle
        }
    }
);

const db = {};


// =====================================================
// DATABASE
// =====================================================

db.Sequelize = Sequelize;
db.databaseConf = database;


// =====================================================
// DROP AND RE-SYNC DATABASE
// =====================================================

db.dropRestApiTable = () => {

    db.databaseConf.sync({ force: true })
        .then(() => {

            console.log(
                "Database tables just dropped and db re-synced."
            );

        })
        .catch((error) => {

            console.error(
                "DATABASE SYNC ERROR:",
                error
            );

        });

};


// =====================================================
// USER MODEL
// =====================================================

db.users = require("./User.model")(
    database,
    Sequelize
);


// =====================================================
// UTILITY MODELS
// =====================================================

db.utility_meters =
    require("./Utility_meters.model")(
        database,
        Sequelize
    );


db.utility_readings =
    require("./Utility_readings.model")(
        database,
        Sequelize
    );


db.utility_rates =
    require("./Utility_rates.model")(
        database,
        Sequelize
    );


db.utility_alerts =
    require("./Utility_alerts.model")(
        database,
        Sequelize
    );


// =====================================================
// UTILITY RELATIONSHIPS
// =====================================================


// -----------------------------------------------------
// METER -> READINGS
// -----------------------------------------------------

db.utility_meters.hasMany(
    db.utility_readings,
    {
        foreignKey: "meter_id",
        as: "readings"
    }
);


db.utility_readings.belongsTo(
    db.utility_meters,
    {
        foreignKey: "meter_id",
        as: "meter"
    }
);


// -----------------------------------------------------
// METER -> ALERTS
// -----------------------------------------------------

db.utility_meters.hasMany(
    db.utility_alerts,
    {
        foreignKey: "meter_id",
        as: "alerts"
    }
);


db.utility_alerts.belongsTo(
    db.utility_meters,
    {
        foreignKey: "meter_id",
        as: "meter"
    }
);


// -----------------------------------------------------
// READING -> ALERTS
// -----------------------------------------------------

db.utility_readings.hasMany(
    db.utility_alerts,
    {
        foreignKey: "reading_id",
        as: "alerts"
    }
);


db.utility_alerts.belongsTo(
    db.utility_readings,
    {
        foreignKey: "reading_id",
        as: "reading"
    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = db;