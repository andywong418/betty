const axios = require('axios')
const db = require('../common/BettyDB.js')
const debug = require('debug')('betty:bets')
const oracle = process.env.ORACLE
const RippleAPI = require('ripple-lib').RippleAPI
const rippleServer = 'wss://s.altnet.rippletest.net:51233' // public rippled testnet server
const ripple = new RippleAPI({ server: rippleServer })
const {validateBet, validateMatch, isEmpty} = require('../common/Validate')
const {sendEmail} = require('../common/sendEmail')

async function monitorBets (consensus) {
  ripple.connect().then(async () => {
    const account = await db.get('sharedWalletAddress')
    ripple.connection.on('transaction', async (txObj) => {
      const transaction = txObj.transaction
      console.log('transaction?', transaction)
      if (transaction.TransactionType === 'Payment') {
        try {
          const txHash = transaction.hash
          debug(`Received incoming transaction: ${JSON.stringify(transaction, null, 2)}`)
          await db.addTransaction(txHash, transaction)
          const betId = transaction.DestinationTag
          debug(`validating bet ${betId}`)
          const pendingBet = await db.getPendingBet(betId)
          pendingBet.amount = transaction.Amount
          pendingBet.address = transaction.Account
          const matchId = await consensus.validateInfo(pendingBet, validateBet, 'validatingBetObj', 'firstValidateBetInfo', `secondValidateBetInfo-${betId}`, 'pendingBetChecked', pendingBet.matchId)
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
            createdAt: new Date()
          }
          debug('finalBet', finalBet)
          consensus.sendInfoToPeers('addBet', finalBet)
          debug(`bet ${betId} has been successfully added, bet: ${JSON.stringify(finalBet)}`)
          sendEmail({
            to: finalBet.email,
            subject: 'Successful bet submitted for betty',
            text: `Transaction succeeded. Your bet ${finalBet.destinationTag} has been added!`
          })
        } catch (err) {
          console.log(err)
          const betId = transaction.DestinationTag
          const pendingBet = await db.getPendingBet(betId)
          sendEmail({
            to: pendingBet.email,
            subject: 'Error submitting bet to Betty',
            text: `Transaction failed. Error: ${err}`
          })
        }
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
