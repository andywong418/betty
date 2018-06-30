const db = require('../common/BettyDB.js')
const debug = require('debug')('betty:bets')
const RippleAPI = require('ripple-lib').RippleAPI
const rippleServer = 'wss://s.altnet.rippletest.net:51233' // public rippled testnet server
const ripple = new RippleAPI({ server: rippleServer })
const {validateBet, validateMatch, isEmpty} = require('../common/Validate')
const {sendEmail} = require('../common/sendEmail')

async function monitorBets (consensus) {
  ripple.connect().then(async () => {
    // const account = await db.get('sharedWalletAddress')
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
          // Add listeners for query and response of for this betId. Ask neighbours for pending Bet
          consensus.addListener(betId, 'queryPendingBet', async (i, betId) => {
            const pendingBet = await db.getPendingBet(betId)
            if (!isEmpty(pendingBet)) {
              console.log('pending Bet?', pendingBet)
              consensus.sendInfoToPeer(betId, 'pendingBetResponse', i, JSON.stringify(pendingBet))
            } else {
              consensus.sendInfoToPeer(betId, 'pendingBetResponse', i, 'nothing')
            }
          })

          consensus.addListener(betId, 'pendingBetResponse', async (i, betObj) => {
            console.log('betOBJ', betObj)
            if (betObj !== 'nothing') {
              // validate this bet
              betObj = JSON.parse(betObj)
              // Add listeners for bet Id
              try {
                consensus.addBetListeners(betObj.destinationTag)
                const matchId = await consensus.validateInfo(betObj, validateBet, 'validatingBetObj', 'firstValidateBetInfo', betId, `secondValidateBetInfo`, 'pendingBetChecked', betObj.matchId)
                console.log('post consensus on bet', matchId)
                const match = await validateMatch({matchId})
                consensus.addMatchListeners(matchId)
                await consensus.validateInfo({matchId, destinationTag: matchId}, validateMatch, 'validatingMatchObj', 'firstValidateMatchInfo', matchId, `secondValidateMatchInfo`, 'matchChecked', true)
                const dbMatch = await db.getMatch(matchId)

                if (isEmpty(dbMatch)) {
                  db.addMatch(matchId, match)
                }
                debug(`adding bet ${betObj.betId} to pool`)
                const pendingBet = await db.getPendingBet(betObj.destinationTag)
                if (!isEmpty(pendingBet)) {
                  // remove bet
                  db.removePendingBet(pendingBet.destinationTag)
                }
                const finalBet = {
                  ...betObj,
                  txHash: transaction.hash,
                  createdAt: new Date()
                }
                debug('finalBet', finalBet)
                await db.addBet(finalBet.destinationTag, finalBet)
                debug(`bet ${betId} has been successfully added, bet: ${JSON.stringify(finalBet)}`)
                sendEmail({
                  to: finalBet.email,
                  subject: 'Successful bet submitted for betty',
                  text: `Transaction succeeded. Your bet ${finalBet.destinationTag} has been added!`
                })
              } catch (err) {
                console.log(err)
                sendEmail({
                  to: betObj.email,
                  subject: 'Error submitting bet to Betty',
                  text: `Transaction failed. Error: ${err}`
                })
              }
            }
          })
          consensus.sendInfoToPeers(betId, 'queryPendingBet', betId)
        } catch (err) {
          console.log(err)
          const betId = transaction.DestinationTag
          const pendingBet = await db.getPendingBet(betId)
          if (!isEmpty(pendingBet)) {
            sendEmail({
              to: pendingBet.email,
              subject: 'Error submitting bet to Betty',
              text: `Transaction failed. Error: ${err}`
            })
          }
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
