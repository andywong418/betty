const axios = require('axios')
const oracle = process.env.ORACLE
const db = require('../common/BettyDB.js')
const debug = require('debug')('betty:bets')
const validatePendingBet = async (betObj) => {
    const match = await axios.get(oracle + `/game/${betObj.matchId}`)
    if (match.data.matchTime >= new Date()) {
        return false
    }
    if (betObj.bettingTeam !== match.data.team1 && betObj.bettingTeam !== match.data.team2) {
        return false
    }

    return true
}

async function validateBet (betId) {
    betId = betId.betId
    const bet = await db.getBet(betId)
    if (!isEmpty(bet)) {
      console.log(`Bet ${betId} has already been placed`)
      return false
    }
  
    const pendingBet = await db.getPendingBet(betId)
    if (isEmpty(pendingBet)) {
      console.log(`Bet ${betId} is not defined`)
      return false
    }
    debug(`Bet ${betId} is valid`)
    return pendingBet
  }
  
  async function validateMatch (matchId) {
    matchId = matchId.matchId
    let match
    const url = oracle + `/game/${matchId}`
    const response = await axios.get(url)
    if (response.data === '') {
       return false
    }
  
    match = response.data
    const matchTime = new Date(match.matchTime)
    const now = new Date()
    if (now >= matchTime) {
      return false
    }
    console.log(`Match ${matchId} is valid`, match)
    return match
  }


function isEmpty (obj) {
    return Object.keys(obj).length === 0
}
module.exports = {
    validatePendingBet,
    validateBet,
    validateMatch,
    isEmpty
}