
const db = require('../common/BettyDB.js')
const axios = require('axios')
const oracle = process.env.ORACLE
const Multisign = require('../common/MultisignClass.js')
const RippleAPI = require('ripple-lib').RippleAPI
const ripple = new RippleAPI({
  server: 'wss://s.altnet.rippletest.net:51233' // Public rippled server
})
const broker = require('../common/broker.js')
const signer = new Multisign(broker, ripple)

async function startConsensus (consensus) {
  const bets = await db.getAllBets()
  const sourceAddress = await db.get('sharedWalletAddress')
  for (let key in bets) {
    const bet = bets[key]
    if (!bet.address) {
      // remove from DB?
      continue
    }
    console.log('bet destinationTag', bet.destinationTag)
    const result = await consensus.backgroundConsensus(bet.destinationTag)
    console.log('got result', bet.destinationTag, result)
    if (result === 'resolve') {
      // payout to winner
      // re-query who won?
      try {
        let winnerAccount
        const opposingBet = bets[bet.opposingBet]
        console.log('opposingBet', opposingBet, 'bet', bet)
        let winnings = (Number(bet.amount) + Number(opposingBet.amount)) / 1000000
        const match = await axios.get(`${oracle}/game/${bet.matchId}`)
        console.log('bettingTeam', bet.bettingTeam, opposingBet.bettingTeam, match.data.winner)
        console.log(bet.bettingTeam === match.data.winner)
        console.log(opposingBet.bettingTeam === match.data.winner)
        if (bet.bettingTeam === match.data.winner) {
          console.log('France won', bet.address)
          winnerAccount = bet.address
        } else if (opposingBet.bettingTeam === match.data.winner) {
          console.log('Germany won', opposingBet.address)
          winnerAccount = opposingBet.address
        }
        console.log('winnerAcc', winnerAccount)
        const payment = {
          source: {
            address: sourceAddress.address,
            maxAmount: {
              value: winnings.toString(),
              currency: 'XRP'
            }
          },
          destination: {
            address: winnerAccount,
            amount: {
              value: winnings.toString(),
              currency: 'XRP'
            },
            tag: bet.destinationTag
          },
          memos: [
            {
              data: 'An XRP to pay out winner of Betty game',
              format: 'plain/text'
            }
          ]
        }
        await ripple.connect()
        const prepared = await signer.preparePayment(payment)
        console.log('PREPARED', prepared)
        const { signedTransaction } = consensus.collectMultisign(prepared, ripple, bet.destinationTag)
        const result = await ripple.submit(signedTransaction)
        if (result) {
          const newBet = {
            ...bet,
            status: 'resolved'
          }
          await db.addBet(newBet.destinationTag, newBet)
        }
      } catch (err) {
        console.error(err)
      }
    }
    if (result === 'refund') {
      // refund bet owner
      console.log('bet address', bet.address, bet)
      try {
        const payment = {
          source: {
            address: sourceAddress,
            maxAmount: {
              value: bet.amount.toString(),
              currency: 'XRP'
            }
          },
          destination: {
            address: bet.address,
            amount: {
              value: bet.amount.toString(),
              currency: 'XRP'
            },
            tag: bet.destinationTag
          },
          memos: [
            {
              data: 'An XRP to refund',
              format: 'plain/text'
            }
          ]
        }
        const instructions = {maxLedgerVersionOffset: 5}
        ripple.connect().then(async () => {
          const prepared = await preparePayment(sourceAddress, payment, instructions)
          consensus.collectMultiSign(prepared.txJson, ripple, bet.destinationTag)
          // const { signedTransaction } = consensus.collectMultiSign(prepared.txJson, ripple, bet.destinationTag)
          // ripple.submit(signedTransaction).then((success, err) => {
          //   if (success) {
          //     const newBet = {
          //       ...bet,
          //       status: 'refunded'
          //     }
          //     db.addBet(newBet.destinationTag, newBet)
          //   }
          // })
        })
      } catch (err) {
        console.error(err)
      }
    }
  }
}

function backgroundPayOut (consensus) {
  // Check each bet
  setTimeout(function () { startConsensus(consensus) }, 20000 * Math.random())
}

module.exports = {
  backgroundPayOut
}
