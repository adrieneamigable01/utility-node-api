
const express = require("express");

const router = express.Router();


// ======================================================
// CONTROLLERS
// ======================================================
const utilityDashboardController =
    require("../controllers/UtilityDashboard.controller");

const auth =
    require("../controllers/Auth");

const utility =
    require("../controllers/Utility.controller");

const companyController =
    require("../controllers/Company.controller");


// ======================================================
// MIDDLEWARE
// ======================================================

const verifyToken =
    require("../middleware/authJwt");


// ======================================================
// AUTH
// ======================================================

// ======================================================
// LOGIN
// ======================================================
//
// POST
// /api/auth/login
//
// ======================================================

router.post(
    "/api/auth/login",
    auth.login
);


router.get(
    "/api/auth/validate",
    verifyToken,
    auth.validateToken
);

// ======================================================
// UTILITY METERS
// ======================================================


// ======================================================
// GET ALL UTILITY METERS
// ======================================================
//
// GET
// /api/utilities/meters
//
// ======================================================

router.get(
    "/api/utilities/meters",
    verifyToken,
    utility.getAllMeters
);


// ======================================================
// GET UTILITY METER BY ID
// ======================================================
//
// GET
// /api/utilities/meters/:meter_id
//
// ======================================================

router.get(
    "/api/utilities/meters/:meter_id",
    verifyToken,
    utility.getMeterById
);


// ======================================================
// CREATE UTILITY METER
// ======================================================
//
// POST
// /api/utilities/meters
//
// ======================================================

router.post(
    "/api/utilities/meters",
    verifyToken,
    utility.createMeter
);


// ======================================================
// UPDATE UTILITY METER
// ======================================================
//
// PUT
// /api/utilities/meters/:meter_id
//
// ======================================================

router.put(
    "/api/utilities/meters/:meter_id",
    verifyToken,
    utility.updateMeter
);


// ======================================================
// DELETE UTILITY METER
// ======================================================
//
// DELETE
// /api/utilities/meters/:meter_id
//
// ======================================================

router.delete(
    "/api/utilities/meters/:meter_id",
    verifyToken,
    utility.deleteMeter
);


// ======================================================
// UTILITY READINGS
// ======================================================


// ======================================================
// GET ALL UTILITY READINGS
// ======================================================
//
// GET
// /api/utilities/readings
//
// ======================================================

router.get(
    "/api/utilities/readings",
    verifyToken,
    utility.getAllReadings
);


// ======================================================
// GET READINGS BY METER
// ======================================================
//
// GET
// /api/utilities/meters/:meter_id/readings
//
// ======================================================

router.get(
    "/api/utilities/meters/:meter_id/readings",
    verifyToken,
    utility.getReadingsByMeter
);




// ======================================================
// GET LATEST READING
// ======================================================
//
// GET
// /api/utilities/meters/:meter_id/latest
//
// ======================================================

router.get(
    "/api/utilities/meters/:meter_id/latest",
    verifyToken,
    utility.getLatestReading
);


// ======================================================
// CREATE UTILITY READING
// ======================================================
//
// POST
// /api/utilities/readings
//
// This endpoint can later be used by:
// - ESP32
// - Smart Electricity Meter
// - Smart Water Meter
//
// ======================================================

router.post(
    "/api/utilities/readings",
    verifyToken,
    utility.createReading
);

router.put(
    "/api/utilities/meters/:meter_id/readings/pay-all",
    verifyToken,
    utility.markAllReadingsPaid
);


router.get(
    "/api/dashboard",
    verifyToken,
    utilityDashboardController.getDashboard
);

router.get(
    "/api/utilities/rates/:utility_type",
    verifyToken,
    utility.getUtilityRate
);

router.get(
    "/api/utilities/rates",
    verifyToken,
    utility.getAllRates
);

router.post(
    "/api/utilities/rates",
    verifyToken,
    utility.createUtilityRate
);



router.get(
    "/api/companies",
    verifyToken,
    companyController.getMyCompanies
);

router.post(
    "/api/companies",
    verifyToken,
    companyController.createCompany
);



// ======================================================
// EXPORT
// ======================================================


module.exports = router;

