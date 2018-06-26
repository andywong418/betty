const axios = require('axios')
const db = require('../common/BettyDB.js')
const debug = require('debug')('betty:bets')
const oracle = process.env.ORACLE
const RippleAPI = require('ripple-lib').RippleAPI
const rippleServer = 'wss://s.altnet.rippletest.net:51233' // public rippled testnet server
const ripple = new RippleAPI({ server: rippleServer })
const {validateBet, validateMatch, isEmpty} = require('../common/Validate')

async function monitorBets (consensus) {
  ripple.connect().then( async () => {
    console.log('rippleAPI connected')
    ripple.connection.on('transaction', async (txObj) => {
      const transaction = txObj.transaction
      try {
        const txHash = transaction.hash
        debug(`Received incoming transaction: ${JSON.stringify(transaction, null, 2)}`)
        await db.addTransaction(txHash, transaction)

        const betId = transaction.DestinationTag
        console.log(`validating bet ${betId}`)
        const pendingBet = await db.getPendingBet(betId)
        const matchId = await consensus.validateInfo({betId}, validateBet, 'validatingBetObj', 'firstValidateBetInfo', `secondValidateBetInfo-${betId}`, 'pendingBetChecked', pendingBet.matchId)
        console.log(`validating details for match ${matchId}`)
        await consensus.validateInfo({matchId}, validateMatch, 'validatingMatchObj', 'firstValidateMatchInfo', `secondValidateMatchInfo-${matchId}`, 'matchChecked', true)
        console.log('getting past match verification?')
        const dbMatch = await db.getMatch(matchId)
        if (isEmpty(dbMatch)) {
          consensus.sendInfoToPeers('addMatch', dbMatch)
        }

        debug(`adding bet ${betId} to pool`)
        consensus.sendInfoToPeers('removePendingBet', {betId})
        const finalBet = {
          ...pendingBet,
          txHash: transaction.txHash,
          amount: transaction.Amount,
          createdAt: new Date()
        }
        console.log('finalBet', finalBet)
        consensus.sendInfoToPeers('addBet', finalBet)
        console.log(`bet ${betId} has been successfully added, bet: ${JSON.stringify(finalBet)}`)
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
