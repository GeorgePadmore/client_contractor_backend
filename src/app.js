const express = require('express');
const bodyParser = require('body-parser');
const { sequelize, Op } = require('./model')
const {getProfile} = require('./middleware/getProfile')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

/**
 * FIX ME!
 * @returns contract by id
 */
app.get('/contracts/:id',getProfile ,async (req, res) =>{
    const {Contract} = req.app.get('models')
    const {id} = req.profile //retreive profile ID
    const contract = await  Contract.findAll({
        where: {
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

    // var condition = title ? { title: { [Op.like]: `%${title}%` } } : null;
    // var condition = id ? { status: { [Op.notIn]: ['terminated'] }, [Op.or]: [ { ContractorId: id }, { ClientId: id }] } : null;
    // console.log(condition);
    // const contract = await Contract.findAll({where: {condition}})

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



module.exports = app;
