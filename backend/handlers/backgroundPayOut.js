
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
    const result = await consensus.backgroundConsensus(bet.destinationTag)
    if (result === 'resolve') {
      // payout to winner
      // re-query who won?
      try {
        let winnerAccount
        const opposingBet = bets[bet.opposingBet]
        let winnings = (Number(bet.amount) + Number(opposingBet.amount)) / (1000000 * consensus.peerLength)
        const match = await axios.get(`${oracle}/game/${bet.matchId}`)
        if (bet.bettingTeam === match.data.winner) {
          winnerAccount = bet.address
        } else if (opposingBet.bettingTeam === match.data.winner) {
          winnerAccount = opposingBet.address
        }
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
              data: 'resolve',
              format: 'plain/text',
              type: 'result'
            }
          ]
        }
        await ripple.connect()
        const prepared = await signer.preparePayment(payment)
        await consensus.collectMultisign(prepared, bet.destinationTag, 'backgroundPayout')
      } catch (err) {
        console.error(err)
      }
    }
    if (result === 'refund') {
      // refund bet owner
      const amountToRefund = Number(bet.amount) / consensus.peerLength
      try {
        const payment = {
          source: {
            address: sourceAddress.address,
            maxAmount: {
              value: amountToRefund.toString(),
              currency: 'XRP'
            }
          },
          destination: {
            address: bet.address,
            amount: {
              value: amountToRefund.toString(),
              currency: 'XRP'
            },
            tag: bet.destinationTag
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
        await consensus.collectMultisign(prepared, bet.destinationTag, 'backgroundPayout')
      } catch (err) {
        console.error(err)
      }
    }
  }
}

function backgroundPayOut (consensus) {
  // Check each bet
  const timeout = 1000 * 60 * 60 * 10 * Math.random()
  setTimeout(async () => {
    await startConsensus(consensus)
    setTimeout(function () {
      backgroundPayOut(consensus)
    }, (1000 * 60 * 60))
  }, timeout)
}

module.exports = {
  backgroundPayOut
}
