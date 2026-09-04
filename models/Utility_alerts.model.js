module.exports = (database, Sequelize) => {

    return database.define("utility_alerts", {

        alert_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },

        meter_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false
        },

        alert_type: {
            type: Sequelize.ENUM(
                "HIGH_USAGE",
                "LOW_USAGE",
                "LEAK_DETECTED",
                "HIGH_POWER",
                "VOLTAGE_ABNORMAL",
                "OFFLINE",
                "OTHER"
            ),
            allowNull: false
        },

        severity: {
            type: Sequelize.ENUM(
                "INFO",
                "WARNING",
                "CRITICAL"
            ),
            defaultValue: "WARNING"
        },

        message: {
            type: Sequelize.STRING(500),
            allowNull: false
        },

        reading_id: {
            type: Sequelize.BIGINT.UNSIGNED
        },

        status: {
            type: Sequelize.ENUM(
                "OPEN",
                "ACKNOWLEDGED",
                "RESOLVED"
            ),
            defaultValue: "OPEN"
        },

        created_at: {
            type: Sequelize.DATE
        },

        resolved_at: {
            type: Sequelize.DATE
        }

    }, {

        tableName: "utility_alerts",

        timestamps: false

    });

};