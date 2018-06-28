
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
    this.broker.receive('firstValidatePendingBetInfo', async (i, betObj) => {
      betObj = JSON.parse(betObj)

      const validated = await validatePendingBet(betObj)
      this.broker.broadcast(`secondValidatePendingBetInfo-${betObj.destinationTag}`, JSON.stringify({validated}))
    })
    this.broker.receive('addPendingBet', async (i, betStr) => {
      const betObj = JSON.parse(betStr)
      try {
        this.db.addPendingBet(betObj['destinationTag'], betObj)
      } catch (err) {
        console.log('error adding pending bet', err)
      }
    })

    this.broker.receive('firstValidateBetInfo', async (i, betObj) => {
      betObj = JSON.parse(betObj)
      const validated = await validateBet(betObj)
      this.broker.broadcast(`secondValidateBetInfo-${betObj.destinationTag}`, JSON.stringify({validated}))
    })

    this.broker.receive('firstValidateMatchInfo', async (i, matchId) => {
      matchId = JSON.parse(matchId)
      const validated = await validateMatch(matchId)
      this.broker.broadcast(`secondValidateMatchInfo-${matchId.matchId}`, JSON.stringify({validated}))
    })

    this.broker.receive('addMatch', (i, matchObj) => {
      matchObj = JSON.parse(matchObj)
      console.log('matchObj for adding', matchObj, typeof matchObj, matchObj.id)
      this.db.addMatch(matchObj.id, matchObj)
    })

    this.broker.receive('removePendingBet', (i, betId) => {
      betId = JSON.parse(betId)
      betId = betId.betId
      this.db.removePendingBet(betId)
    })

    this.broker.receive('addBet', async (i, betObj) => {
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

    this.broker.receive('firstValidateOpposingPendingBetInfo', async (i, betObj) => {
      betObj = JSON.parse(betObj)
      console.log('betObj opposing', betObj)
      const validated = await validateOpposingPendingBet(betObj)
      this.broker.broadcast(`secondValidateOpposingPendingBetInfo-${betObj.destinationTag}`, JSON.stringify({validated}))
    })

    this.broker.receive('firstBackgroundConsensus', async (i, betId) => {
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
          this.broker.broadcast(`secondBackgroundConsensus-${betId}`, JSON.stringify({
            result: 'ignore'
          }))
        }
        if (match.data.winner) {
          // Find opposing bet and pay out, otherwise refund.
          if (bet.opposingBet) {
            // Check winner to pay out winner. Add up amounts and transfer.
            const opposingBet = await this.db.getBet(bet.opposingBet)
            if (opposingBet.status !== 'resolved' || opposingBet.status !== 'refunded') {
              this.broker.broadcast(`secondBackgroundConsensus-${betId}`, JSON.stringify({
                result: 'resolve'
              }))
            } else {
              this.broker.broadcast(`secondBackgroundConsensus-${betId}`, JSON.stringify({
                result: 'ignore'
              }))
            }
            // Change status to resolved
          } else {
            // Change status to refunded.
            this.broker.broadcast(`secondBackgroundConsensus-${betId}`, JSON.stringify({
              result: 'refund'
            }))
          }
        }
      } else {
        this.broker.broadcast(`secondBackgroundConsensus-${betId}`, JSON.stringify({
          result: 'ignore'
        }))
      }
    })
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
  async validateInfo (betObj, validatingFunc, consensusField, sendEvent, receiveEvent, resultingEvent, resolveValue) {
    // Do your own validate then
    const newProm = new Promise(async (resolve, reject) => {
      const ownResult = await validatingFunc(betObj)
      // simple consensus rather than using Lamport for now.
      this.betObjConsensus[betObj.destinationTag] = {
        received: 0
      }
      this.betObjConsensus[betObj.destinationTag][consensusField] = {}
      // First stage
      this.broker.broadcast(sendEvent, JSON.stringify(betObj))
      // Second stage listener
      this.broker.receive(`${receiveEvent}`, (i, validateResult) => {
        validateResult = JSON.parse(validateResult).validated
        if (!this.betObjConsensus[betObj.destinationTag][consensusField].hasOwnProperty(i)) {
          this.betObjConsensus[betObj.destinationTag][consensusField][i] = validateResult
          this.betObjConsensus[betObj.destinationTag]['received'] += 1
        }
        if (this.betObjConsensus[betObj.destinationTag]['received'] >= Math.floor(this.peerLength / 2) + 1) {
          // received all information. Do my own consensus.
          // If everyone agrees that's fine, otherwise no
          let correctInfo = ownResult ? 1 : 0
          for (let key in this.betObjConsensus[betObj.destinationTag][consensusField]) {
            if (this.betObjConsensus[betObj.destinationTag][consensusField][key]) {
              correctInfo += 1
            }
          }
          if (correctInfo >= Math.floor(this.peerLength / 2) + 1 && resultingEvent) {
            // Tell other peers to add this pending bet onto their DB.
            this.sendInfoToPeers(resultingEvent, betObj)
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
          return resolve(`Consensus failed for bet ${betObj.destinationTag}`)
        }, 10000)
      })
    ])
  }

  async sendInfoToPeers (event, message) {
    this.broker.broadcast(event, JSON.stringify(message))
  }

  async backgroundConsensus (betId) {
    const firstProm = new Promise(async (resolve, reject) => {
      this.betObjConsensus[betId] = {
        received: 0
      }
      this.betObjConsensus[betId]['backgroundConsensus'] = {}
      this.broker.broadcast('firstBackgroundConsensus', betId)
      this.broker.receive(`secondBackgroundConsensus-${betId}`, (i, validateResult) => {
        const { result } = JSON.parse(validateResult)
        console.log('I check', betId, this.betObjConsensus[betId]['backgroundConsensus'], i, validateResult)
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
