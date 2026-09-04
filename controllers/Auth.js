// controllers/Auth.js

const db = require("../models");

const User = db.users;

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const { jwtSecret } = require("../constants/Jwtconstants");


// ======================================================
// LOGIN
// ======================================================

exports.login = async (req, res) => {

    const {
        email,
        password
    } = req.body;

    


    // ==========================================
    // VALIDATION
    // ==========================================

    
    
    if (!email || !password) {

        return res.status(400).send({

            data: null,

            isError: true,

            message: "Email and password are required."

        });

    }





    try {

        // ==========================================
        // FIND USER
        // ==========================================

        const user = await User.findOne({

            where: {
                email: email
            }

        });


        if (!user) {

            return res.status(401).send({

                data: null,

                isError: true,

                message: "Invalid email or password."

            });

        }


        // ==========================================
        // CHECK ACCOUNT STATUS
        // ==========================================

        if (user.is_active === false) {

            return res.status(403).send({

                data: null,

                isError: true,

                message: "Your account is inactive."

            });

        }


        // ==========================================
        // CHECK PASSWORD
        // ==========================================

        const passwordIsValid =
            bcrypt.compareSync(
                password,
                user.password
            );


        if (!passwordIsValid) {

            return res.status(401).send({

                data: null,

                isError: true,

                message: "Invalid email or password."

            });

        }


        // ==========================================
        // CREATE JWT
        // ==========================================

        const token = jwt.sign(

            {
                user: {

                    userid: user.userid,

                    lastname: user.lastname,

                    firstname: user.firstname,

                    middlename: user.middlename,

                    email: user.email,

                    mobile_number:
                        user.mobile_number,

                    usertype: user.usertype,

                    role: user.role

                }
            },

            jwtSecret,

            {
                expiresIn: 86400
            }

        );


        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).send({

            data: {

                userid: user.userid,

                lastname: user.lastname,

                firstname: user.firstname,

                middlename: user.middlename,

                email: user.email,

                mobile_number:
                    user.mobile_number,

                birthdate:
                    user.birthdate,

                usertype:
                    user.usertype,

                role:
                    user.role,

                user_image:
                    user.user_image,

                is_active:
                    user.is_active,

                accessToken: token

            },

            isError: false,

            message: "Success Login"

        });


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );


        return res.status(500).send({

            data: null,

            isError: true,

            message:
                error.message ||
                "An internal server error occurred during login."

        });

    }

};



// ======================================================
// KIOSK LOGIN
// ======================================================

exports.kioskLogin = async (req, res) => {

    const {
        kioskId
    } = req.body;


    if (!kioskId) {

        return res.status(400).send({

            data: null,

            isError: true,

            message:
                "Missing required field: kioskId."

        });

    }


    try {

        const token = jwt.sign(

            {

                type: "kiosk",

                kiosk_id: kioskId,

                location: "Barili Branch"

            },

            jwtSecret,

            {

                expiresIn: 86400

            }

        );


        return res.status(200).send({

            data: {

                type: "kiosk",

                kiosk_id: kioskId,

                location: "Barili Branch",

                accessToken: token

            },

            isError: false,

            message: "Success Login"

        });


    } catch (error) {

        console.error(
            "KIOSK LOGIN ERROR:",
            error
        );


        return res.status(500).send({

            data: null,

            isError: true,

            message:
                error.message ||
                "An internal server error occurred."

        });

    }

};



// ======================================================
// SIGNUP
// ======================================================

