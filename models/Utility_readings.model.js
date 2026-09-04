module.exports = (database, Sequelize) => {

    return database.define("utility_readings", {

        reading_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },

        meter_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false
        },

        reading_value: {
            type: Sequelize.DECIMAL(15, 4),
            allowNull: false
        },

        consumption: {
            type: Sequelize.DECIMAL(15, 4)
        },

        // =============================
        // ELECTRICITY
        // =============================

        voltage: {
            type: Sequelize.DECIMAL(10, 2)
        },

        current: {
            type: Sequelize.DECIMAL(10, 2)
        },

        power_kw: {
            type: Sequelize.DECIMAL(10, 4)
        },

        power_factor: {
            type: Sequelize.DECIMAL(5, 3)
        },

        // =============================
        // WATER
        // =============================

        flow_rate: {
            type: Sequelize.DECIMAL(15, 4)
        },

        recorded_at: {
            type: Sequelize.DATE,
            allowNull: false
        },

        created_at: {
            type: Sequelize.DATE
        }

    }, {

        tableName: "utility_readings",

        timestamps: false

    });

};