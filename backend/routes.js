const express = require('express')
const router = express.Router()
const axios = require('axios')
// YOUR API ROUTES HERE
const oracle = process.env.ORACLE
const BettyDB = require('./common/BettyDB')
const hash = require('object-hash')
const farmhash = require('farmhash')
const RippleAPI = require('ripple-lib').RippleAPI
const rippleAPI = new RippleAPI({server: 'wss://s.altnet.rippletest.net:51233'})
const broker = require('./common/broker')
const Consensus = require('./common/BasicConsensus')
const consensus = new Consensus(broker)
const {validatePendingBet, validateOpposingPendingBet} = require('./common/Validate')
async function startListeners () {
  await consensus.loadListeners()
}
startListeners()
router.get('/matches', async (req, res) => {
  const url = oracle + '/games'
  const response = await axios.get(url)
  res.send({
    matches: response.data
  })
})

router.get('/match', async (req, res) => {
  const url = oracle + `/games?team1=${req.query.team1}&&team2=${req.query.team2}`
  const response = await axios.get(url)
  res.send({
    match: response.data
  })
})
router.get('/team', async (req, res) => {
  const url = oracle + `/games?team=${req.query.team}`
  const response = await axios.get(url)
  res.send({
    teamMatches: response.data
  })
})

router.get('/wallet-address', async (req, res) => {
  res.send(req.walletAddress)
})
router.get('/bets', async (req, res) => {
  // Returns lists of bets made which are stored in levelDB.
  const newBets = {}
  const bets = await BettyDB.getAllBets()
  for (let key in bets) {
    const match = await BettyDB.getMatch(bets[key].matchId)
    bets[key].match = match
    if (new Date(match.matchTime) > new Date() && !bets[key].opposingBet) {
      newBets[key] = bets[key]
    }
  }
  res.send(newBets)
})

router.post('/bet-info', async (req, res) => {
  // Mark a bet as paid or not. Also add whether or not it's paired.
  // Return destination tag and address to send to user.
  // Check valid address, otherwise return error
  rippleAPI.connect().then(() => {
    return rippleAPI.getAccountInfo(req.body.address)
  }).then(async accountInfo => {
    const destinationTag = farmhash.hash32(hash(req.body))
    // TODO: Add all info into DB into pending DB.
    req.body['destinationTag'] = destinationTag
    console.log('destinationTag', destinationTag)
    consensus.sendInfoToPeers('pendingEpoch', 'addPendingBetListeners', destinationTag)
    await consensus.validateInfo(req.body, validatePendingBet, 'validatePendingObj', 'firstValidatePendingBetInfo', `${destinationTag}`, `secondValidatePendingBetInfo`, 'addPendingBet', true)
    res.send(req.body)
  }).catch(err => {
    console.log('err', err)
    // Send back validation object
    res.send({
      destinationTag: null,
      bettingTeam: null,
      address: null,
      betInfoError: 'Address is not valid. Err: ' + err
    })
  })
})
router.post('/opposing-bet-info', async (req, res) => {
  rippleAPI.connect().then(() => {
    return rippleAPI.getAccountInfo(req.body.address)
  }).then(async accountInfo => {
    const destinationTag = farmhash.hash32(hash(req.body))
    req.body['destinationTag'] = destinationTag
    consensus.sendInfoToPeers('pendingEpoch', 'addPendingBetListeners', destinationTag)
    await consensus.validateInfo(req.body, validateOpposingPendingBet, 'validateOpposingPendingObj', 'firstValidateOpposingPendingBetInfo', `${destinationTag}`, `secondValidateOpposingPendingBetInfo`, 'addPendingBet', true)
    res.send(req.body)
  }).catch(err => {
    console.log('err', err)
    res.send({
      destinationTag: null,
      bettingTeam: null,
      address: null,
      name: null,
      betInfoError: 'Validation Error: ' + err
    })
  })
})
router.post('/bet', async (req, res) => {
  // Post bet. Need to create a transaction and send signed one. Include team to bet on, matchId, amountToBet.
  // Record games to pay out.
})

module.exports = {router, consensus}
