
const {validateBet, validateMatch, isEmpty} = require('./Validate')
const BettyDB = require('./BettyDB')
const axios = require('axios')
const oracle = process.env.ORACLE
// const multisign = require('./multisign')
const Multisign = require('./MultisignClass.js')

// Implement Lamport, Pease and Shostak Algo
class BasicConsensus {
  constructor (broker, ripple) {
    this.broker = broker
    this.db = BettyDB
    this.peerLength = JSON.parse(process.env.CONTRACT_INSTANCES).length
    this.betObjConsensus = {}
    // load all bets and create a listener for each
    this.loadListeners()
    this.signObj = {}
    this.signer = new Multisign(broker, ripple)
  }

  addPendingBetListeners (betId) {
    // Add this to all the different hosts.
    this.broker.receive(betId, 'addPendingBet', async (i, betStr) => {
      const betObj = JSON.parse(betStr)
      try {
        this.db.addPendingBet(betObj['destinationTag'], betObj)
      } catch (err) {
        console.log('error adding pending bet', err)
      }
    })
    this.broker.receive(betId, 'removePendingBet', (i, betId) => {
      betId = JSON.parse(betId)
      betId = betId.betId
      this.db.removePendingBet(betId)
    })
  }
  async collectMultisign (txJson, ripple, betId) {
    const signProm = new Promise((resolve, reject) => {
      // this.multisignObj[betId] = {
      //   received: 0,
      //   txObj: txJson
      // }
      // Request other hosts to sign the transaction
      console.log('TX JSON', txJson)
      this.signObj[betId] = {
        received: 0,
        signatures: {

        }
      }

      this.broker.broadcast(`${betId}`, 'multisign', JSON.stringify(txJson))
      this.broker.receive(`${betId}`, 'signature', async (i, signedTxStr) => {

        if (!this.signObj[betId]['signatures'].hasOwnProperty(i)) {
          this.signObj[betId]['signatures'][i] = signedTxStr
          this.signObj[betId]['received'] += 1
        }

        if (this.signObj[betId]['received'] === this.peerLength) {
          const sent = await this.signer.processSignature(betId, Object.values(this.signObj[betId]['signatures']))
          console.log('sent', sent)
          if (sent) {
            resolve(sent)
          }
        }
        //   this.multiSignObj[betId]['received'] += 1
        //   const newSignatures = this.signer.checkSignatures(txJson)
        //   const
        //   this.multiSignObj[betId]['signature'][i] = signature
        // }
        // if (this.multiSignObj[betId]['received'] === this.peerLength) {
        //   // Sign/ submit
        //   // Signature1, signature2, signature 3, signtarue 4
        //   resolve('Final Sig')
        // }
      })
    })
    let timeout
    return Promise.race([
      signProm,
      new Promise((resolve, reject) => {
        timeout = setTimeout(function () {
          clearTimeout(timeout)
          return resolve(null)
        }, 10000)
      })
    ])
  }
  addBetListeners (betId) {
    this.broker.receive(betId, 'firstValidateBetInfo', async (i, betObj) => {
      betObj = JSON.parse(betObj)
      const validated = await validateBet(betObj)
      this.broker.sendTo(`${betObj.destinationTag}`, `secondValidateBetInfo`, i, JSON.stringify({validated}))
    })
    this.broker.receive(betId, 'addBet', async (i, betObj) => {
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
    this.broker.receive(`${betId}`, 'multisign', async (i, txStr) => {
      console.log('TRANSACTION STRING', txStr)
      const txJSON = JSON.parse(txStr)
      await this.signer.processTransaction(i, txJSON, betId)
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
          this.broker.sendTo(betId, `secondBackgroundConsensus`, i, JSON.stringify({
            result: 'ignore'
          }))
        } else if (match.data.winner) {
          // Find opposing bet and pay out, otherwise refund.
          if (bet.opposingBet) {
            // Check winner to pay out winner. Add up amounts and transfer.
            const opposingBet = await this.db.getBet(bet.opposingBet)
            console.log('opposingBet', opposingBet)
            if (opposingBet.status !== 'resolved' || opposingBet.status !== 'refunded') {
              this.broker.sendTo(betId, `secondBackgroundConsensus`, i, JSON.stringify({
                result: 'resolve'
              }))
            } else {
              this.broker.sendTo(betId, `secondBackgroundConsensus`, i, JSON.stringify({
                result: 'ignore'
              }))
            }
            // Change status to resolved
          } else {
            // Change status to refunded.
            this.broker.sendTo(betId, `secondBackgroundConsensus`, i, JSON.stringify({
              result: 'refund'
            }))
          }
        }
      } else {
        console.log('this is just to prevent memory leak')
        this.broker.sendTo(betId, `secondBackgroundConsensus`, i, JSON.stringify({
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
      if (!isEmpty(match)) {
        validated = true
      }
      this.broker.sendTo(`${matchId.matchId}`, `secondValidateMatchInfo`, i, JSON.stringify({validated}))
    })
    this.broker.receive(`${matchId}`, 'addMatch', (i, matchObj) => {
      matchObj = JSON.parse(matchObj)
      console.log('matchObj for adding', matchObj, typeof matchObj, matchObj.id)
      this.db.addMatch(matchObj.id, matchObj)
    })
  }

  async loadListeners () {
    const bets = await this.db.getAllBets()
    const matches = await this.db.getAllMatches()
    console.log('loading Listeners')
    console.log('bets', bets)
    for (let key in bets) {
      const bet = bets[key]
      this.addBetListeners(bet.destinationTag)
    }

    for (let key in matches) {
      const match = matches[key]
      this.addMatchListeners(match.id)
    }
  }
  addListener (epoch, tag, handler) {
    this.broker.receive(epoch, tag, handler)
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
  async validateInfo (betObj, consensusField, sendEvent, receiveEpoch, receiveEvent, resultingEvent, resolveValue) {
    // Do your own validate then
    const newProm = new Promise(async (resolve, reject) => {
      // simple consensus rather than using Lamport for now.
      this.betObjConsensus[betObj.destinationTag] = {
        received: 0
      }
      this.betObjConsensus[betObj.destinationTag][consensusField] = {}
      // First stage
      this.broker.broadcast(receiveEpoch, sendEvent, JSON.stringify(betObj))
      // Second stage listener
      this.broker.receive(receiveEpoch, receiveEvent, (i, validateResult) => {
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
          console.log('correctInfo', correctInfo)
          if (correctInfo === Math.floor(this.peerLength / 2) + 1 && resultingEvent) {
            // Tell other peers to add this pending bet onto their DB.
            console.log('resolved', betObj.destinationTag, resultingEvent, betObj)
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

  async backgroundConsensus (betId) {
    const firstProm = new Promise(async (resolve, reject) => {
      this.betObjConsensus[betId] = {
        received: 0
      }
      this.betObjConsensus[betId]['backgroundConsensus'] = {}
      this.broker.broadcast(betId, 'firstBackgroundConsensus', betId)

      this.broker.receive(betId, `secondBackgroundConsensus`, (i, validateResult) => {
        console.log('\x1b[31m%s\x1b[0m', 'Message received')
        const { result } = JSON.parse(validateResult)
        if (!this.betObjConsensus[betId]['backgroundConsensus'].hasOwnProperty(i)) {
          this.betObjConsensus[betId]['backgroundConsensus'][i] = result
          this.betObjConsensus[betId]['received'] += 1
        }
        console.log('checking object', this.betObjConsensus[betId])
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

  sendInfoToPeers (epoch, event, message) {
    this.broker.broadcast(epoch.toString(), event, message)
  }

  sendInfoToPeer (epoch, event, i, message) {
    this.broker.sendTo(epoch.toString(), event, i, message)
  }
}
module.exports = BasicConsensus
