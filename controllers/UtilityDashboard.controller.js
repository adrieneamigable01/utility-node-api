const db = require("../models");
exports.getDashboard = async (req, res) => {
    try {

        const userId = req.userId;

        console.log("DASHBOARD USER ID:", userId);

        if (!userId) {
            return res.status(401).json({
                data: null,
                count: 0,
                isError: true,
                message: "User ID not found in authentication token."
            });
        }

        const companyId = Number(req.query.company_id);

        if (!companyId) {
            return res.status(400).json({
                data: null,
                count: 0,
                isError: true,
                message: "company_id is required."
            });
        }


        // ============================================================
        // 0.1 CHECK USER ACCESS TO COMPANY
        // ============================================================

        const companyAccess = await db.databaseConf.query(
            `
            SELECT
                cu.company_id,
                cu.userid,
                cu.role,
                c.company_name
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
                    company_id: companyId,
                    userid: req.userId
                },
                type: db.Sequelize.QueryTypes.SELECT
            }
        );

        if (companyAccess.length === 0) {
            return res.status(403).send({
                data: null,
                count: 0,
                isError: true,
                message: "You do not have access to this company."
            });
        }


        // ============================================================
        // 1. GET 2 RANDOM ACTIVE METERS
        // ============================================================

        const meters = await db.databaseConf.query(
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
            WHERE company_id = :company_id
              AND status = 'ACTIVE'
            ORDER BY RAND()
            LIMIT 2
            `,
            {
                replacements: {
                    company_id: companyId
                },
                type: db.Sequelize.QueryTypes.SELECT
            }
        );


        // ============================================================
        // 2. BUILD TOP METER DATA
        // ============================================================

        const meterData = [];

        for (const meter of meters) {

            // --------------------------------------------------------
            // LATEST READING
            // --------------------------------------------------------

            const latestRows =
                await db.databaseConf.query(
                    `
                    SELECT
                        reading_id,
                        reading_value,
                        consumption,
                        recorded_at
                    FROM utility_readings
                    WHERE meter_id = :meter_id
                    ORDER BY recorded_at DESC, reading_id DESC
                    LIMIT 1
                    `,
                    {
                        replacements: {
                            meter_id: meter.meter_id
                        },
                        type: db.Sequelize.QueryTypes.SELECT
                    }
                );

            const latest =
                latestRows.length > 0
                    ? latestRows[0]
                    : null;


            // --------------------------------------------------------
            // TODAY USAGE
            // --------------------------------------------------------

            const todayRows =
                await db.databaseConf.query(
                    `
                    SELECT
                        COALESCE(
                            SUM(consumption),
                            0
                        ) AS total_usage
                    FROM utility_readings
                    WHERE meter_id = :meter_id
                      AND DATE(recorded_at) = CURDATE()
                    `,
                    {
                        replacements: {
                            meter_id: meter.meter_id
                        },
                        type: db.Sequelize.QueryTypes.SELECT
                    }
                );

            const todayUsage =
                Number(
                    todayRows[0]?.total_usage || 0
                );


            // --------------------------------------------------------
            // MONTH USAGE
            // --------------------------------------------------------

            const monthRows =
                await db.databaseConf.query(
                    `
                    SELECT
                        COALESCE(
                            SUM(consumption),
                            0
                        ) AS total_usage
                    FROM utility_readings
                    WHERE meter_id = :meter_id
                      AND YEAR(recorded_at) = YEAR(CURDATE())
                      AND MONTH(recorded_at) = MONTH(CURDATE())
                    `,
                    {
                        replacements: {
                            meter_id: meter.meter_id
                        },
                        type: db.Sequelize.QueryTypes.SELECT
                    }
                );

            const monthUsage =
                Number(
                    monthRows[0]?.total_usage || 0
                );


            // --------------------------------------------------------
            // CURRENT RATE
            // --------------------------------------------------------

            const rateRows =
                await db.databaseConf.query(
                    `
                    SELECT
                        rate
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
                            utility_type:
                                meter.meter_type
                        },
                        type: db.Sequelize.QueryTypes.SELECT
                    }
                );

            const rate =
                Number(
                    rateRows[0]?.rate || 0
                );


            // --------------------------------------------------------
            // COST
            // --------------------------------------------------------

            const todayCost =
                todayUsage * rate;

            const monthCost =
                monthUsage * rate;


            // --------------------------------------------------------
            // METER RESULT
            // --------------------------------------------------------

            meterData.push({

                meter_id:
                    meter.meter_id,

                company_id:
                    meter.company_id,

                meter_type:
                    meter.meter_type,

                meter_number:
                    meter.meter_number,

                meter_name:
                    meter.meter_name,

                location:
                    meter.location,

                unit:
                    meter.unit,

                status:
                    meter.status,

                installed_at:
                    meter.installed_at,

                today_usage:
                    Number(
                        todayUsage.toFixed(4)
                    ),

                month_usage:
                    Number(
                        monthUsage.toFixed(4)
                    ),

                rate:
                    Number(
                        rate.toFixed(4)
                    ),

                today_cost:
                    Number(
                        todayCost.toFixed(2)
                    ),

                month_cost:
                    Number(
                        monthCost.toFixed(2)
                    ),

                latest_reading:
                    latest
                        ? {
                            reading_id:
                                latest.reading_id,

                            reading_value:
                                Number(
                                    latest.reading_value
                                ),

                            consumption:
                                Number(
                                    latest.consumption || 0
                                ),

                            recorded_at:
                                latest.recorded_at
                        }
                        : null
            });
        }


        // ============================================================
        // 3. USAGE SUMMARY FOR ALL ACTIVE METERS
        // ============================================================

        const allMeters =
            await db.databaseConf.query(
                `
                SELECT
                    meter_id,
                    company_id,
                    meter_type,
                    meter_number,
                    meter_name,
                    location,
                    unit,
                    status
                FROM utility_meters
                WHERE company_id = :company_id
                  AND status = 'ACTIVE'
                ORDER BY meter_name ASC
                `,
                {
                    replacements: {
                        company_id: companyId
                    },
                    type: db.Sequelize.QueryTypes.SELECT
                }
            );


        const usageSummary = [];

        for (const meter of allMeters) {

            // --------------------------------------------------------
            // TODAY
            // --------------------------------------------------------

            const todayRows =
                await db.databaseConf.query(
                    `
                    SELECT
                        COALESCE(
                            SUM(consumption),
                            0
                        ) AS total_usage
                    FROM utility_readings
                    WHERE meter_id = :meter_id
                      AND DATE(recorded_at) = CURDATE()
                    `,
                    {
                        replacements: {
                            meter_id: meter.meter_id
                        },
                        type: db.Sequelize.QueryTypes.SELECT
                    }
                );


            // --------------------------------------------------------
            // MONTH
            // --------------------------------------------------------

            const monthRows =
                await db.databaseConf.query(
                    `
                    SELECT
                        COALESCE(
                            SUM(consumption),
                            0
                        ) AS total_usage
                    FROM utility_readings
                    WHERE meter_id = :meter_id
                      AND YEAR(recorded_at) = YEAR(CURDATE())
                      AND MONTH(recorded_at) = MONTH(CURDATE())
                    `,
                    {
                        replacements: {
                            meter_id: meter.meter_id
                        },
                        type: db.Sequelize.QueryTypes.SELECT
                    }
                );


            const todayUsage =
                Number(
                    todayRows[0]?.total_usage || 0
                );

            const monthUsage =
                Number(
                    monthRows[0]?.total_usage || 0
                );


            // --------------------------------------------------------
            // RATE
            // --------------------------------------------------------

            const rateRows =
                await db.databaseConf.query(
                    `
                    SELECT
                        rate
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
                            utility_type:
                                meter.meter_type
                        },
                        type: db.Sequelize.QueryTypes.SELECT
                    }
                );


            const rate =
                Number(
                    rateRows[0]?.rate || 0
                );


            // --------------------------------------------------------
            // COST
            // --------------------------------------------------------

            const todayCost =
                todayUsage * rate;

            const monthCost =
                monthUsage * rate;


            // --------------------------------------------------------
            // ADD SUMMARY
            // --------------------------------------------------------

            usageSummary.push({

                meter_id:
                    meter.meter_id,

                company_id:
                    meter.company_id,

                meter_type:
                    meter.meter_type,

                meter_number:
                    meter.meter_number,

                meter_name:
                    meter.meter_name,

                location:
                    meter.location,

                unit:
                    meter.unit,

                status:
                    meter.status,

                today_usage:
                    Number(
                        todayUsage.toFixed(4)
                    ),

                month_usage:
                    Number(
                        monthUsage.toFixed(4)
                    ),

                rate:
                    Number(
                        rate.toFixed(4)
                    ),

                today_cost:
                    Number(
                        todayCost.toFixed(2)
                    ),

                month_cost:
                    Number(
                        monthCost.toFixed(2)
                    )
            });
        }


        // ============================================================
        // 4. RECENT READINGS FROM ALL ACTIVE METERS
        // ============================================================

        const recentReadings =
            await db.databaseConf.query(
                `
                SELECT
                    r.reading_id,
                    r.meter_id,
                    m.company_id,
                    m.meter_type,
                    m.meter_number,
                    m.meter_name,
                    m.location,
                    m.unit,
                    r.reading_value,
                    r.consumption,
                    r.recorded_at
                FROM utility_readings r
                INNER JOIN utility_meters m
                    ON m.meter_id = r.meter_id
                WHERE m.company_id = :company_id
                  AND m.status = 'ACTIVE'
                ORDER BY
                    r.recorded_at DESC,
                    r.reading_id DESC
                LIMIT 20
                `,
                {
                    replacements: {
                        company_id: companyId
                    },
                    type: db.Sequelize.QueryTypes.SELECT
                }
            );


        // ============================================================
        // 5. RESPONSE
        // ============================================================

        return res.status(200).send({

            data: {

                company: {
                    company_id:
                        companyAccess[0].company_id,

                    company_name:
                        companyAccess[0].company_name,

                    role:
                        companyAccess[0].role
                },

                meters:
                    meterData,

                usage_summary:
                    usageSummary,

                recent_readings:
                    recentReadings
            },

            count: {

                meters:
                    meterData.length,

                usage_summary:
                    usageSummary.length,

                recent_readings:
                    recentReadings.length
            },

            isError:
                false,

            message:
                "Dashboard loaded successfully."
        });


    } catch (error) {

        console.error(
            "GET DASHBOARD ERROR:",
            error
        );

        return res.status(500).send({

            data: null,

            count: 0,

            isError: true,

            message:
                error.message ||
                "Failed to load dashboard."
        });
    }
};