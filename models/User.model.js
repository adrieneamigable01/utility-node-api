module.exports = (database, Sequelize) => {

    return database.define("users", {

        // ==========================================
        // PRIMARY KEY
        // ==========================================
        userid: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },

        // ==========================================
        // NAME
        // ==========================================
        lastname: {
            type: Sequelize.STRING,
            allowNull: false
        },

        firstname: {
            type: Sequelize.STRING,
            allowNull: false
        },

        middlename: {
            type: Sequelize.STRING,
            allowNull: true
        },

        // ==========================================
        // CONTACT
        // ==========================================
        email: {
            type: Sequelize.STRING,
            allowNull: true,
            unique: true
        },

        mobile_number: {
            type: Sequelize.STRING,
            allowNull: true
        },

        // ==========================================
        // PASSWORD
        // ==========================================
        password: {
            type: Sequelize.STRING,
            allowNull: false
        },

        // ==========================================
        // BIRTHDATE
        // ==========================================
        birthdate: {
            type: Sequelize.DATEONLY,
            allowNull: true
        },

        // ==========================================
        // USER TYPE
        // ==========================================
        usertype: {
            type: Sequelize.STRING,
            allowNull: false
        },

        // ==========================================
        // ROLE
        // ==========================================
        role: {
            type: Sequelize.STRING,
            allowNull: false
        },

        // ==========================================
        // DATE ADDED
        // ==========================================
        date_added: {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: Sequelize.NOW
        },

        // ==========================================
        // USER IMAGE
        // ==========================================
        user_image: {
            type: Sequelize.STRING,
            allowNull: true
        },

        // ==========================================
        // ACTIVE
        // ==========================================
        is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: true,
            defaultValue: true
        },

        // ==========================================
        // LAST PASSWORD UPDATE
        // ==========================================
        last_password_update: {
            type: Sequelize.DATE,
            allowNull: true
        }

    }, {

        // ==========================================
        // TABLE SETTINGS
        // ==========================================
        tableName: "users",

        timestamps: false

    });

};