module.exports = (database, Sequelize) => {

    return database.define("utility_meters", {

        meter_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },

        meter_type: {
            type: Sequelize.ENUM(
                "ELECTRICITY",
                "WATER"
            ),
            allowNull: false
        },

        meter_number: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },

        meter_name: {
            type: Sequelize.STRING
        },

        location: {
            type: Sequelize.STRING
        },

        unit: {
            type: Sequelize.STRING,
            allowNull: false
        },

        status: {
            type: Sequelize.ENUM(
                "ACTIVE",
                "INACTIVE",
                "MAINTENANCE"
            ),
            defaultValue: "ACTIVE"
        },

        installed_at: {
            type: Sequelize.DATE
        },

        created_at: {
            type: Sequelize.DATE
        },

        updated_at: {
            type: Sequelize.DATE
        }

    }, {

        tableName: "utility_meters",

        timestamps: false

    });

};