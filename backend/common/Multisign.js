const db = require('../common/BettyDB.js')
const debug = require('debug')('betty:multisign')
const { randomBytes } = require('crypto')

class Multisign {
  // TODO (vtj2105): use dependency injector?
  constructor (broker, ripple) {
    this.broker = broker
    this.ripple = ripple
    this.pending = {}
    this.fulfilled = {}
    this.hostId = process.env.CODIUS_HOST // replace with actual codule host id
    this.threshold = 1
  }

  checkSignatures (txObj) {
    const signers = txObj.txJSON.Signers
    if (!signers) { return false }
    if (signers.length >= this.threshold) {
      return true
    }
    return false
  }

  submitMultisigned (txObj) {
    const txJSON = txObj.txJSON
    return this.ripple.request('submit_multisigned', txJSON).then((response) => {
      debug(`Multisign transaction has been submitted... ${response}`)
    }).catch((error) => {
      debug('Multisign transaction failed...')
      throw error
    })
  }

  async sign (hostId, txObj) {
    const keypair = await db.get('keypair')
    const txJSON = txObj.txJSON
    const request = { account: keypair.address, secret: keypair.secret, tx_json: txJSON }
    debug('request!!!', JSON.stringify(request.tx_json))
    // debug(`signing transaction ${JSON.stringify(txJSON, null, 2)}`)
    return this.ripple.request('sign_for', request).then(response => {
      const signedTx = response.tx_json
      debug('signed tx', JSON.stringify(signedTx, null, 2))
      txObj.txJSON = signedTx // update txObj with new signatures
      return signedTx
    }).catch((error) => {
      debug('Unable to sign transaction using multisign')
      throw error
    })
  }

  async getThreshold () {
    // TODO (vtj2105): find threshold based on signer weights
    const hostList = await db.get('hostList')
    const threshold = hostList.length + 1
    debug(`Multisign threshold: ${threshold}`)
    return threshold
  }

  async processTransaction (i, txObj) {
    const id = randomBytes(16).toString('hex')
    debug(`Received new transaction ${id} from host ${i}`)
    debug(`Signing transaction transaction ${id}`)
    const signedTx = await this.sign(i, txObj)
    this.pending[id] = signedTx // add transaction to map of pending tx
    const signedTxObj = { id: id, txJSON: signedTx }
    this.broker.broadcast(i, 'signature', JSON.stringify(signedTxObj))
  }

  async processSignature (i, txObj) {
    const { id, txJSON } = txObj
    debug(`Received additional signature for tx ${id} from host ${i}`, txJSON)
    const newSignatures = this.filterSignatures(txObj)
    this.addSignatures(id, newSignatures)
    const pendingTx = this.pending[id]
    if (this.checkSignatures(pendingTx)) {
      debug(`Submitting multisigned transaction ${id}`)
      // this.pending[id] = txObj
      await this.submitMultisigned(pendingTx.txJSON)
    }
  }

  // Get new signature that has been added
  async filterSignatures (txObj) {
    const { address } = await db.get('keypair')
    const signers = txObj.txJSON.Signers
    const newSigners = signers.filter(signer => signer.Account !== address)
    return newSigners
  }

  addSignatures (id, signatures) {
    const signers = this.pending[id].txJSON.Signers
    signatures.forEach((signature) => { signers.push(signature) })
  }

  async init () {
    this.broker.receive(this.hostId, 'signature', async (i, tx) => {
      const txObj = JSON.parse(tx)
      await this.processSignature(i, txObj)
    })
    this.broker.receive('all', 'transaction', async (i, tx) => {
      const txObj = JSON.parse(tx)
      await this.processTransaction(i, txObj)
    })
  }

  async getAllSignatures (txObj) {
    await this.sign(this.hostId, txObj)
    const tx = JSON.stringify(txObj)
    this.broker.broadcast('all', 'transaction', tx)
  }

  getHostId () {
    debug(`fetching host id from peers...`)
    this.broker.receive('hostId', 'id', (i, m) => { this.hostId = i })
    this.broker.broadcast('hostId', 'id', 'Getting my hostId!')
    debug(`Host id: ${this.hostId}`)
  }
}

module.exports = Multisign
