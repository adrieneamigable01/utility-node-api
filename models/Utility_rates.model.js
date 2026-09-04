module.exports = (database, Sequelize) => {

    return database.define("utility_rates", {

        rate_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },

        utility_type: {
            type: Sequelize.ENUM(
                "ELECTRICITY",
                "WATER"
            ),
            allowNull: false
        },

        rate: {
            type: Sequelize.DECIMAL(12, 4),
            allowNull: false
        },

        unit: {
            type: Sequelize.STRING,
            allowNull: false
        },

        provider: {
            type: Sequelize.STRING
        },

        effective_date: {
            type: Sequelize.DATEONLY,
            allowNull: false
        },

        end_date: {
            type: Sequelize.DATEONLY
        },

        status: {
            type: Sequelize.ENUM(
                "ACTIVE",
                "INACTIVE"
            ),
            defaultValue: "ACTIVE"
        },

        created_at: {
            type: Sequelize.DATE
        }

    }, {

        tableName: "utility_rates",

        timestamps: false

    });

};