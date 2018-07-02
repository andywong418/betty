
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
        let winnings = (Number(bet.amount) + Number(opposingBet.amount)) / 1000000
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
        await consensus.collectMultisign(prepared, ripple, bet.destinationTag)
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
              data: 'refund',
              format: 'plain/text',
              type: 'result'
            }
          ]
        }
        await ripple.connect()
        const prepared = await signer.preparePayment(payment)
        await consensus.collectMultisign(prepared, ripple, bet.destinationTag)
      } catch (err) {
        console.error(err)
      }
    }
  }
}

function backgroundPayOut (consensus) {
  // Check each bet
  setTimeout(async () => {
    await startConsensus(consensus)
    setTimeout(function () {
      backgroundPayOut(consensus)
    }, (1000 * 60 * 60) + (30 * 60 * 1000 * Math.random()))
  }, 20000 * Math.random())
}

module.exports = {
  backgroundPayOut
}
