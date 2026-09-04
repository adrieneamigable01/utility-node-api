const jwt = require("jsonwebtoken");

const jwtSecret = "DREY";

const verifyToken = (req, res, next) => {
    try {
        const token =
            req.headers["x-access-token"] ||
            req.headers["authorization"]?.split(" ")[1];

        if (!token) {
            return res.status(403).json({
                data: null,
                count: 0,
                isError: true,
                message: "No token provided!"
            });
        }

        const decoded = jwt.verify(token, jwtSecret);

        console.log("JWT DECODED:", decoded);

        if (!decoded || !decoded.user) {
            return res.status(401).json({
                data: null,
                count: 0,
                isError: true,
                message: "Invalid token: user information missing."
            });
        }

        if (!decoded.user.userid) {
            return res.status(401).json({
                data: null,
                count: 0,
                isError: true,
                message: "Invalid token: userid missing."
            });
        }

        req.user = decoded.user;
        req.userId = decoded.user.userid;
        req.userType = decoded.user.usertype;

        console.log("AUTHENTICATED USER:", req.userId);

        next();

    } catch (error) {
        console.error("JWT ERROR:", error.message);

        return res.status(401).json({
            data: null,
            count: 0,
            isError: true,
            message: "Unauthorized!"
        });
    }
};

module.exports = verifyToken;