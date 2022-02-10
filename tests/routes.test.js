const request = require('supertest')
const app = require('../src/app')


describe('/contracts/:id Endpoint', () => {
  it('should get contract by Id', async () => {
    const res = await request(app)
        .get('/contracts/1')
        .set('profile_id', 2)
    expect(res.status).toBe(200)
  })
})


describe('GET /contracts - Returns a list of contracts belonging to a user (client or contractor), the list should only contain non terminated contracts.', () => {
    it('should list of contracts belonging to a user', async () => {
      const res = await request(app)
        .get('/contracts')
        .set('profile_id', 2)
      expect(res.status).toBe(200)
    })
})


describe('GET /jobs/unpaid - Get all unpaid jobs for a user (either a client or contractor), for active contracts only.', () => {
    it('should get all unpaid jobs for a user', async () => {
      const res = await request(app)
        .get('/jobs/unpaid')
        .set('profile_id', 2)
      expect(res.status).toBe(200)
    })
})


describe('POST /jobs/:job_id/pay - Pay for a job, a client can only pay if his balance >= the amount to pay. The amount should be moved from the clients balance to the contractor balance.', () => {
    it('should Pay for a job', async () => {
        const job_id = 1
        const res = await request(app)
            .post(`/jobs/${job_id}/pay`)
            .set('profile_id', 2)
        expect(res.status).toBe(200)
    })
})

describe('POST /balances/deposit/:userId - Deposits money into the balance of a client, a client cannot deposit more than 25% his total of jobs to pay. (at the deposit moment)', () => {
    it('should deposits money into the balance of a client', async () => {
        const userId = 2
        const res = await request(app)
            .post(`/balances/deposit/${userId}`)
            .set('profile_id', 2)
            .send({
                amount: 10
            })
        expect(res.status).toBe(200)
    })
})



describe('GET /admin/best-profession?start=<date>&end=<date> - Returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time range.', () => {
    it('should return the profession that earned the most money', async () => {
      const res = await request(app)
        .get('/admin/best-profession?start=2020-02-02&end=2022-02-10')
        .set('profile_id', 2)
      expect(res.status).toBe(200)
    })
})


describe('/admin/best-clients?start=<date>&end=<date>&limit=<integer> - returns the clients that paid the most for jobs in the query time period. limit query parameter should be applied, default limit is 2.', () => {
    it('should return all records if exists', async () => {
      const res = await request(app)
        .get('/admin/best-clients?start=2020-02-02&end=2022-02-10&limit=3')
        .set('profile_id', 2)

      expect(res.status).toBe(200)
    })
})

describe('/admin/best-clients?start=<date>&end=<date>&limit=<integer>', () => {
    it('should limit records to 2 by default', async () => {
      const res = await request(app)
        .get('/admin/best-clients?start=2020-02-02&end=2022-02-10')
        .set('profile_id', 2)
      expect(res.status).toBe(200)

      expect(res.body.length).toBe(2)

    })
})
