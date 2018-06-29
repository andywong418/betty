
const {validatePendingBet, validateBet, validateMatch, validateOpposingPendingBet, isEmpty} = require('./Validate')
const BettyDB = require('./BettyDB')
const axios = require('axios')
const oracle = process.env.ORACLE
// Implement Lamport, Pease and Shostak Algo
class BasicConsensus {
  constructor (broker) {
    this.broker = broker
    this.db = BettyDB
    this.peerLength = JSON.parse(process.env.CONTRACT_INSTANCES).length
    this.betObjConsensus = {}
    // load all bets and create a listener for each
    this.loadListeners()
    this.broker.receive('pendingEpoch', 'addPendingBetListeners', (i, betId) => {
      console.log('getting in here?', betId)
      this.addPendingBetListeners(betId)
    })
    this.broker.receive('betEpoch', 'addBetListeners', (i, betId) => {
      this.addBetListeners(betId)
    })
    this.broker.receive('matchEpoch', 'addMatchListeners', (i, matchId) => {
      this.addMatchListeners(matchId)
    })
  }

  addPendingBetListeners (betId) {
    // Add this to all the different hosts.
    this.broker.receive(`${betId}`, 'firstValidatePendingBetInfo', async (i, betObj) => {
      console.log('ever getting in?')
      betObj = JSON.parse(betObj)

      const validated = await validatePendingBet(betObj)
      this.broker.broadcast(`${betObj.destinationTag}`, `secondValidatePendingBetInfo`, JSON.stringify({validated}))
    })
    this.broker.receive(`${betId}`, 'addPendingBet', async (i, betStr) => {
      const betObj = JSON.parse(betStr)
      console.log('pending betObj', betObj)
      try {
        this.db.addPendingBet(betObj['destinationTag'], betObj)
      } catch (err) {
        console.log('error adding pending bet', err)
      }
    })
    this.broker.receive(`${betId}`, 'removePendingBet', (i, betId) => {
      betId = JSON.parse(betId)
      betId = betId.betId
      this.db.removePendingBet(betId)
    })
    this.broker.receive(`${betId}`, 'firstValidateOpposingPendingBetInfo', async (i, betObj) => {
      betObj = JSON.parse(betObj)
      console.log('betObj opposing', betObj)
      const validated = await validateOpposingPendingBet(betObj)
      this.broker.broadcast(`${betObj.destinationTag}`, `secondValidateOpposingPendingBetInfo`, JSON.stringify({validated}))
    })
  }

  addBetListeners (betId) {
    this.broker.receive(`${betId}`, 'firstValidateBetInfo', async (i, betObj) => {
      betObj = JSON.parse(betObj)
      const validated = await validateBet(betObj)
      this.broker.broadcast(`${betObj.destinationTag}`, `secondValidateBetInfo`, JSON.stringify({validated}))
    })

    this.broker.receive(`${betId}`, 'addBet', async (i, betObj) => {
      betObj = JSON.parse(betObj)
      try {
        console.log('adding bet', betObj)
        if (betObj.opposingBet) {
          let opposingBet = await this.db.getBet(betObj.opposingBet)
          opposingBet.opposingBet = betObj.destinationTag
          await this.db.addBet(opposingBet.destinationTag, opposingBet)
        }
        await this.db.addBet(betObj.destinationTag, betObj)
      } catch (err) {
        console.log('error adding bet', err)
      }
    })

    this.broker.receive(`${betId}`, 'firstBackgroundConsensus', async (i, betId) => {
      console.log('check bet ID', betId)
      const bet = await this.db.getBet(betId)
      if (!isEmpty(bet)) {
        const match = await axios.get(`${oracle}/game/${bet.matchId}`)
        // check match winner
        // check status
        // if refunded/resolved - ignore. Check that status is refunded or resolved.
        // otherwise resolve/ pay out via multisign if there is an opposing bet
        // refund through multisign if there isn't
        if (bet.status === 'resolved' || bet.status === 'refunded' || !match.data.winner) {
          this.broker.broadcast(`${betId}`, `secondBackgroundConsensus`, JSON.stringify({
            result: 'ignore'
          }))
        }
        if (match.data.winner) {
          // Find opposing bet and pay out, otherwise refund.
          if (bet.opposingBet) {
            // Check winner to pay out winner. Add up amounts and transfer.
            const opposingBet = await this.db.getBet(bet.opposingBet)
            if (opposingBet.status !== 'resolved' || opposingBet.status !== 'refunded') {
              this.broker.broadcast(`${betId}`, `secondBackgroundConsensus`, JSON.stringify({
                result: 'resolve'
              }))
            } else {
              this.broker.broadcast(`${betId}`, `secondBackgroundConsensus`, JSON.stringify({
                result: 'ignore'
              }))
            }
            // Change status to resolved
          } else {
            // Change status to refunded.
            this.broker.broadcast(`${betId}`, `secondBackgroundConsensus`, JSON.stringify({
              result: 'refund'
            }))
          }
        }
      } else {
        this.broker.broadcast(`${betId}`, `secondBackgroundConsensus`, JSON.stringify({
          result: 'ignore'
        }))
      }
    })
  }

