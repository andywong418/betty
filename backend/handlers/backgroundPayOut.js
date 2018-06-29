
const db = require('../common/BettyDB.js')

async function startConsensus (consensus) {
  const bets = await db.getAllBets()
  for (let key in bets) {
    const bet = bets[key]
    console.log('bet destinationTag', bet.destinationTag)
    const result = await consensus.backgroundConsensus(bet.destinationTag)
    console.log('got result', bet.destinationTag, result)
    if (result === 'resolve') {
      // payout to winner
    }
    if (result === 'refund') {
      // refund bet owner
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
