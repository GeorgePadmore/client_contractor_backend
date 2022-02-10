const express = require('express');
const bodyParser = require('body-parser');
const { sequelize, Op } = require('./model')
const {getProfile} = require('./middleware/getProfile')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

/**
 * FIXED!
 * @returns contract by id
 */
app.get('/contracts/:id',getProfile ,async (req, res) =>{
    const {Contract} = req.app.get('models')
    const {id} = req.profile //retreive profile ID
    contract_id = req.params.id
    const contract = await  Contract.findAll({
        where: {
            id: contract_id,
            [Op.or]: [
                { ContractorId: id },
                { ClientId: id }
            ]
        }
      });

    if(!contract) return res.status(404).end()
    res.json(contract)
})

/**
 * Get Contracts
 * @returns contract by user
 */
app.get('/contracts',getProfile ,async (req, res) =>{
    const {Contract} = req.app.get('models')
    const {id} = req.profile //retreive profile ID

    const contract = await Contract.findAll({
        where: {
            status: { [Op.notIn]: ['terminated'] },
            [Op.or]: [ { ContractorId: id }, { ClientId: id }]
        }
      })

    if(!contract) return res.status(404).end()
    res.json(contract)
})


/**
 * Get All Unpaid jobs for a user
 * @returns unpaid jobs by user (client or contractor)
 */
 app.get('/jobs/unpaid',getProfile ,async (req, res) =>{
    const {Job} = req.app.get('models')
    const {Contract} = req.app.get('models')
    const {id} = req.profile //retreive profile ID

    const job = await Job.findAll({
        where: {paid: { [Op.is]: null }},
        include: [{
          model: Contract,
          where: {
            status: 'in_progress',
            [Op.or]: [ { ContractorId: id }, { ClientId: id }],
          },
        }]
      }).then(function(job_result) {
        return job_result
      })

    if(!job) return res.status(404).end()
    res.json(job)
})



/**
 * Pay for a job
 * @returns response of payment (success or failure)
 */
 app.post('/jobs/:job_id/pay',getProfile ,async (req, res) =>{
    const {Job} = req.app.get('models')
    const {Contract, Profile} = req.app.get('models')
    const {id, balance, type} = req.profile //retreive profile ID
    job_id = req.params.job_id

    var response = {}

    const job = await Job.findAll({
        where: {id: job_id, paid: { [Op.is]: null },},
        include: [{
          model: Contract,
          where: { status: 'in_progress', ClientId: id,},
        }]
      }).then(function(job_result) {
        return job_result
      })

    if (job.length > 0) {
        
        if (type == 'client') {
            const amount = job[0].price;
            const contractorId = job[0].Contract.ContractorId;
            const jobId = job[0].id;
    
            if (balance >= amount) {
    
                const t = await sequelize.transaction();
    
                try {
    
                    Profile.update({ balance: sequelize.literal(`balance - ${amount}`) }, { where: { id: id }}, { transaction: t }); //reduce client's balance
    
                    Profile.update({ balance: sequelize.literal(`balance + ${amount}`) }, { where: { id: contractorId }}, { transaction: t }); //increase contractor's balance
                    
                    Job.update({ paid: 1 }, { where: { id: jobId }}, { transaction: t }); //update job as paid
    
                    await t.commit();
    
                    response = {resp_code: "000", resp_desc: `Payment of ${amount} for ${job[0].description} has been made successfully.`}
                  
                } catch (error) {
                    // If the execution reaches this line, an error was thrown.
                    // We rollback the transaction.
                    await t.rollback();
   
                    response = {resp_code: "999", resp_desc: `Payment of ${amount} for ${job[0].description} failed. Please try again.`}
                }
            }

        }

    }else{
        response = {resp_code: "001", resp_desc: `No record found for this job`}
    }
    
    res.json(response);
})


