
const db = require('../common/BettyDB.js')
const axios = require('axios')
const oracle = process.env.ORACLE
const {preparePayment} = require('../common/preparePayment')
const RippleAPI = require('ripple-lib').RippleAPI
const ripple = new RippleAPI({
  server: 'wss://s.altnet.rippletest.net:51233' // Public rippled server
})

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
        const opposingBet = bets[bet.opposingbet]
        let winnings = (Number(bet.amount) + Number(opposingBet.amount)) / 1000000
        const match = await axios.get(`${oracle}/game/${bet.matchId}`)
        if (bet.bettingTeam === match.winner) {
          winnerAccount = bet.address
        } else if (opposingBet.bettingTeam === match.winner) {
          winnerAccount = opposingBet.address
        }
        console.log('winnerAcc', winnerAccount, winnings, bet)
        const payment = {
          source: {
            address: sourceAddress,
            maxAmount: {
              value: winnings.toString(),
              currency: 'XRP'
            }
          },
          destination: {
            address: winnerAccount,
            amount: {
              value: winnings.toString,
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
        const instructions = {maxLedgerVersionOffset: 5}
        ripple.connect().then(async () => {
          const prepared = await preparePayment(sourceAddress, payment, instructions)
          const { signedTransaction } = consensus.collectMultiSign(prepared.txJson, ripple, bet.destinationTag)
          ripple.submit(signedTransaction).then((success, err) => {
            if (success) {
              const newBet = {
                ...bet,
                status: 'resolved'
              }
              db.addBet(newBet.destinationTag, newBet)
            }
            if (err) {
              console.log('err:', err)
            }
          })
        })
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
          const { signedTransaction } = consensus.collectMultiSign(prepared.txJson, ripple, bet.destinationTag)
          ripple.submit(signedTransaction).then((success, err) => {
            if (success) {
              const newBet = {
                ...bet,
                status: 'refunded'
              }
              db.addBet(newBet.destinationTag, newBet)
            }
          })
        })
      } catch (err) {
        console.error(err)
      }
    }
  }
}

function backgroundPayOut (consensus) {
  // Check each bet
  setTimeout(function () { startConsensus(consensus) }, 30000 * Math.random() + 10000)
}

module.exports = {
  backgroundPayOut
}