exports.signup = async (req, res) => {

    const {

        lastname,

        firstname,

        middlename,

        email,

        mobile_number,

        password,

        birthdate,

        usertype,

        role,

        user_image,

        is_active

    } = req.body;


    // ==========================================
    // VALIDATION
    // ==========================================

    if (
        !lastname ||
        !firstname ||
        !email ||
        !password ||
        !usertype ||
        !role
    ) {

        return res.status(400).send({

            data: null,

            isError: true,

            message:
                "Missing required fields: lastname, firstname, email, password, usertype and role."

        });

    }


    const transaction =
        await db.databaseConf.transaction();


    try {

        // ==========================================
        // CHECK EXISTING EMAIL
        // ==========================================

        const existingUser =
            await User.findOne({

                where: {
                    email: email
                },

                transaction

            });


        if (existingUser) {

            await transaction.rollback();

            return res.status(400).send({

                data: null,

                isError: true,

                message:
                    "Email is already registered."

            });

        }


        // ==========================================
        // HASH PASSWORD
        // ==========================================

        const hashedPassword =
            bcrypt.hashSync(password, 8);


        // ==========================================
        // CREATE USER
        // ==========================================

        const newUser =
            await User.create({

                lastname:

                    lastname,

                firstname:

                    firstname,

                middlename:

                    middlename || null,

                email:

                    email,

                mobile_number:

                    mobile_number || null,

                password:

                    hashedPassword,

                birthdate:

                    birthdate || null,

                usertype:

                    usertype,

                role:

                    role,

                user_image:

                    user_image || null,

                is_active:

                    is_active !== undefined
                        ? is_active
                        : true,

                date_added:

                    new Date(),

                last_password_update:

                    new Date()

            }, {

                transaction

            });


        // ==========================================
        // COMMIT
        // ==========================================

        await transaction.commit();


        // ==========================================
        // CREATE JWT
        // ==========================================

        const token = jwt.sign(

            {

                user: {

                    userid:

                        newUser.userid,

                    lastname:

                        newUser.lastname,

                    firstname:

                        newUser.firstname,

                    middlename:

                        newUser.middlename,

                    email:

                        newUser.email,

                    mobile_number:

                        newUser.mobile_number,

                    usertype:

                        newUser.usertype,

                    role:

                        newUser.role

                }

            },

            jwtSecret,

            {

                expiresIn: 86400

            }

        );


        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(201).send({

            data: {

                userid:

                    newUser.userid,

                lastname:

                    newUser.lastname,

                firstname:

                    newUser.firstname,

                middlename:

                    newUser.middlename,

                email:

                    newUser.email,

                mobile_number:

                    newUser.mobile_number,

                birthdate:

                    newUser.birthdate,

                usertype:

                    newUser.usertype,

                role:

                    newUser.role,

                user_image:

                    newUser.user_image,

                is_active:

                    newUser.is_active,

                accessToken:

                    token

            },

            isError: false,

            message:
                "User created successfully."

        });


    } catch (error) {

        // ==========================================
        // ROLLBACK
        // ==========================================

        if (
            transaction.finished !== "commit" &&
            transaction.finished !== "rollback"
        ) {

            await transaction.rollback();

        }


        console.error(
            "SIGNUP ERROR:",
            error
        );


        if (
            error.name ===
            "SequelizeUniqueConstraintError"
        ) {

            return res.status(400).send({

                data: null,

                isError: true,

                message:
                    "Email is already in use."

            });

        }


        return res.status(500).send({

            data: null,

            isError: true,

            message:
                error.message ||
                "Error during user registration."

        });

    }

};

// ============================================================
// VALIDATE TOKEN / GET CURRENT USER
// ============================================================

exports.validateToken = async (req, res) => {
    try {
        const userId = req.userId;

        console.log("VALIDATE TOKEN USER ID:", userId);

        if (!userId) {
            return res.status(401).json({
                data: null,
                count: 0,
                isError: true,
                message: "User ID not found."
            });
        }

        const users = await db.databaseConf.query(`
            SELECT
                userid,
                lastname,
                firstname,
                middlename,
                email,
                mobile_number,
                birthdate,
                usertype,
                role,
                user_image,
                is_active,
                date_added,
                last_password_update
            FROM users
            WHERE userid = :userid
            LIMIT 1
        `, {
            replacements: {
                userid: userId
            },
            type: db.Sequelize.QueryTypes.SELECT
        });

        if (!users || users.length === 0) {
            return res.status(404).json({
                data: null,
                count: 0,
                isError: true,
                message: "User not found."
            });
        }

        const user = users[0];

        if (!user.is_active) {
            return res.status(403).json({
                data: null,
                count: 0,
                isError: true,
                message: "User account is inactive."
            });
        }

        return res.status(200).json({
            data: user,
            count: 1,
            isError: false,
            message: "Token is valid."
        });

    } catch (error) {
        console.error("VALIDATE TOKEN ERROR:", error);

        return res.status(500).json({
            data: null,
            count: 0,
            isError: true,
            message: "Failed to validate token."
        });
    }
};


