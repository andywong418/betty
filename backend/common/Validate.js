const axios = require('axios')
const oracle = process.env.ORACLE
const db = require('../common/BettyDB.js')
const debug = require('debug')('betty:bets')
const TRANSACTION_COST = 100
const MAX_BET = 1000000
const validatePendingBet = async (betObj) => {
  const match = await axios.get(oracle + `/game/${betObj.matchId}`)
  if (new Date(match.data.matchTime) <= new Date()) {
    return false
  }
  if (betObj.bettingTeam !== match.data.team1 && betObj.bettingTeam !== match.data.team2) {
    return false
  }

  return true
}
const validateOpposingPendingBet = async (betObj) => {
  const match = await axios.get(oracle + `/game/${betObj.matchId}`)
  const opposingBet = await db.getBet(betObj.opposingBet)
  if (new Date(match.data.matchTime) <= new Date()) {
    return false
  }
  if (opposingBet.opposingBet) {
    // Can't set opposing bet for someone who has already been paired off.
    return false
  }
  if (opposingBet.address === betObj.address) {
    // Pending Bet against yourself
    console.log('Cannot post pending bet against yourself')
    return false
  }
  if (betObj.bettingTeam !== match.data.team1 && betObj.bettingTeam !== match.data.team2) {
    return false
  }

  if (betObj.bettingTeam === opposingBet.bettingTeam) {
    return false
  }

  return true
}
async function validateBet (bet) {
  if (Number(bet.amount) > MAX_BET) {
    return false
  }
  if (bet.opposingBet) {
    // check if bet matches opposing bet within a certain bound
    const opposingBet = await db.getBet(bet.opposingBet)
    if (bet.amount < opposingBet.amount - TRANSACTION_COST || bet.amount > opposingBet.amount + TRANSACTION_COST) {
      console.log('amounts do not match')
      return false
    }
    if (bet.address === opposingBet.address) {
      console.log('cannot bet against yourself')
      return false
    }
    if (opposingBet.opposingBet) {
      // been paired off already. Remove opposing Bet of this one and create a new one.
      delete bet.opposingBet
    }
  }
  const checkBet = await db.get(bet.destinationTag)
  if (!isEmpty(checkBet)) {
    console.log(`Bet ${bet.destinationTag} has already been placed`)
    return false
  }
  debug(`Bet ${bet.destinationTag} is valid`)
  return bet
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
  validateOpposingPendingBet,
  isEmpty
}
