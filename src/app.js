const express = require('express');
const bodyParser = require('body-parser');
const { sequelize, Op } = require('./model')
const {getProfile} = require('./middleware/getProfile')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)
const { ProcessGetContract, ProcessUserContracts, ProcessUserUnpaidJobs, ProcessPayJob, ProcessDepositMoney, ProcessMostEarnedProfession, ProcessBestPayingClient } = require("./controllers/contract.controller");



/**
 * FIXED!
 * @returns contract by id
 */
app.get("/contracts/:id", getProfile, ProcessGetContract)


/**
 * Get Contracts
 * @returns contract by user
 */
app.get("/contracts", getProfile, ProcessUserContracts)


/**
 * Get All Unpaid jobs for a user
 * @returns unpaid jobs by user (client or contractor)
 */
app.get("/jobs/unpaid", getProfile, ProcessUserUnpaidJobs)


/**
 * Pay for a job
 * @returns response of payment (success or failure)
 */
app.post("/jobs/:job_id/pay", getProfile, ProcessPayJob)


/**
 * Deposits money into balance of a client, a client can't deposit more than 25% his total of jobs to pay. (at the deposit moment)
 * @returns response of payment (success or failure)
 */
app.post("/balances/deposit/:userId", getProfile, ProcessDepositMoney)


/**
 * Returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time range.
 * @returns response of profession that earned the most money  (success or failure)
 */
app.get("/admin/best-profession", getProfile, ProcessMostEarnedProfession)


/**
 * returns the clients that paid the most for jobs in the query time period. limit query parameter should be applied, default limit is 2
 * @returns array: resp_code, resp_desc, details: [{id, fullName, paid}]
 */
app.get("/admin/best-clients", getProfile, ProcessBestPayingClient)


module.exports = app;
