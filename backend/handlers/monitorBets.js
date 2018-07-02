const db = require('../common/BettyDB.js')
const debug = require('debug')('betty:bets')
const RippleAPI = require('ripple-lib').RippleAPI
const rippleServer = 'wss://s.altnet.rippletest.net:51233' // public rippled testnet server
const ripple = new RippleAPI({ server: rippleServer })
const {validateMatch, isEmpty} = require('../common/Validate')
const {sendEmail} = require('../common/sendEmail')
const Multisign = require('../common/MultisignClass.js')
const broker = require('../common/broker.js')
const signer = new Multisign(broker, ripple)

function hex2a (hexx) {
  var hex = hexx.toString() // force conversion
  var str = ''
  for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16))
  }
  return str
}
async function refundPendingBet (consensus, betObj, address, transaction) {
  const amount = Number(transaction.Amount) / (1000000)
  const payment = {
    source: {
      address,
      maxAmount: {
        value: amount.toString(),
        currency: 'XRP'
      }
    },
    destination: {
      address: transaction.Account,
      amount: {
        value: amount.toString(),
        currency: 'XRP'
      },
      tag: betObj.destinationTag
    },
    memos: [
      {
        data: 'refund',
        format: 'plain/text',
        type: 'result'
      }
    ]
  }
  await ripple.connect()
  const prepared = await signer.preparePayment(payment)

  consensus.addListener(betObj.destinationTag, 'multiSignForPendingRefund', async (i, txStr) => {
    const txJSON = JSON.parse(txStr)
    await signer.processTransaction(i, txJSON, betObj.destinationTag, 'refundPendingBet')
  })
  await consensus.collectMultisign(prepared, betObj.destinationTag, 'refundPendingBet')
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
              consensus.sendInfoToPeer(betId, 'pendingBetResponse', i, JSON.stringify(pendingBet))
            } else {
              consensus.sendInfoToPeer(betId, 'pendingBetResponse', i, 'nothing')
            }
          })

          consensus.addListener(betId, 'pendingBetResponse', async (i, betObj) => {
            if (betObj !== 'nothing') {
              // validate this bet
              betObj = JSON.parse(betObj)
              betObj.amount = Number(transaction.Amount)
              betObj.address = transaction.Account
              // Add listeners for bet Id
              try {
                consensus.addBetListeners(betObj.destinationTag)
                const matchId = await consensus.validateInfo(betObj, 'validatingBetObj', 'firstValidateBetInfo', betId, `secondValidateBetInfo`, 'pendingBetChecked', betObj.matchId)
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
                await refundPendingBet(consensus, betObj, address, transaction)
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
            // No Refund because an error means
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
        const pendingBet = await db.getPendingBet(transaction.DestinationTag)
        if (!isEmpty(pendingBet)) {
          const refund = Number(transaction.Amount) / 1000000
          if (hex2a(transaction.Memos[0].Memo.MemoData) === 'refund') {
            sendEmail({
              to: pendingBet.email,
              subject: 'Bet refunded!',
              text: `Check your account. You should have been refunded ${refund} XRP.`
            })
          }
        }
        if (!isEmpty(bet)) {
          const winnings = Number(bet.amount) * 2 / 1000000
          if (hex2a(transaction.Memos[0].Memo.MemoData) === 'resolve') {
            const newBet = {
              ...bet,
              status: 'resolved'
            }
            await db.addBet(newBet.destinationTag, newBet)
            sendEmail({
              to: bet.email,
              subject: 'Successfully won bet!',
              text: `Check your account. You should have won ${winnings} XRP sent from ${consensus.peerLength} running contracts.`
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
              text: `Check your account. You should have been refunded ${refund} XRP from ${consensus.peerLength} running contracts`
            })
          }
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
