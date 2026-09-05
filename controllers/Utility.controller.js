// controllers/Utility.controller.js

const db = require("../models");


// =====================================================
// GET ALL UTILITY METERS
// =====================================================

// =====================================================
// GET ALL UTILITY METERS BY COMPANY
// =====================================================

exports.getAllMeters = async (req, res) => {

    try {

        const companyId = req.query.company_id;
        const userId = req.userId;

        if (!companyId) {
            return res.status(400).send({
                data: [],
                count: 0,
                isError: true,
                message: "company_id is required"
            });
        }

        if (!userId) {
            return res.status(401).send({
                data: [],
                count: 0,
                isError: true,
                message: "Unauthorized"
            });
        }

        // =============================================
        // CHECK USER ACCESS TO COMPANY
        // =============================================

        const companyAccess = await db.databaseConf.query(
            `
            SELECT company_user_id
            FROM company_users
            WHERE company_id = :company_id
            AND userid = :userid
            LIMIT 1
            `,
            {
                replacements: {
                    company_id: companyId,
                    userid: userId
                },
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        if (!companyAccess.length) {
            return res.status(403).send({
                data: [],
                count: 0,
                isError: true,
                message: "You do not have access to this company."
            });
        }

        // =============================================
        // GET METERS
        // =============================================

        const data = await db.databaseConf.query(
            `
            SELECT
                m.meter_id,
                m.company_id,
                m.meter_type,
                m.meter_number,
                m.meter_name,
                m.location,
                m.unit,
                m.status,
                m.installed_at,
                m.created_at,
                m.updated_at,

                /* =========================
                   LATEST READING
                   ========================= */

                (
                    SELECT r.reading_id
                    FROM utility_readings r
                    WHERE r.meter_id = m.meter_id
                    ORDER BY
                        r.recorded_at DESC,
                        r.reading_id DESC
                    LIMIT 1
                ) AS latest_reading_id,

                (
                    SELECT r.reading_value
                    FROM utility_readings r
                    WHERE r.meter_id = m.meter_id
                    ORDER BY
                        r.recorded_at DESC,
                        r.reading_id DESC
                    LIMIT 1
                ) AS latest_reading_value,

                (
                    SELECT r.consumption
                    FROM utility_readings r
                    WHERE r.meter_id = m.meter_id
                    ORDER BY
                        r.recorded_at DESC,
                        r.reading_id DESC
                    LIMIT 1
                ) AS latest_consumption,

                (
                    SELECT r.recorded_at
                    FROM utility_readings r
                    WHERE r.meter_id = m.meter_id
                    ORDER BY
                        r.recorded_at DESC,
                        r.reading_id DESC
                    LIMIT 1
                ) AS latest_recorded_at,

                (
                    SELECT r.payment_status
                    FROM utility_readings r
                    WHERE r.meter_id = m.meter_id
                    ORDER BY
                        r.recorded_at DESC,
                        r.reading_id DESC
                    LIMIT 1
                ) AS latest_payment_status,

                /* =========================
                   TODAY USAGE
                   ========================= */

                COALESCE(
                    (
                        SELECT SUM(r.consumption)
                        FROM utility_readings r
                        WHERE r.meter_id = m.meter_id
                        AND DATE(r.recorded_at) = CURDATE()
                    ),
                    0
                ) AS today_usage,

                /* =========================
                   CURRENT ACTIVE RATE
                   ========================= */

                COALESCE(
                    (
                        SELECT ur.rate
                        FROM utility_rates ur
                        WHERE ur.utility_type = m.meter_type
                        AND ur.status = 'ACTIVE'
                        AND ur.effective_date <= CURDATE()
                        AND (
                            ur.end_date IS NULL
                            OR ur.end_date >= CURDATE()
                        )
                        ORDER BY
                            ur.effective_date DESC,
                            ur.rate_id DESC
                        LIMIT 1
                    ),
                    0
                ) AS rate

            FROM utility_meters m

            WHERE m.company_id = :company_id

            ORDER BY
                m.meter_type ASC,
                m.meter_name ASC,
                m.meter_id ASC
            `,
            {
                replacements: {
                    company_id: companyId
                },
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        // =============================================
        // FORMAT RESPONSE
        // =============================================

        const meters = data.map((meter) => {

            const hasLatestReading =
                meter.latest_reading_id !== null &&
                meter.latest_reading_id !== undefined;

            return {
                ...meter,

                company_id: Number(meter.company_id),

                latest_reading: hasLatestReading
                    ? {
                        reading_id: meter.latest_reading_id,
                        reading_value: meter.latest_reading_value,
                        consumption: meter.latest_consumption,
                        recorded_at: meter.latest_recorded_at,
                        payment_status: meter.latest_payment_status
                    }
                    : null,

                today_usage:
                    Number(meter.today_usage || 0),

                rate:
                    Number(meter.rate || 0)
            };

        });

        return res.status(200).send({

            data: meters,

            count: meters.length,

            isError: false,

            message:
                "Success fetch utility meters"

        });

    } catch (error) {

        console.error(
            "GET ALL UTILITY METERS ERROR:",
            error
        );

        return res.status(500).send({

            data: [],

            count: 0,

            isError: true,

            message:
                error.message ||
                "Error retrieving utility meters"

        });

    }

};

exports.getReadingsByMeter = async (req, res) => {
    try {
        const meterId = req.params.meter_id;

        // Get readings from oldest to newest
        const readings = await db.databaseConf.query(
            `
            SELECT
                reading_id,
                meter_id,
                reading_value,
                payment_status,
                voltage,
                current,
                power_kw,
                power_factor,
                flow_rate,
                recorded_at,
                created_at
            FROM utility_readings
            WHERE meter_id = :meter_id
            ORDER BY recorded_at ASC, reading_id ASC
            `,
            {
                replacements: {
                    meter_id: meterId
                },
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        // Calculate consumption
        const processedReadings = readings.map((reading, index) => {

            const currentReading =
                Number.parseFloat(reading.reading_value);

            let consumption = null;

            // First reading has no previous reading
            if (index > 0) {

                const previousReading =
                    Number.parseFloat(
                        readings[index - 1].reading_value
                    );

                if (
                    Number.isFinite(currentReading) &&
                    Number.isFinite(previousReading)
                ) {
                    consumption =
                        currentReading - previousReading;

                    // Prevent negative consumption
                    if (consumption < 0) {
                        consumption = 0;
                    }
                }
            }

            return {
                ...reading,

                consumption:
                    consumption !== null
                        ? consumption.toFixed(4)
                        : null
            };
        });

        // Return newest first
        processedReadings.reverse();

        return res.status(200).send({
            data: processedReadings,
            count: processedReadings.length,
            isError: false,
            message: "Success fetch meter readings"
        });

    } catch (error) {

        console.error(
            "GET READINGS BY METER ERROR:",
            error
        );

        return res.status(500).send({
            data: null,
            count: 0,
            isError: true,
            message:
                error.message ||
                "Failed to load meter readings."
        });
    }
};


exports.markAllReadingsPaid = async (req, res) => {
    const transaction =
        await db.databaseConf.transaction();

    try {
        const meterId = req.params.meter_id;

        const {
            payment_method = "CASH",
            payment_reference = null,
            payment_date = null,
            remarks = null
        } = req.body;

        /*
        |--------------------------------------------------------------------------
        | Validate meter
        |--------------------------------------------------------------------------
        */

        const meters = await db.databaseConf.query(
            `
            SELECT
                meter_id,
                meter_type,
                meter_number,
                meter_name,
                unit
            FROM utility_meters
            WHERE meter_id = :meter_id
            LIMIT 1
            `,
            {
                replacements: {
                    meter_id: meterId
                },
                type: db.Sequelize.QueryTypes.SELECT,
                transaction
            }
        );

        if (meters.length === 0) {
            await transaction.rollback();

            return res.status(404).send({
                data: null,
                count: 0,
                isError: true,
                message: "Meter not found."
            });
        }

        const meter = meters[0];

        /*
        |--------------------------------------------------------------------------
        | Get unpaid readings
        |--------------------------------------------------------------------------
        */

        const unpaidReadings =
            await db.databaseConf.query(
                `
                SELECT
                    reading_id,
                    meter_id,
                    reading_value,
                    consumption,
                    recorded_at
                FROM utility_readings
                WHERE meter_id = :meter_id
                AND payment_status = 'UNPAID'
                ORDER BY recorded_at ASC, reading_id ASC
                `,
                {
                    replacements: {
                        meter_id: meterId
                    },
                    type: db.Sequelize.QueryTypes.SELECT,
                    transaction
                }
            );

        if (unpaidReadings.length === 0) {
            await transaction.rollback();

            return res.status(400).send({
                data: null,
                count: 0,
                isError: true,
                message:
                    "There are no unpaid readings for this meter."
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Calculate total consumption
        |--------------------------------------------------------------------------
        */

        const totalUsage =
            unpaidReadings.reduce(
                (total, reading) => {
                    return (
                        total +
                        Number(
                            reading.consumption || 0
                        )
                    );
                },
                0
            );

        /*
        |--------------------------------------------------------------------------
        | Get active utility rate
        |--------------------------------------------------------------------------
        */

        const rates =
            await db.databaseConf.query(
                `
                SELECT
                    rate_id,
                    rate
                FROM utility_rates
                WHERE utility_type = :utility_type
                AND status = 'ACTIVE'
                AND effective_date <= CURDATE()
                AND (
                    end_date IS NULL
                    OR end_date >= CURDATE()
                )
                ORDER BY
                    effective_date DESC,
                    rate_id DESC
                LIMIT 1
                `,
                {
                    replacements: {
                        utility_type:
                            meter.meter_type
                    },
                    type: db.Sequelize.QueryTypes.SELECT,
                    transaction
                }
            );

        if (rates.length === 0) {
            await transaction.rollback();

            return res.status(400).send({
                data: null,
                count: 0,
                isError: true,
                message:
                    `No active rate found for ${meter.meter_type}.`
            });
        }

        const rate = Number(
            rates[0].rate || 0
        );

        /*
        |--------------------------------------------------------------------------
        | Calculate payment
        |--------------------------------------------------------------------------
        */

        const paymentAmount =
            totalUsage * rate;

        /*
        |--------------------------------------------------------------------------
        | Payment date
        |--------------------------------------------------------------------------
        */

        const finalPaymentDate =
            payment_date || null;

        /*
        |--------------------------------------------------------------------------
        | Created By
        |--------------------------------------------------------------------------
        */

        const createdBy =
            req.userId ||
            req.user_id ||
            null;

        /*
        |--------------------------------------------------------------------------
        | Create payment record
        |--------------------------------------------------------------------------
        */

        const paymentResult =
            await db.databaseConf.query(
                `
                INSERT INTO utility_payments (
                    meter_id,
                    payment_reference,
                    payment_amount,
                    usage_amount,
                    rate,
                    payment_method,
                    payment_status,
                    payment_date,
                    remarks,
                    created_by
                )
                VALUES (
                    :meter_id,
                    :payment_reference,
                    :payment_amount,
                    :usage_amount,
                    :rate,
                    :payment_method,
                    'PAID',
                    COALESCE(
                        :payment_date,
                        CURRENT_TIMESTAMP
                    ),
                    :remarks,
                    :created_by
                )
                `,
                {
                    replacements: {
                        meter_id: meterId,
                        payment_reference,
                        payment_amount:
                            paymentAmount.toFixed(2),
                        usage_amount:
                            totalUsage.toFixed(4),
                        rate:
                            rate.toFixed(4),
                        payment_method,
                        payment_date:
                            finalPaymentDate,
                        remarks,
                        created_by: createdBy
                    },
                    type: db.Sequelize.QueryTypes.INSERT,
                    transaction
                }
            );

        /*
        |--------------------------------------------------------------------------
        | Get inserted payment ID
        |--------------------------------------------------------------------------
        */

        const paymentId =
            paymentResult[0];

        if (!paymentId) {
            throw new Error(
                "Failed to create payment record."
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Link readings to payment
        |--------------------------------------------------------------------------
        */

        for (const reading of unpaidReadings) {
            await db.databaseConf.query(
                `
                INSERT INTO utility_payment_readings (
                    payment_id,
                    reading_id
                )
                VALUES (
                    :payment_id,
                    :reading_id
                )
                `,
                {
                    replacements: {
                        payment_id: paymentId,
                        reading_id:
                            reading.reading_id
                    },
                    type: db.Sequelize.QueryTypes.INSERT,
                    transaction
                }
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Mark readings as PAID
        |--------------------------------------------------------------------------
        */

        await db.databaseConf.query(
            `
            UPDATE utility_readings
            SET payment_status = 'PAID'
            WHERE meter_id = :meter_id
            AND payment_status = 'UNPAID'
            `,
            {
                replacements: {
                    meter_id: meterId
                },
                type: db.Sequelize.QueryTypes.UPDATE,
                transaction
            }
        );

        /*
        |--------------------------------------------------------------------------
        | Commit
        |--------------------------------------------------------------------------
        */

        await transaction.commit();

        return res.status(200).send({
            data: {
                payment_id: paymentId,
                meter_id: Number(meterId),
                meter_number:
                    meter.meter_number,
                meter_name:
                    meter.meter_name,
                meter_type:
                    meter.meter_type,
                unit:
                    meter.unit,

                reading_count:
                    unpaidReadings.length,

                usage_amount:
                    Number(
                        totalUsage.toFixed(4)
                    ),

                rate:
                    Number(
                        rate.toFixed(4)
                    ),

                payment_amount:
                    Number(
                        paymentAmount.toFixed(2)
                    ),

                payment_method,
                payment_reference,
                payment_status: "PAID",

                payment_date:
                    finalPaymentDate ||
                    new Date(),

                readings:
                    unpaidReadings.map(
                        reading => ({
                            reading_id:
                                reading.reading_id,
                            reading_value:
                                Number(
                                    reading.reading_value
                                ),
                            consumption:
                                Number(
                                    reading.consumption ||
                                    0
                                ),
                            payment_status:
                                "PAID",
                            recorded_at:
                                reading.recorded_at
                        })
                    )
            },

            count:
                unpaidReadings.length,

            isError: false,

            message:
                "All unpaid readings have been marked as paid."
        });

    } catch (error) {

        await transaction.rollback();

        console.error(
            "MARK ALL READINGS PAID ERROR:",
            error
        );

        return res.status(500).send({
            data: null,
            count: 0,
            isError: true,
            message:
                error.message ||
                "Failed to process payment."
        });
    }
};


// =====================================================
// GET UTILITY METER BY ID
// =====================================================

exports.getMeterById = async (req, res) => {

    try {

        const { meter_id } = req.params;


        if (!meter_id) {

            return res.status(400).send({

                data: null,

                isError: true,

                message: "meter_id is required"

            });

        }


        const data = await db.databaseConf.query(`

            SELECT

                meter_id,
                meter_type,
                meter_number,
                meter_name,
                location,
                unit,
                status,
                installed_at,
                created_at,
                updated_at

            FROM utility_meters

            WHERE meter_id = :meter_id

            LIMIT 1

        `, {

            replacements: {
                meter_id: meter_id
            },

            type: db.Sequelize.QueryTypes.SELECT

        });


        if (!data.length) {

            return res.status(404).send({

                data: null,

                isError: true,

                message: "Utility meter not found"

            });

        }


        return res.status(200).send({

            data: data[0],

            isError: false,

            message: "Utility meter retrieved successfully"

        });


    } catch (error) {

        console.error(
            "GET UTILITY METER ERROR:",
            error
        );


        return res.status(500).send({

            data: null,

            isError: true,

            message:
                error.message ||
                "Error retrieving utility meter"

        });

    }

};



// =====================================================
// CREATE UTILITY METER
// =====================================================

exports.createMeter = async (req, res) => {

    try {

        const {
            company_id,
            meter_type,
            meter_number,
            meter_name,
            location,
            unit,
            installed_at
        } = req.body;

        const userId = req.userId;

        // =============================================
        // VALIDATION
        // =============================================

        if (!company_id) {
            return res.status(400).send({
                data: null,
                isError: true,
                message: "company_id is required"
            });
        }

        if (!userId) {
            return res.status(401).send({
                data: null,
                isError: true,
                message: "Unauthorized"
            });
        }

        if (
            !meter_type ||
            !meter_number ||
            !unit
        ) {
            return res.status(400).send({
                data: null,
                isError: true,
                message:
                    "meter_type, meter_number and unit are required"
            });
        }

        // =============================================
        // VALIDATE METER TYPE
        // =============================================

        if (
            meter_type !== "ELECTRICITY" &&
            meter_type !== "WATER"
        ) {
            return res.status(400).send({
                data: null,
                isError: true,
                message:
                    "meter_type must be ELECTRICITY or WATER"
            });
        }

        // =============================================
        // CHECK USER ACCESS TO COMPANY
        // =============================================

        const companyAccess = await db.databaseConf.query(
            `
            SELECT
                cu.company_user_id,
                cu.role
            FROM company_users cu
            INNER JOIN companies c
                ON c.company_id = cu.company_id
            WHERE cu.company_id = :company_id
            AND cu.userid = :userid
            AND c.status = 'ACTIVE'
            LIMIT 1
            `,
            {
                replacements: {
                    company_id,
                    userid: userId
                },
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        if (!companyAccess.length) {
            return res.status(403).send({
                data: null,
                isError: true,
                message:
                    "You do not have permission to create a meter for this company."
            });
        }

        // =============================================
        // CHECK DUPLICATE METER NUMBER
        // =============================================

        const existing = await db.databaseConf.query(
            `
            SELECT
                meter_id
            FROM utility_meters
            WHERE company_id = :company_id
            AND meter_number = :meter_number
            LIMIT 1
            `,
            {
                replacements: {
                    company_id,
                    meter_number
                },
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        if (existing.length) {
            return res.status(409).send({
                data: null,
                isError: true,
                message:
                    "Meter number already exists in this company."
            });
        }

        // =============================================
        // CREATE METER
        // =============================================

        const result = await db.databaseConf.query(
            `
            INSERT INTO utility_meters
            (
                company_id,
                meter_type,
                meter_number,
                meter_name,
                location,
                unit,
                status,
                installed_at
            )
            VALUES
            (
                :company_id,
                :meter_type,
                :meter_number,
                :meter_name,
                :location,
                :unit,
                'ACTIVE',
                :installed_at
            )
            `,
            {
                replacements: {

                    company_id,

                    meter_type,

                    meter_number,

                    meter_name:
                        meter_name || null,

                    location:
                        location || null,

                    unit,

                    installed_at:
                        installed_at || null

                },

                type:
                    db.Sequelize.QueryTypes.INSERT
            }
        );

        return res.status(201).send({

            data: {

                meter_id: result[0],

                company_id:
                    Number(company_id),

                meter_type,

                meter_number,

                meter_name:
                    meter_name || null,

                location:
                    location || null,

                unit,

                status: "ACTIVE",

                installed_at:
                    installed_at || null

            },

            isError: false,

            message:
                "Utility meter created successfully"

        });

    } catch (error) {

        console.error(
            "CREATE UTILITY METER ERROR:",
            error
        );

        return res.status(500).send({

            data: null,

            isError: true,

            message:
                error.message ||
                "Error creating utility meter"

        });

    }

};



// =====================================================
// UPDATE UTILITY METER
// =====================================================

exports.updateMeter = async (req, res) => {

    try {

        const { meter_id } = req.params;

        const {
            company_id,
            meter_name,
            location,
            unit,
            status,
            installed_at
        } = req.body;

        const userId = req.userId;

        // =============================================
        // VALIDATION
        // =============================================

        if (!meter_id) {
            return res.status(400).send({
                data: null,
                isError: true,
                message: "meter_id is required"
            });
        }

        if (!company_id) {
            return res.status(400).send({
                data: null,
                isError: true,
                message: "company_id is required"
            });
        }

        if (!userId) {
            return res.status(401).send({
                data: null,
                isError: true,
                message: "Unauthorized"
            });
        }

        // =============================================
        // CHECK USER ACCESS TO COMPANY
        // =============================================

        const companyAccess = await db.databaseConf.query(
            `
            SELECT
                cu.company_user_id,
                cu.role
            FROM company_users cu
            INNER JOIN companies c
                ON c.company_id = cu.company_id
            WHERE cu.company_id = :company_id
            AND cu.userid = :userid
            AND c.status = 'ACTIVE'
            LIMIT 1
            `,
            {
                replacements: {
                    company_id,
                    userid: userId
                },
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        if (!companyAccess.length) {
            return res.status(403).send({
                data: null,
                isError: true,
                message:
                    "You do not have permission to update meters for this company."
            });
        }

        // =============================================
        // GET METER
        // =============================================

        const existing = await db.databaseConf.query(
            `
            SELECT
                meter_id,
                company_id,
                meter_type,
                meter_number,
                meter_name,
                location,
                unit,
                status,
                installed_at
            FROM utility_meters
            WHERE meter_id = :meter_id
            AND company_id = :company_id
            LIMIT 1
            `,
            {
                replacements: {
                    meter_id,
                    company_id
                },
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        if (!existing.length) {
            return res.status(404).send({
                data: null,
                isError: true,
                message:
                    "Utility meter not found in this company."
            });
        }

        // =============================================
        // VALIDATE STATUS
        // =============================================

        const finalStatus =
            status
                ? status.toUpperCase()
                : "ACTIVE";

        if (
            !["ACTIVE", "INACTIVE"].includes(
                finalStatus
            )
        ) {
            return res.status(400).send({
                data: null,
                isError: true,
                message:
                    "Invalid status. Use ACTIVE or INACTIVE."
            });
        }

        // =============================================
        // UPDATE METER
        // =============================================

        await db.databaseConf.query(
            `
            UPDATE utility_meters

            SET
                meter_name = :meter_name,
                location = :location,
                unit = :unit,
                status = :status,
                installed_at = :installed_at

            WHERE meter_id = :meter_id
            AND company_id = :company_id
            `,
            {
                replacements: {

                    meter_id,

                    company_id,

                    meter_name:
                        meter_name !== undefined
                            ? meter_name
                            : existing[0].meter_name,

                    location:
                        location !== undefined
                            ? location
                            : existing[0].location,

                    unit:
                        unit !== undefined
                            ? unit
                            : existing[0].unit,

                    status:
                        finalStatus,

                    installed_at:
                        installed_at !== undefined
                            ? installed_at
                            : existing[0].installed_at

                },

                type:
                    db.Sequelize.QueryTypes.UPDATE
            }
        );

        // =============================================
        // GET UPDATED METER
        // =============================================

        const updated = await db.databaseConf.query(
            `
            SELECT
                meter_id,
                company_id,
                meter_type,
                meter_number,
                meter_name,
                location,
                unit,
                status,
                installed_at,
                created_at,
                updated_at
            FROM utility_meters
            WHERE meter_id = :meter_id
            AND company_id = :company_id
            LIMIT 1
            `,
            {
                replacements: {
                    meter_id,
                    company_id
                },
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        return res.status(200).send({

            data: updated[0],

            isError: false,

            message:
                "Utility meter updated successfully"

        });

    } catch (error) {

        console.error(
            "UPDATE UTILITY METER ERROR:",
            error
        );

        return res.status(500).send({

            data: null,

            isError: true,

            message:
                error.message ||
                "Error updating utility meter"

        });

    }

};



// =====================================================
// DELETE UTILITY METER
// =====================================================

exports.deleteMeter = async (req, res) => {

    try {

        const { meter_id } = req.params;


        if (!meter_id) {

            return res.status(400).send({

                data: null,

                isError: true,

                message:
                    "meter_id is required"

            });

        }


        const result = await db.databaseConf.query(`

            DELETE FROM utility_meters

            WHERE meter_id = :meter_id

        `, {

            replacements: {
                meter_id
            },

            type: db.Sequelize.QueryTypes.DELETE

        });


        return res.status(200).send({

            data: {
                meter_id
            },

            isError: false,

            message:
                "Utility meter deleted successfully"

        });


    } catch (error) {

        console.error(
            "DELETE UTILITY METER ERROR:",
            error
        );


        return res.status(500).send({

            data: null,

            isError: true,

            message:
                error.message ||
                "Error deleting utility meter"

        });

    }

};



// =====================================================
// GET ALL READINGS
// =====================================================

exports.getAllReadings = async (req, res) => {

    try {

        const data = await db.databaseConf.query(`

            SELECT

                r.reading_id,

                r.meter_id,

                m.meter_type,

                m.meter_number,

                m.meter_name,

                m.location,

                m.unit,

                r.reading_value,

                r.consumption,

                r.voltage,

                r.current,

                r.power_kw,

                r.power_factor,

                r.flow_rate,

                r.recorded_at,

                r.created_at

            FROM utility_readings r

            INNER JOIN utility_meters m
                ON m.meter_id = r.meter_id

            ORDER BY
                r.recorded_at DESC,
                r.reading_id DESC

        `, {

            type: db.Sequelize.QueryTypes.SELECT

        });


        return res.status(200).send({

            data,

            count: data.length,

            isError: false,

            message:
                "Success fetch all utility readings"

        });


    } catch (error) {

        console.error(
            "GET ALL UTILITY READINGS ERROR:",
            error
        );


        return res.status(500).send({

            data: [],

            count: 0,

            isError: true,

            message:
                error.message ||
                "Error retrieving utility readings"

        });

    }

};



// =====================================================
// GET READINGS BY METER
// =====================================================

exports.getReadingsByMeter = async (req, res) => {

    try {

        const { meter_id } = req.params;


        if (!meter_id) {

            return res.status(400).send({

                data: [],

                count: 0,

                isError: true,

                message:
                    "meter_id is required"

            });

        }


        const data = await db.databaseConf.query(`

            SELECT

                reading_id,
                meter_id,
                reading_value,
                consumption,
                payment_status,
                voltage,
                current,
                power_kw,
                power_factor,
                flow_rate,
                recorded_at,
                created_at

            FROM utility_readings

            WHERE meter_id = :meter_id

            ORDER BY
                recorded_at DESC,
                reading_id DESC

        `, {

            replacements: {
                meter_id
            },

            type: db.Sequelize.QueryTypes.SELECT

        });


        return res.status(200).send({

            data,

            count: data.length,

            isError: false,

            message:
                "Success fetch meter readings"

        });


    } catch (error) {

        console.error(
            "GET READINGS BY METER ERROR:",
            error
        );


        return res.status(500).send({

            data: [],

            count: 0,

            isError: true,

            message:
                error.message ||
                "Error retrieving meter readings"

        });

    }

};



// =====================================================
// GET LATEST READING
// =====================================================

exports.getLatestReading = async (req, res) => {

    try {

        const { meter_id } = req.params;


        if (!meter_id) {

            return res.status(400).send({

                data: null,

                isError: true,

                message:
                    "meter_id is required"

            });

        }


        const data = await db.databaseConf.query(`

            SELECT

                r.reading_id,

                r.meter_id,

                m.meter_type,

                m.meter_number,

                m.meter_name,

                m.unit,

                r.reading_value,

                r.consumption,

                r.voltage,

                r.current,

                r.power_kw,

                r.power_factor,

                r.flow_rate,

                r.recorded_at

            FROM utility_readings r

            INNER JOIN utility_meters m
                ON m.meter_id = r.meter_id

            WHERE r.meter_id = :meter_id

            ORDER BY
                r.recorded_at DESC,
                r.reading_id DESC

            LIMIT 1

        `, {

            replacements: {
                meter_id
            },

            type: db.Sequelize.QueryTypes.SELECT

        });


        if (!data.length) {

            return res.status(404).send({

                data: null,

                isError: true,

                message:
                    "No readings found for this meter"

            });

        }


        return res.status(200).send({

            data: data[0],

            isError: false,

            message:
                "Latest reading retrieved successfully"

        });


    } catch (error) {

        console.error(
            "GET LATEST READING ERROR:",
            error
        );


        return res.status(500).send({

            data: null,

            isError: true,

            message:
                error.message ||
                "Error retrieving latest reading"

        });

    }

};



// =====================================================
// CREATE UTILITY READING
// =====================================================

exports.createReading = async (req, res) => {

    try {

        const {
            meter_id,
            reading_value,
            voltage,
            current,
            power_kw,
            power_factor,
            flow_rate,
            recorded_at
        } = req.body;


        if (
            !meter_id ||
            reading_value === undefined ||
            reading_value === null
        ) {

            return res.status(400).send({

                data: null,

                isError: true,

                message:
                    "meter_id and reading_value are required"

            });

        }


        // =============================================
        // GET METER
        // =============================================

        const meter = await db.databaseConf.query(`

            SELECT

                meter_id,
                meter_type,
                unit,
                status

            FROM utility_meters

            WHERE meter_id = :meter_id

            LIMIT 1

        `, {

            replacements: {
                meter_id
            },

            type: db.Sequelize.QueryTypes.SELECT

        });


        if (!meter.length) {

            return res.status(404).send({

                data: null,

                isError: true,

                message:
                    "Utility meter not found"

            });

        }


        if (meter[0].status !== "ACTIVE") {

            return res.status(400).send({

                data: null,

                isError: true,

                message:
                    "Utility meter is not active"

            });

        }


        // =============================================
        // GET PREVIOUS READING
        // =============================================

        const previous = await db.databaseConf.query(`

            SELECT

                reading_id,
                reading_value,
                recorded_at

            FROM utility_readings

            WHERE meter_id = :meter_id

            ORDER BY
                recorded_at DESC,
                reading_id DESC

            LIMIT 1

        `, {

            replacements: {
                meter_id
            },

            type: db.Sequelize.QueryTypes.SELECT

        });


        // =============================================
        // CALCULATE CONSUMPTION
        // =============================================

        let consumption = null;


        if (previous.length) {

            consumption =
                Number(reading_value) -
                Number(previous[0].reading_value);


            // Meter reset / invalid negative value

            if (consumption < 0) {

                consumption = 0;

            }

        }


        // =============================================
        // INSERT READING
        // =============================================

        const result = await db.databaseConf.query(`

            INSERT INTO utility_readings
            (
                meter_id,
                reading_value,
                consumption,
                voltage,
                current,
                power_kw,
                power_factor,
                flow_rate,
                recorded_at
            )

            VALUES
            (
                :meter_id,
                :reading_value,
                :consumption,
                :voltage,
                :current,
                :power_kw,
                :power_factor,
                :flow_rate,
                :recorded_at
            )

        `, {

            replacements: {

                meter_id,

                reading_value:

                    Number(reading_value),

                consumption,

                voltage:
                    voltage !== undefined
                        ? voltage
                        : null,

                current:
                    current !== undefined
                        ? current
                        : null,

                power_kw:
                    power_kw !== undefined
                        ? power_kw
                        : null,

                power_factor:
                    power_factor !== undefined
                        ? power_factor
                        : null,

                flow_rate:
                    flow_rate !== undefined
                        ? flow_rate
                        : null,

                recorded_at:
                    recorded_at || new Date()

            },

            type: db.Sequelize.QueryTypes.INSERT

        });


        return res.status(201).send({

            data: {

                reading_id: result[0],

                meter_id,

                reading_value:
                    Number(reading_value),

                consumption:
                    consumption !== null
                        ? Number(consumption)
                        : null

            },

            isError: false,

            message:
                "Utility reading recorded successfully"

        });


    } catch (error) {

        console.error(
            "CREATE UTILITY READING ERROR:",
            error
        );


        return res.status(500).send({

            data: null,

            isError: true,

            message:
                error.message ||
                "Error recording utility reading"

        });

    }

};


exports.getUtilityRate = async (req, res) => {
    try {
        const utilityType = req.params.utility_type
            ? req.params.utility_type.toUpperCase()
            : "";

        if (!["ELECTRICITY", "WATER"].includes(utilityType)) {
            return res.status(400).send({
                data: null,
                count: 0,
                isError: true,
                message: "Invalid utility type. Use ELECTRICITY or WATER."
            });
        }

        const rates = await db.databaseConf.query(
            `
            SELECT
                rate_id,
                utility_type,
                rate,
                unit,
                provider,
                effective_date,
                end_date,
                status
            FROM utility_rates
            WHERE utility_type = :utility_type
            AND status = 'ACTIVE'
            AND effective_date <= CURDATE()
            AND (
                end_date IS NULL
                OR end_date >= CURDATE()
            )
            ORDER BY effective_date DESC, rate_id DESC
            LIMIT 1
            `,
            {
                replacements: {
                    utility_type: utilityType
                },
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        if (rates.length === 0) {
            return res.status(404).send({
                data: null,
                count: 0,
                isError: true,
                message: `No active rate found for ${utilityType}.`
            });
        }

        const rate = rates[0];

        return res.status(200).send({
            data: {
                rate_id: rate.rate_id,
                utility_type: rate.utility_type,
                rate: Number(rate.rate),
                unit: rate.unit,
                provider: rate.provider,
                effective_date: rate.effective_date,
                end_date: rate.end_date,
                status: rate.status
            },
            count: 1,
            isError: false,
            message: "Utility rate loaded successfully."
        });

    } catch (error) {
        console.error("GET UTILITY RATE ERROR:", error);

        return res.status(500).send({
            data: null,
            count: 0,
            isError: true,
            message: error.message || "Failed to load utility rate."
        });
    }
};


   exports.getAllRates = async (req, res) => {
    try {
        const rates = await db.databaseConf.query(
            `
            SELECT
                rate_id,
                utility_type,
                rate,
                unit,
                provider,
                effective_date,
                end_date,
                status,
                created_at
            FROM utility_rates
            ORDER BY utility_type ASC,
                     effective_date DESC,
                     rate_id DESC
            `,
            {
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        const formattedRates = rates.map((rate) => ({
            rate_id: rate.rate_id,
            utility_type: rate.utility_type,
            rate: Number(rate.rate || 0),
            unit: rate.unit,
            provider: rate.provider,
            effective_date: rate.effective_date,
            end_date: rate.end_date,
            status: rate.status,
            created_at: rate.created_at
        }));

        return res.status(200).send({
            data: formattedRates,
            count: formattedRates.length,
            isError: false,
            message: "Utility rates loaded successfully."
        });

    } catch (error) {

        console.error("GET ALL UTILITY RATES ERROR:", error);

        return res.status(500).send({
            data: null,
            count: 0,
            isError: true,
            message: error.message || "Failed to load utility rates."
        });
    }
};

exports.createUtilityRate = async (req, res) => {
    try {
        const {
            utility_type,
            rate,
            unit,
            provider,
            effective_date,
            end_date = null,
            status = "ACTIVE"
        } = req.body;

        // Validate utility type
        const utilityType = utility_type
            ? utility_type.toUpperCase()
            : "";

        if (!["ELECTRICITY", "WATER"].includes(utilityType)) {
            return res.status(400).send({
                data: null,
                count: 0,
                isError: true,
                message:
                    "Invalid utility type. Use ELECTRICITY or WATER."
            });
        }

        // Validate rate
        const rateValue = Number(rate);

        if (!Number.isFinite(rateValue) || rateValue < 0) {
            return res.status(400).send({
                data: null,
                count: 0,
                isError: true,
                message: "Rate must be a valid non-negative number."
            });
        }

        // Set correct unit automatically
        const finalUnit =
            utilityType === "WATER"
                ? "m3"
                : "kWh";

        // Validate effective date
        if (!effective_date) {
            return res.status(400).send({
                data: null,
                count: 0,
                isError: true,
                message: "Effective date is required."
            });
        }

        // Validate status
        const finalStatus =
            status ? status.toUpperCase() : "ACTIVE";

        if (!["ACTIVE", "INACTIVE"].includes(finalStatus)) {
            return res.status(400).send({
                data: null,
                count: 0,
                isError: true,
                message:
                    "Invalid status. Use ACTIVE or INACTIVE."
            });
        }

        // If end date exists, make sure it is not before
        // effective date
        if (
            end_date &&
            new Date(end_date) < new Date(effective_date)
        ) {
            return res.status(400).send({
                data: null,
                count: 0,
                isError: true,
                message:
                    "End date cannot be earlier than effective date."
            });
        }

        /*
         * If this new rate is ACTIVE, deactivate the
         * previous active rate for the same utility.
         */
        if (finalStatus === "ACTIVE") {
            await db.databaseConf.query(
                `
                UPDATE utility_rates
                SET status = 'INACTIVE',
                    end_date = CASE
                        WHEN end_date IS NULL
                        THEN DATE_SUB(:effective_date, INTERVAL 1 DAY)
                        ELSE end_date
                    END
                WHERE utility_type = :utility_type
                AND status = 'ACTIVE'
                `,
                {
                    replacements: {
                        utility_type: utilityType,
                        effective_date
                    },
                    type: db.Sequelize.QueryTypes.UPDATE
                }
            );
        }

        /*
         * Insert new rate
         */
        const result = await db.databaseConf.query(
            `
            INSERT INTO utility_rates (
                utility_type,
                rate,
                unit,
                provider,
                effective_date,
                end_date,
                status
            )
            VALUES (
                :utility_type,
                :rate,
                :unit,
                :provider,
                :effective_date,
                :end_date,
                :status
            )
            `,
            {
                replacements: {
                    utility_type: utilityType,
                    rate: rateValue.toFixed(4),
                    unit: finalUnit,
                    provider: provider || null,
                    effective_date,
                    end_date: end_date || null,
                    status: finalStatus
                },
                type: db.Sequelize.QueryTypes.INSERT
            }
        );

        const rateId = result[0];

        /*
         * Get the newly created record
         */
        const createdRates =
            await db.databaseConf.query(
                `
                SELECT
                    rate_id,
                    utility_type,
                    rate,
                    unit,
                    provider,
                    effective_date,
                    end_date,
                    status,
                    created_at
                FROM utility_rates
                WHERE rate_id = :rate_id
                LIMIT 1
                `,
                {
                    replacements: {
                        rate_id: rateId
                    },
                    type:
                        db.Sequelize.QueryTypes.SELECT
                }
            );

        const createdRate =
            createdRates[0];

        return res.status(201).send({
            data: {
                rate_id:
                    createdRate.rate_id,
                utility_type:
                    createdRate.utility_type,
                rate:
                    Number(createdRate.rate),
                unit:
                    createdRate.unit,
                provider:
                    createdRate.provider,
                effective_date:
                    createdRate.effective_date,
                end_date:
                    createdRate.end_date,
                status:
                    createdRate.status,
                created_at:
                    createdRate.created_at
            },
            count: 1,
            isError: false,
            message:
                "Utility rate created successfully."
        });

    } catch (error) {
        console.error(
            "CREATE UTILITY RATE ERROR:",
            error
        );

        return res.status(500).send({
            data: null,
            count: 0,
            isError: true,
            message:
                error.message ||
                "Failed to create utility rate."
        });
    }
};
