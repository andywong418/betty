const level = require('level')
let dbUrl = './mydb'
if (process.env.PORT) {
  dbUrl += '-' + process.env.PORT
}

const db = level(dbUrl, { valueEncoding: 'json' })
const MATCHES_KEY = 'matches'
const TRANSACTIONS_KEY = 'transactions'

class BettyDB {
  constructor () {
    this.db = db
  }

  async getAllMatches () {
    const matches = await this.get(MATCHES_KEY, {})
    return matches
  }

  async getMatch (matchId) {
    const matches = await this.getAllMatches()
    return matches[matchId]
  }

  async getAllTransactions () {
    return this.get(TRANSACTIONS_KEY, {})
  }

  async getTransaction (txHash) {
    const transactions = await this.getAllTransactions()
    return transactions[txHash]
  }

  async addTransaction (txHash, txObj) {
    const transactions = await this.getAllTransactions()
    transactions[txHash] = txObj
    await this.set(TRANSACTIONS_KEY, transactions)
  }

  async addMatch (matchId, matchObj) {
    const matches = await this.getAllMatches()
    matches[matchId] = matchObj
    await this.set(MATCHES_KEY, matches)
  }

  async addBet (matchId, betObj) {
    const match = await this.getMatch(matchId)
    const bets = match.bets
    match.bets = [...bets, ...[betObj]]
    await this.addMatch(matchId, match)
  }

  async get (key, defaultValue = '') {
    let value
    try {
      value = await this.db.get(key, { asBuffer: false })
    } catch (err) {
      if (err.notFound) {
        value = defaultValue
      } else {
        throw err
      }
    }
    return value
  }

  async set (key, value) {
    try {
      value = await this.db.put(key, value)
    } catch (err) {
      throw err
    }
  }
}

module.exports = new BettyDB()
