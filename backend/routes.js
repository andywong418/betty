const express = require('express')
const router = express.Router()
const axios = require('axios')
// YOUR API ROUTES HERE
const oracle = process.env.ORACLE

// SAMPLE ROUTE
router.use('/users', (req, res) => {
  res.json({ success: true })
})

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

router.get('/bets', (req, res) => {
  // Returns lists of bets made which are stored in localStorage.
})
router.post('/bet', async (req, res) => {
  // Post bet. Need to create a transaction and send signed one. Include team to bet on, matchId, amountToBet.
  // Record games to pay out.
})
// Should record all the games where bets have been made and record whether or not that match result has been paid out.
// Otherwise pay out games 4 hours after match time start if winner has been decided (it most probably will have).
// Remove game from games to pay out after (or should we not remove and just mark them as paid?)

module.exports = router
