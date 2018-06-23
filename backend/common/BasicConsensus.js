
const {validateBet} = require('./Validate')
// Implement Lamport, Pease and Shostak Algo
class BasicConsensus {
    constructor (broker) {
        this.broker = broker
        this.peerLength = JSON.parse(process.env.CONTRACT_INSTANCES).length
        this.betObjConsensus = {}
        this.broker.receive('firstValidateBetInfo', async (i, betObj) => {
            betObj = JSON.parse(betObj)
            console.log('Recieved?', i, betObj)
            const validated = await validateBet(betObj)
            this.broker.broadcast(`secondValidateBetInfo-${betObj.destinationTag}`, JSON.stringify({validated}))
        })
    }

    async validateBetInfo (betObj) {
        console.log('getting in here?')
        // Do your own validate then
        return new Promise (async (resolve, reject) => {
            const ownResult = await validateBet(betObj)
            //simple consensus rather than using Lamport for now.
            this.betObjConsensus[betObj.destinationTag] = {
                validateObj: {},
                received: 0
            }
            // First stage
            this.broker.broadcast('firstValidateBetInfo', JSON.stringify(betObj))
            // Second stage listener
            this.broker.receive(`secondValidateBetInfo-${betObj.destinationTag}`, (i, validateResult) => {
                console.log('second stage?')
                validateResult = JSON.parse(validateResult).validated
                if (!this.betObjConsensus[betObj.destinationTag]['validateObj'].hasOwnProperty(i)) {
                    this.betObjConsensus[betObj.destinationTag]['validateObj'][i] = validateResult
                    this.betObjConsensus[betObj.destinationTag]['received'] += 1
                }
                if (this.betObjConsensus[betObj.destinationTag]['received'] === this.peerLength - 1 ) {
                    // received all information. Do my own consensus.
                    // If everyone agrees that's fine, otherwise no
                    const correctInfo = ownResult ? 1 : 0
                    this.betObjConsensus[betObj.destinationTag]['validateObj'].forEach(value, key => {
                        if (value) {
                            correctInfo += 1
                        }
                    })
                    if (correctInfo === this.peerLength) {
                        resolve()
                    }
                    reject()
                }
            })

        })
    }

}

module.exports =  BasicConsensus