/**
 * Deposits money into balance of a client, a client can't deposit more than 25% his total of jobs to pay. (at the deposit moment)
 * @returns response of payment (success or failure)
 */
 app.post('/balances/deposit/:userId',getProfile ,async (req, res) =>{
    const {Job} = req.app.get('models')
    const {Contract, Profile} = req.app.get('models')
    const {id, balance, type} = req.profile //retreive profile ID
    client_id = req.params.userId
    const deposit_amount = req.body.deposit_amount
    let total_amount_unpaid = 0

    var resp_code = ""
    var resp_desc = ""
    var response = {}

    const job = await Job.findAll({
        where: {paid: { [Op.is]: null },},
        attributes: [
            [sequelize.fn('sum', sequelize.col('price')), 'total_amount_unpaid'],
        ],
        include: [{
          model: Contract,
          where: { status: 'in_progress', ClientId: client_id},
        }],
        raw: true,
      }).then(function(job_result) {
          total_amount_unpaid = job_result[0].total_amount_unpaid
        return job_result
      })

      const total_job_percent = 0.25 * total_amount_unpaid
      console.log(`total_job_percent = ${total_job_percent}`);

      if (deposit_amount <= total_job_percent ) {
       
        const t = await sequelize.transaction();
    
        try {

            Profile.update({ balance: sequelize.literal(`balance + ${deposit_amount}`) }, { where: { id: client_id }}, { transaction: t });
            
            await t.commit();

            response = {resp_code: "000", resp_desc: `Deposit of ${deposit_amount} has been made successfully.`}
            
        } catch (error) {
            // If the execution reaches this line, an error was thrown.
            // We rollback the transaction.
            await t.rollback();

            response = {resp_code: "999", resp_desc: `Deposit of ${deposit_amount} failed. Please try again.`}
        }

      }else {
        response = {resp_code: "002", resp_desc: "Your deposit was unsuccessful"}
      }

    
    res.json(response);
})




/**
 * Returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time range.
 * @returns response of profession that earned the most money  (success or failure)
 */
app.get('/admin/best-profession',getProfile ,async (req, res) =>{
    const {Job} = req.app.get('models')
    const {Contract, Profile} = req.app.get('models')
    const {id, balance, type} = req.profile //retreive profile ID
    const {start, end } = req.query

    const startDate = WithoutTime(start);
    const endDate = WithoutTime(end);
    
    var response = {}
  
    const job = await Job.findOne({
      where: {
        paid: 1,
        "createdAt": {[Op.between] : [startDate , endDate ]} //date queries as '2022-02-02 00:00:00.000 +00:00' instead of '2022-02-02'
      },
      attributes: [
        "Contract->Contractor.profession",
          [sequelize.fn('sum', sequelize.col('price')), 'total_amount_paid'],
      ],
      order: [[sequelize.col('total_amount_paid'), 'DESC']],
      include: [{
        model: Contract,
        // where: { status: 'terminated'},
        include: [{
          model: Profile,
          as: 'Contractor',
          where: { type: 'contractor'}
          
        }],
      }],
      group: ["Contract->Contractor.profession"],
      
      raw: true,
    }).then(function(job_result) {

      if (job_result) {
        
        console.log(job_result.profession);
        response = {resp_code: "000", resp_desc: `Highest earning profession record found.`, profession: job_result.profession, total_amount: job_result.total_amount_paid}
      }else{
        response = {resp_code: "001", resp_desc: `Sorry, no record found for the specified date range. Please try again`}
      }
      
    })

    res.json(response)

})




/**
 * returns the clients that paid the most for jobs in the query time period. limit query parameter should be applied, default limit is 2
 * @returns array: resp_code, resp_desc, details: [{id, fullName, paid}]
 */
 app.get('/admin/best-clients',getProfile ,async (req, res) =>{
  const {Job} = req.app.get('models')
  const {Contract, Profile} = req.app.get('models')
  const {id, balance, type} = req.profile //retreive profile ID
  const {start, end, limit } = req.query

  const startDate = WithoutTime(start);
  const endDate = WithoutTime(end);
  
  var response = {}

  const job = await Job.findAll({
    where: {
      paid: 1,
      "createdAt": {[Op.between] : [startDate , endDate ]} //date queries as '2022-02-02 00:00:00.000 +00:00' instead of '2022-02-02'
    },
    attributes: [
        "Contract.Client.id",
        [sequelize.literal("firstName || ' ' || lastName"), 'fullName'],
        [sequelize.fn('sum', sequelize.col('price')), 'paid'],
    ],

    order: [[sequelize.col('paid'), 'DESC']],
    include: [{
      model: Contract,
      attributes: {exclude: ['id', 'terms', 'status', 'ContractorId', 'ClientId','createdAt', 'updatedAt']},
      include: [{
        model: Profile,
        as: 'Client',
        attributes: {exclude: ['id', 'firstName', 'lastName', 'profession', 'balance', 'type', 'createdAt', 'updatedAt']},
        where: { type: 'client'}
      }],
    }],
    group: ["Contract->Client.firstName"],
    limit: parseInt(limit),
    raw: true,
  }).then(function(job_result) {

    if (job_result) {
      console.log(job_result);
      response = job_result
    }else{
      response = job_result
    }
    
  })

  res.json(response)

})


function WithoutTime(dateTime) {

  const t = new Date(dateTime);
  const date = ('0' + t.getDate()).slice(-2);
  const month = ('0' + (t.getMonth() + 1)).slice(-2);
  const year = t.getFullYear();
  const full_date = `${year}-${month}-${date}`
  return full_date;
}


module.exports = app;
