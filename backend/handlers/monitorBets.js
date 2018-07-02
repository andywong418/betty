const db = require('../common/BettyDB.js')
const debug = require('debug')('betty:bets')
const RippleAPI = require('ripple-lib').RippleAPI
const rippleServer = 'wss://s.altnet.rippletest.net:51233' // public rippled testnet server
const ripple = new RippleAPI({ server: rippleServer })
const {validateMatch, isEmpty} = require('../common/Validate')
const {sendEmail} = require('../common/sendEmail')

function hex2a (hexx) {
  var hex = hexx.toString() // force conversion
  var str = ''
  for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16))
  }
  return str
}

async function monitorBets (consensus) {
  ripple.connect().then(async () => {
    const {address} = await db.get('sharedWalletAddress')
    ripple.connection.on('transaction', async (txObj) => {
      const transaction = txObj.transaction
      if (transaction.TransactionType === 'Payment' && transaction.Destination === address) {
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
              betObj.amount = Number(transaction.Amount)
              // Add listeners for bet Id
              try {
                consensus.addBetListeners(betObj.destinationTag)
                const matchId = await consensus.validateInfo(betObj, 'validatingBetObj', 'firstValidateBetInfo', betId, `secondValidateBetInfo`, 'pendingBetChecked', betObj.matchId)
                console.log('post consensus on bet', matchId)
                const match = await validateMatch({matchId})
                consensus.addMatchListeners(matchId)
                await consensus.validateInfo({matchId, destinationTag: matchId}, 'validatingMatchObj', 'firstValidateMatchInfo', matchId, `secondValidateMatchInfo`, 'matchChecked', true)
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
                if (finalBet.opposingBet) {
                  const opposingBet = await db.getBet(finalBet.opposingBet)
                  opposingBet.opposingBet = finalBet.destinationTag
                  db.addBet(opposingBet.destinationTag, opposingBet)
                }
                debug(`bet ${betId} has been successfully added, bet: ${JSON.stringify(finalBet)}`)
                sendEmail({
                  to: finalBet.email,
                  subject: 'Successful bet submitted for betty',
                  text: `Transaction succeeded. Your bet ${finalBet.destinationTag} has been added!`
                })
              } catch (err) {
                console.log(err)
                // Refund

                sendEmail({
                  to: betObj.email,
                  subject: 'Error submitting bet to Betty',
                  text: `Transaction failed. Error: ${err}. Please try to send the transaction again!`
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
            // Refund
            sendEmail({
              to: pendingBet.email,
              subject: 'Error submitting bet to Betty',
              text: `Transaction failed. Error: ${err}. Please try to send the transaction again!`
            })
          }
        }
      }
      if (transaction.Account === address) {
        const bet = await db.getBet(transaction.DestinationTag)
        const winnings = Number(bet.amount) * 2 / 1000000
        console.log('unique memo', hex2a(transaction.Memos[0].Memo.MemoData))
        if (hex2a(transaction.Memos[0].Memo.MemoData) === 'resolve') {
          const newBet = {
            ...bet,
            status: 'resolved'
          }
          console.log('newBET?!', newBet)
          await db.addBet(newBet.destinationTag, newBet)
          sendEmail({
            to: bet.email,
            subject: 'Successfully won bet!',
            text: `Check your account. You should have won ${winnings} XRP`
          })
        }
        if (hex2a(transaction.Memos[0].Memo.MemoData) === 'refund') {
          const newBet = {
            ...bet,
            status: 'refunded'
          }
          await db.addBet(newBet.destinationTag, newBet)
          const refund = Number(bet.amount) / 1000000
          sendEmail({
            to: bet.email,
            subject: 'Bet refunded!',
            text: `Check your account. You should have refunded ${refund} XRP`
          })
        }
      }
    })

    return ripple.connection.request({
      command: 'subscribe',
      accounts: [ address ]
    })
  }).catch(console.error)
}

module.exports = { monitorBets }
