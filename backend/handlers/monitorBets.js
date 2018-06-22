const axios = require('axios')
const db = require('../common/BettyDB.js')
const account = db.get('sharedWalletAddress')
const debug = require('debug')('betty:bets')
const oracle = process.env.ORACLE
const RippleAPI = require('ripple-lib').RippleAPI
const rippleServer = 'wss://s.altnet.rippletest.net:51233' // public rippled testnet server
const ripple = new RippleAPI({ server: rippleServer })

async function monitorBets () {
  ripple.connect().then(() => {
    ripple.connection.on('transaction', async (txObj) => {
      const transaction = txObj.transaction
      try {
        const txHash = transaction.hash
        debug(`Received incoming transaction: ${JSON.stringify(transaction, null, 2)}`)
        await db.addTransaction(txHash, transaction)

        const betId = transaction.DestinationTag
        debug(`validating bet ${betId}`)
        const pendingBet = await validateBet(betId)

        const matchId = pendingBet.matchId
        debug(`validating details for match ${matchId}`)
        const match = await validateMatch(matchId)
        const dbMatch = await db.getMatch(matchId)
        if (isEmpty(dbMatch)) {
          await db.addMatch(matchId, match)
        }

        debug(`adding bet ${betId} to pool`)
        await db.removePendingBet(betId)
        const finalBet = {
          ...pendingBet,
          txHash: transaction.txHash,
          amount: transaction.Amount,
          createdAt: new Date()
        }
        await db.addBet(betId, finalBet)
        debug(`bet ${betId} has been successfully added, bet: ${JSON.stringify(finalBet)}`)
      } catch (err) {
        console.log(err)
      }
    })

    return ripple.connection.request({
      command: 'subscribe',
      accounts: [ account ]
    })
  }).catch(console.error)
}

async function validateBet (betId) {
  const bet = await db.getBet(betId)
  if (!isEmpty(bet)) {
    throw new Error(`Bet ${betId} has already been placed`)
  }

  const pendingBet = await db.getPendingBet(betId)
  if (isEmpty(pendingBet)) {
    throw new Error(`Bet ${betId} is not defined`)
  }
  debug(`Bet ${betId} is valid`)
  return pendingBet
}

async function validateMatch (matchId) {
  let match
  const url = oracle + `/game/${matchId}`
  const response = await axios.get(url)
  if (response.data === '') {
    throw new Error(`Match ${matchId} does not exist`)
  }

  match = response.data
  const matchTime = new Date(match.matchTime)
  const now = new Date()
  if (now >= matchTime) {
    throw new Error(`Match ${matchId} has already started`)
  }
  debug(`Match ${matchId} is valid`)
  return match
}

function isEmpty (obj) {
  return Object.keys(obj).length === 0
}

module.exports = { monitorBets }
