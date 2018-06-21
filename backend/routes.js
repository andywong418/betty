const express = require('express')
const router = express.Router()
const axios = require('axios')
// YOUR API ROUTES HERE
const oracle = process.env.ORACLE
const BettyDB = require('./common/BettyDB')
const hash = require('object-hash')
const RippleAPI = require('ripple-lib').RippleAPI
const rippleAPI = new RippleAPI({server: 'wss://s.altnet.rippletest.net:51233'})
const broker = require('../codule/n-squared')()

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
router.get('/bets', (req, res) => {
  // Returns lists of bets made which are stored in localStorage.
})

router.post('/bet-info', async (req, res) => {
  // Mark a bet as paid or not. Also add whether or not it's paired.
  // Return destination tag and address to send to user.
  // Check valid address, otherwise return error
  rippleAPI.connect().then(() => {
    return rippleAPI.getAccountInfo(req.body.publicKey)
  }).then(async accountInfo => {
    const destinationTag = hash(req.body)
    // TODO: Add all info into DB into pending DB.
    req.body['destinationTag'] = destinationTag
    await BettyDB.addPendingBet(destinationTag, req.body)
    res.send(req.body)
  }).catch(err => {
    console.log('err', err)
    // Send back validation object
    res.send({
      destinationTag: null,
      bettingTeam: null,
      publicKey: null,
      betInfoError: 'Address is not valid. Err: ' + err
    })
  })
})

router.post('/bet', async (req, res) => {
  // Post bet. Need to create a transaction and send signed one. Include team to bet on, matchId, amountToBet.
  // Record games to pay out.
})
// Should record all the games where bets have been made and record whether or not that match result has been paid out.
// Otherwise pay out games 4 hours after match time start if winner has been decided (it most probably will have).
// Remove game from games to pay out after (or should we not remove and just mark them as paid?)

module.exports = router
