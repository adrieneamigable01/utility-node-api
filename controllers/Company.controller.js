const db = require("../models");


// =====================================================
// CREATE COMPANY
// =====================================================

exports.createCompany = async (req, res) => {

    const transaction =
        await db.databaseConf.transaction();

    try {

        // Logged-in user
        const userid = req.user.userid;

        const {
            company_name,
            company_code,
            address,
            contact_number,
            email
        } = req.body;


        // ==========================================
        // VALIDATION
        // ==========================================

        if (!company_name || !company_name.trim()) {

            await transaction.rollback();

            return res.status(400).send({
                data: null,
                count: 0,
                isError: true,
                message: "Company name is required"
            });

        }


        // ==========================================
        // CHECK COMPANY CODE
        // ==========================================

        if (company_code) {

            const existingCode =
                await db.databaseConf.query(`
                    SELECT company_id
                    FROM companies
                    WHERE company_code = :company_code
                    LIMIT 1
                `, {
                    replacements: {
                        company_code:
                            company_code.trim()
                    },
                    type: db.Sequelize.QueryTypes.SELECT,
                    transaction
                });


            if (existingCode.length > 0) {

                await transaction.rollback();

                return res.status(400).send({
                    data: null,
                    count: 0,
                    isError: true,
                    message: "Company code already exists"
                });

            }

        }


        // ==========================================
        // CREATE COMPANY
        // ==========================================

        const companyResult =
            await db.databaseConf.query(`
                INSERT INTO companies (
                    company_name,
                    company_code,
                    address,
                    contact_number,
                    email,
                    status
                )
                VALUES (
                    :company_name,
                    :company_code,
                    :address,
                    :contact_number,
                    :email,
                    'ACTIVE'
                )
            `, {
                replacements: {
                    company_name:
                        company_name.trim(),

                    company_code:
                        company_code
                            ? company_code.trim()
                            : null,

                    address:
                        address?.trim() || null,

                    contact_number:
                        contact_number?.trim() || null,

                    email:
                        email?.trim() || null
                },

                type: db.Sequelize.QueryTypes.INSERT,

                transaction
            });


        const companyId =
            companyResult[0];


        // ==========================================
        // ADD USER AS OWNER
        // ==========================================

        await db.databaseConf.query(`
            INSERT INTO company_users (
                company_id,
                userid,
                role
            )
            VALUES (
                :company_id,
                :userid,
                'OWNER'
            )
        `, {
            replacements: {
                company_id: companyId,
                userid: userid
            },

            type: db.Sequelize.QueryTypes.INSERT,

            transaction
        });


        // ==========================================
        // GET CREATED COMPANY
        // ==========================================

        const company =
            await db.databaseConf.query(`
                SELECT
                    c.company_id,
                    c.company_name,
                    c.company_code,
                    c.address,
                    c.contact_number,
                    c.email,
                    c.status,
                    c.created_at,
                    c.updated_at,
                    cu.role
                FROM companies c

                INNER JOIN company_users cu
                    ON cu.company_id = c.company_id

                WHERE c.company_id = :company_id
                AND cu.userid = :userid

                LIMIT 1
            `, {
                replacements: {
                    company_id: companyId,
                    userid: userid
                },

                type: db.Sequelize.QueryTypes.SELECT,

                transaction
            });


        await transaction.commit();


        return res.status(201).send({

            data: company[0] || null,

            count: company.length,

            isError: false,

            message: "Company created successfully"

        });


    } catch (error) {

        await transaction.rollback();

        console.error(
            "CREATE COMPANY ERROR:",
            error
        );

        return res.status(500).send({

            data: null,

            count: 0,

            isError: true,

            message:
                error.message ||
                "Error creating company"

        });

    }

};


// =====================================================
// GET MY COMPANIES
// =====================================================

exports.getMyCompanies = async (req, res) => {
    try {

        console.log("REQ.USER:");
        console.dir(req.user, { depth: null });

        const userid = req.user.userid;

        console.log("COMPANY USERID:", userid);

        const data = await db.databaseConf.query(`
            SELECT
                c.company_id,
                c.company_name,
                c.company_code,
                c.address,
                c.contact_number,
                c.email,
                c.status,
                c.created_at,
                c.updated_at,
                cu.role
            FROM company_users cu
            INNER JOIN companies c
                ON c.company_id = cu.company_id
            WHERE cu.userid = :userid
              AND c.status = 'ACTIVE'
            ORDER BY
                c.company_name ASC,
                c.company_id ASC
        `, {
            replacements: {
                userid: userid
            },
            type: db.Sequelize.QueryTypes.SELECT
        });

        return res.status(200).send({
            data: data,
            count: data.length,
            isError: false,
            message: "Success fetch user companies"
        });

    } catch (error) {

        console.error(
            "GET MY COMPANIES ERROR:",
            error
        );

        return res.status(500).send({
            data: [],
            count: 0,
            isError: true,
            message: error.message ||
                "Error retrieving companies"
        });
    }
};