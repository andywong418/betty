const debug = require('debug')('betty:payout')
const oracle = process.env.ORACLE
const RippleAPI = require('ripple-lib').RippleAPI
const db = require('../common/BettyDB.js')
const axios = 
async function backgroundPayOut (consensus) {
    // Check each bet
    const bets = await db.getAllBets()
    bets.forEach(async bet => {
        // check for match ID.
        const match = await axios.get(`${oracle}/game/${bet.matchId}`)
        if (match.winner) {
            // Find opposing bet and pay out, otherwise refund.
            if (bet.opposingBet) {

                // Check winner to pay out winner. Add up amounts and transfer.
                const opposingBet = await db.getBet(bet.opposingBet)

                // Change status to resolved
            } else {

                // Change status to refunded.
            }
            
        }
    })
}

module.exports = {
    backgroundPayOut
}