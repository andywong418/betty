const level = require('level')
let dbUrl = './mydb'
if (process.env.PORT) {
  dbUrl += '-' + process.env.PORT
}

const db = level(dbUrl, { valueEncoding: 'json' })
const MATCHES_KEY = 'matches'
const TRANSACTIONS_KEY = 'transactions'
const BETS_KEY = 'bets'
const PENDING_BETS_KEY = 'pendingBets'

class BettyDB {
  constructor () {
    this.db = db
  }

  async getAllBets () {
    return this.get(BETS_KEY, {})
  }

  async getAllMatches () {
    return this.get(MATCHES_KEY, {})
  }

  async getBet (betId) {
    const bets = await this.get(BETS_KEY, {})
    const bet = bets[betId]
    if (!bet) { return {} }
    return bet
  }

  async getMatch (matchId) {
    const matches = await this.getAllMatches()
    const match = matches[matchId]
    if (!match) { return {} }
    return match
  }

  async getAllPendingBets () {
    return this.get(PENDING_BETS_KEY, {})
  }

  async getPendingBet (betId) {
    const pendingBets = await this.getAllPendingBets()
    const bet = pendingBets[betId]
    if (!bet) { return {} }
    return bet
  }

  async getAllTransactions () {
    return this.get(TRANSACTIONS_KEY, {})
  }

  async getTransaction (txHash) {
    const transactions = await this.getAllTransactions()
    const tx = transactions[txHash]
    if (!tx) { return {} }
    return tx
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

  async addBet (betId, betObj) {
    // add bet to match obj
    const matchId = betObj.matchId
    const match = await this.getMatch(matchId)
    if (!match.bets) {
      match.bets = { betId: betObj }
    } else {
      match.bets[betId] = betObj
    }
    // add bet to bets list
    const bets = await this.get(BETS_KEY, {})
    bets[betId] = betObj
    await this.set(BETS_KEY, bets)
  }

  async addPendingBet (betId, betObj) {
    const pendingBets = await this.get(PENDING_BETS_KEY, {})
    pendingBets[betId] = betObj
    await this.set(PENDING_BETS_KEY, pendingBets)
  }

  async removePendingBet (betId) {
    const pendingBets = await this.get(PENDING_BETS_KEY, {})
    delete pendingBets[betId]
    await this.set(PENDING_BETS_KEY, pendingBets)
  }

  async del (key) {
    try {
      this.db.del(key)
    } catch (err) {
      throw err
    }
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