  addMatchListeners (matchId) {
    this.broker.receive(`${matchId}`, 'firstValidateMatchInfo', async (i, matchId) => {
      matchId = JSON.parse(matchId)
      const match = await validateMatch(matchId)
      let validated = false
      console.log('match', match)
      if (!isEmpty(match)) {
        validated = true
      }
      this.broker.broadcast(`${matchId.matchId}`, `secondValidateMatchInfo`, JSON.stringify({validated}))
    })
    this.broker.receive(`${matchId}`, 'addMatch', (i, matchObj) => {
      matchObj = JSON.parse(matchObj)
      console.log('matchObj for adding', matchObj, typeof matchObj, matchObj.id)
      this.db.addMatch(matchObj.id, matchObj)
    })
  }

  async loadListeners () {
    const pendingBets = await this.db.getAllPendingBets()
    const bets = await this.db.getAllBets()
    const matches = await this.db.getAllMatches()

    for (let key in pendingBets) {
      const pendingBet = pendingBets[key]
      this.addPendingBetListeners(pendingBet.destinationTag)
    }

    for (let key in bets) {
      const bet = bets[key]
      this.addBetListeners(bet.destinationTag)
    }

    for (let key in matches) {
      const match = matches[key]
      this.addMatchListeners(match.id)
    }
  }

  modeArray (array) {
    if (array.length === 0) { return null }
    let modeMap = {}
    let maxCount = 1
    let modes = [array[0]]

    for (var i = 0; i < array.length; i++) {
      var el = array[i]

      if (modeMap[el] == null) { modeMap[el] = 1 } else { modeMap[el]++ }

      if (modeMap[el] > maxCount) {
        modes = [el]
        maxCount = modeMap[el]
      } else if (modeMap[el] === maxCount) {
        modes.push(el)
        maxCount = modeMap[el]
      }
    }
    return {
      modes,
      maxCount
    }
  }
  async validateInfo (betObj, validatingFunc, consensusField, sendEvent, receiveEpoch, receiveEvent, resultingEvent, resolveValue) {
    // Do your own validate then
    const newProm = new Promise(async (resolve, reject) => {
      // simple consensus rather than using Lamport for now.
      this.betObjConsensus[betObj.destinationTag] = {
        received: 0
      }
      this.betObjConsensus[betObj.destinationTag][consensusField] = {}
      // First stage
      this.broker.broadcast(`${receiveEpoch}`, sendEvent, JSON.stringify(betObj))
      // Second stage listener
      this.broker.receive(`${receiveEpoch}`, `${receiveEvent}`, (i, validateResult) => {
        validateResult = JSON.parse(validateResult).validated
        if (!this.betObjConsensus[betObj.destinationTag][consensusField].hasOwnProperty(i)) {
          this.betObjConsensus[betObj.destinationTag][consensusField][i] = validateResult
          this.betObjConsensus[betObj.destinationTag]['received'] += 1
        }
        if (this.betObjConsensus[betObj.destinationTag]['received'] >= Math.floor(this.peerLength / 2) + 1) {
          // received all information. Do my own consensus.
          // If everyone agrees that's fine, otherwise no
          let correctInfo = 0
          for (let key in this.betObjConsensus[betObj.destinationTag][consensusField]) {
            if (this.betObjConsensus[betObj.destinationTag][consensusField][key]) {
              correctInfo += 1
            }
          }
          if (correctInfo >= Math.floor(this.peerLength / 2) + 1 && resultingEvent) {
            // Tell other peers to add this pending bet onto their DB.
            console.log('resolved', betObj.destinationTag, resultingEvent, betObj)
            this.sendInfoToPeers(betObj.destinationTag, resultingEvent, betObj)
            resolve(resolveValue)
          }
          reject(new Error('failed to validate in consensus'))
        }
      })
    })

    let timeout
    return Promise.race([
      newProm,
      new Promise((resolve, reject) => {
        timeout = setTimeout(function () {
          clearTimeout(timeout)
          return reject(Error(`Consensus failed for bet ${betObj.destinationTag}`))
        }, 10000)
      })
    ])
  }

  sendInfoToPeers (epoch, event, message) {
    this.broker.broadcast(epoch.toString(), event, JSON.stringify(message))
  }

  async backgroundConsensus (betId) {
    const firstProm = new Promise(async (resolve, reject) => {
      this.betObjConsensus[betId] = {
        received: 0
      }
      this.betObjConsensus[betId]['backgroundConsensus'] = {}
      this.broker.broadcast(betId, 'firstBackgroundConsensus', betId)
      this.broker.receive(`${betId}`, `secondBackgroundConsensus`, (i, validateResult) => {
        const { result } = JSON.parse(validateResult)

        if (!this.betObjConsensus[betId]['backgroundConsensus'].hasOwnProperty(i)) {
          this.betObjConsensus[betId]['backgroundConsensus'][i] = result
          this.betObjConsensus[betId]['received'] += 1
        }
        if (this.betObjConsensus[betId]['received'] >= Math.floor(this.peerLength / 2) + 1) {
          const resultArr = []
          for (let key in this.betObjConsensus[betId]['backgroundConsensus']) {
            resultArr.push(this.betObjConsensus[betId]['backgroundConsensus'][key])
          }
          const finalRes = this.modeArray(resultArr)
          if (finalRes.modes.length === 1 && finalRes.maxCount >= Math.floor(this.peerLength / 2) + 1) {
            console.log('resolved', finalRes.modes[0])
            resolve(finalRes.modes[0])
          }
          reject(new Error('Consensus on bet failed'))
        }
      })
    })
    let timeout
    return Promise.race([
      firstProm,
      new Promise((resolve, reject) => {
        timeout = setTimeout(function () {
          clearTimeout(timeout)
          return resolve(`Consensus failed for bet ${betId}`)
        }, 10000)
      })
    ])
  }
}
module.exports = BasicConsensus