// ============================================================
// UPDATE PROFILE
// ============================================================

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({
                data: null,
                count: 0,
                isError: true,
                message: "User ID not found."
            });
        }

        const {
            firstname,
            lastname,
            middlename,
            email,
            mobile_number
        } = req.body;

        if (!firstname || !lastname || !email) {
            return res.status(400).json({
                data: null,
                count: 0,
                isError: true,
                message: "Firstname, lastname and email are required."
            });
        }

        // Check if email belongs to another user
        const existingUser = await db.databaseConf.query(`
            SELECT userid
            FROM users
            WHERE email = :email
              AND userid != :userid
            LIMIT 1
        `, {
            replacements: {
                email: email.trim(),
                userid: userId
            },
            type: db.Sequelize.QueryTypes.SELECT
        });

        if (existingUser.length > 0) {
            return res.status(409).json({
                data: null,
                count: 0,
                isError: true,
                message: "Email address is already being used."
            });
        }

        await db.databaseConf.query(`
            UPDATE users
            SET
                firstname = :firstname,
                lastname = :lastname,
                middlename = :middlename,
                email = :email,
                mobile_number = :mobile_number
            WHERE userid = :userid
        `, {
            replacements: {
                firstname: firstname.trim(),
                lastname: lastname.trim(),
                middlename: middlename
                    ? middlename.trim()
                    : null,
                email: email.trim(),
                mobile_number: mobile_number
                    ? mobile_number.trim()
                    : null,
                userid: userId
            },
            type: db.Sequelize.QueryTypes.UPDATE
        });

        // Return updated user
        const users = await db.databaseConf.query(`
            SELECT
                userid,
                lastname,
                firstname,
                middlename,
                email,
                mobile_number,
                birthdate,
                usertype,
                role,
                user_image,
                is_active,
                date_added,
                last_password_update
            FROM users
            WHERE userid = :userid
            LIMIT 1
        `, {
            replacements: {
                userid: userId
            },
            type: db.Sequelize.QueryTypes.SELECT
        });

        return res.status(200).json({
            data: users[0],
            count: 1,
            isError: false,
            message: "Profile updated successfully."
        });

    } catch (error) {
        console.error("UPDATE PROFILE ERROR:", error);

        return res.status(500).json({
            data: null,
            count: 0,
            isError: true,
            message: "Failed to update profile."
        });
    }
};

// ============================================================
// CHANGE PASSWORD
// ============================================================

exports.changePassword = async (req, res) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({
                data: null,
                count: 0,
                isError: true,
                message: "User ID not found."
            });
        }

        const {
            current_password,
            new_password,
            confirm_password
        } = req.body;

        if (!current_password ||
            !new_password ||
            !confirm_password) {

            return res.status(400).json({
                data: null,
                count: 0,
                isError: true,
                message: "All password fields are required."
            });
        }

        if (new_password !== confirm_password) {
            return res.status(400).json({
                data: null,
                count: 0,
                isError: true,
                message: "New password and confirmation password do not match."
            });
        }

        if (new_password.length < 8) {
            return res.status(400).json({
                data: null,
                count: 0,
                isError: true,
                message: "New password must be at least 8 characters."
            });
        }

        const users = await db.databaseConf.query(`
            SELECT
                userid,
                password
            FROM users
            WHERE userid = :userid
            LIMIT 1
        `, {
            replacements: {
                userid: userId
            },
            type: db.Sequelize.QueryTypes.SELECT
        });

        if (!users || users.length === 0) {
            return res.status(404).json({
                data: null,
                count: 0,
                isError: true,
                message: "User not found."
            });
        }

        const user = users[0];

        const passwordMatch = await bcrypt.compare(
            current_password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(400).json({
                data: null,
                count: 0,
                isError: true,
                message: "Current password is incorrect."
            });
        }

        const hashedPassword = await bcrypt.hash(
            new_password,
            10
        );

        await db.databaseConf.query(`
            UPDATE users
            SET
                password = :password,
                last_password_update = NOW()
            WHERE userid = :userid
        `, {
            replacements: {
                password: hashedPassword,
                userid: userId
            },
            type: db.Sequelize.QueryTypes.UPDATE
        });

        return res.status(200).json({
            data: null,
            count: 0,
            isError: false,
            message: "Password changed successfully."
        });

    } catch (error) {
        console.error("CHANGE PASSWORD ERROR:", error);

        return res.status(500).json({
            data: null,
            count: 0,
            isError: true,
            message: "Failed to change password."
        });
    }
};