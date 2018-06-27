const axios = require('axios')
const db = require('../common/BettyDB.js')
const debug = require('debug')('betty:bets')
const oracle = process.env.ORACLE
const RippleAPI = require('ripple-lib').RippleAPI
const rippleServer = 'wss://s.altnet.rippletest.net:51233' // public rippled testnet server
const ripple = new RippleAPI({ server: rippleServer })
const {validateBet, validateMatch, isEmpty} = require('../common/Validate')

async function monitorBets (consensus) {
  ripple.connect().then(async () => {
    console.log('rippleAPI connected')
    ripple.connection.on('transaction', async (txObj) => {
      const transaction = txObj.transaction
      try {
        const txHash = transaction.hash
        debug(`Received incoming transaction: ${JSON.stringify(transaction, null, 2)}`)
        await db.addTransaction(txHash, transaction)

        const betId = transaction.DestinationTag
        debug(`validating bet ${betId}`)
        const pendingBet = await db.getPendingBet(betId)
        const matchId = await consensus.validateInfo({betId}, validateBet, 'validatingBetObj', 'firstValidateBetInfo', `secondValidateBetInfo-${betId}`, 'pendingBetChecked', pendingBet.matchId)
        debug(`validating details for match ${matchId}`)
        const match = await validateMatch({matchId})
        debug('checking match', match)
        await consensus.validateInfo({matchId}, validateMatch, 'validatingMatchObj', 'firstValidateMatchInfo', `secondValidateMatchInfo-${matchId}`, 'matchChecked', true)
        const dbMatch = await db.getMatch(matchId)
        if (isEmpty(dbMatch)) {
          consensus.sendInfoToPeers('addMatch', match)
        }

        debug(`adding bet ${betId} to pool`)
        consensus.sendInfoToPeers('removePendingBet', {betId})
        const finalBet = {
          ...pendingBet,
          txHash: transaction.hash,
          amount: transaction.Amount,
          createdAt: new Date()
        }
        debug('finalBet', finalBet)
        consensus.sendInfoToPeers('addBet', finalBet)
        debug(`bet ${betId} has been successfully added, bet: ${JSON.stringify(finalBet)}`)
      } catch (err) {
        console.log(err)
      }
    })
    const { address } = await db.get('sharedWalletAddress')

    return ripple.connection.request({
      command: 'subscribe',
      accounts: [ address ]
    })
  }).catch(console.error)
}

module.exports = { monitorBets }
