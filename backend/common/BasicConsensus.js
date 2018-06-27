
const {validatePendingBet, validateBet, validateMatch, validateOpposingPendingBet} = require('./Validate')
const BettyDB = require('./BettyDB')
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

    this.broker.receive('firstValidateBetInfo', async (i, betId) => {
      betId = JSON.parse(betId)
      const validated = await validateBet(betId)
      this.broker.broadcast(`secondValidateBetInfo-${betId.betId}`, JSON.stringify({validated}))
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
  }

  async validateInfo (betObj, validatingFunc, consensusField, sendEvent, receiveEvent, resultingEvent, resolveValue) {
    // Do your own validate then
    return new Promise(async (resolve, reject) => {
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
        if (this.betObjConsensus[betObj.destinationTag]['received'] === this.peerLength - 1) {
          // received all information. Do my own consensus.
          // If everyone agrees that's fine, otherwise no
          let correctInfo = ownResult ? 1 : 0
          for (let key in this.betObjConsensus[betObj.destinationTag][consensusField]) {
            if (this.betObjConsensus[betObj.destinationTag][consensusField][key]) {
              correctInfo += 1
            }
          }
          if (correctInfo === this.peerLength && resultingEvent) {
            // Tell other peers to add this pending bet onto their DB.
            this.sendInfoToPeers(resultingEvent, betObj)
            resolve(resolveValue)
          }
          reject('failed to validate in consensus')
        }
      })
    })
  }

  async sendInfoToPeers (event, message) {
    this.broker.broadcast(event, JSON.stringify(message))
  }
}

module.exports = BasicConsensus
