// services/EmailService.js

const nodemailer = require("nodemailer");


// ======================================================
// SMTP CONFIGURATION
// ======================================================

const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 587;

const SMTP_USER = "iplcnotification@gmail.com";

// IMPORTANT:
// Use your Gmail APP PASSWORD here.
// Do not use your normal Gmail password.
const SMTP_PASS = "qzgd genr idrr aimx";

const SMTP_FROM =
    "indopacificlendingcorporation@gmail.com";

const SMTP_REPLY_TO =
    "indopacificlendingcorporation@gmail.com";


// ======================================================
// CREATE TRANSPORTER
// ======================================================

const transporter =
    nodemailer.createTransport({

        host:
            SMTP_HOST,

        port:
            SMTP_PORT,

        secure:
            false,

        auth: {

            user:
                SMTP_USER,

            pass:
                SMTP_PASS

        },

        tls: {

            rejectUnauthorized:
                false

        }

    });


// ======================================================
// VERIFY SMTP CONNECTION
// ======================================================

transporter.verify()
    .then(() => {

        console.log(
            "SMTP SERVER READY"
        );

        console.log(
            `SMTP USER: ${SMTP_USER}`
        );

    })
    .catch((error) => {

        console.error(
            "SMTP CONNECTION ERROR:",
            error.message
        );

    });


// ======================================================
// SEND EMAIL
// ======================================================

const sendEmail = async ({
    email,
    subject,
    body,
    cc = ""
}) => {

    try {

        // ==============================================
        // CC
        // ==============================================

        const ccList =
            cc
                ? cc
                    .split(",")
                    .map(item =>
                        item.trim()
                    )
                    .filter(Boolean)
                : [];


        // ==============================================
        // EMAIL OPTIONS
        // ==============================================

        const mailOptions = {

            from: {

                name:
                    "INDO-PACIFIC LENDING CORPORATION",

                address:
                    SMTP_FROM

            },

            to:
                email,

            replyTo:
                SMTP_REPLY_TO,

            subject:
                subject,

            html:
                body

        };


        // Add CC only when supplied

        if (
            ccList.length > 0
        ) {

            mailOptions.cc =
                ccList;

        }


        // ==============================================
        // SEND
        // ==============================================

        const info =
            await transporter.sendMail(
                mailOptions
            );


        console.log(
            "EMAIL SENT:",
            info.messageId
        );


        console.log(
            "EMAIL RESPONSE:",
            info.response
        );


        return {

            success:
                true,

            messageId:
                info.messageId,

            response:
                info.response

        };


    } catch (error) {

        console.error(
            "EMAIL ERROR:",
            error
        );


        return {

            success:
                false,

            message:
                error.message

        };

    }

};


// ======================================================
// EXPORT
// ======================================================

module.exports = {

    sendEmail

};