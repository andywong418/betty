const db = require('../common/BettyDB.js')
const debug = require('debug')('betty:multisign')
const { randomBytes } = require('crypto')
const hash = require('object-hash')
class Multisign {
  // TODO (vtj2105): use dependency injector?
  constructor (broker, ripple) {
    this.broker = broker
    this.ripple = ripple
    this.pending = {} // pending multisig transactions
    this.fulfilled = {} // completed multisig transactions
    this.hostId = this.broker.thisHostIndex
    this.threshold = JSON.parse(process.env.CONTRACT_INSTANCES).length
    // this.init()
  }

  async checkSignatures (pendingTxSigs) {
    if (pendingTxSigs.length === this.threshold) {
      return true
    }
    return false
  }

  submitMultisigned (txObj) {
    const request = {id: 'betty_multisig_tx', tx_json: txObj}
    console.log('MULTISIGN TX |||', txObj.Signers)
    return this.ripple.request('submit_multisigned', request).then((response) => {
      debug(`Multisign transaction has been submitted... ${response}`)
    }).catch((error) => {
      debug('Multisign transaction failed...')
      throw error
    })
  }

  async sign (txJSON) {
    const keypair = await db.get('keypair')
    const request = { secret: keypair.secret, tx_json: JSON.parse(txJSON.txJSON) }

    debug(`signing transaction ${JSON.stringify(txJSON, null, 2)}`)
    await this.ripple.connect()
    return this.ripple.sign(request).then(response => {
      const signedTx = response.signedTransaction
      debug('signed tx', signedTx)
      // txObj.txJSON = signedTx // update txObj with new signatures
      return signedTx
    }).catch((error) => {
      debug('Unable to sign transaction using multisign')
      throw error
    })
  }

  async processTransaction (i, txJSON, betId) {
    const id = betId // randomBytes(16).toString('hex')
    debug(`Received new transaction ${id} from host ${i}`)
    debug(`Signing transaction transaction ${id}`)
    const signedTx = await this.sign(txJSON)
    if (!this.pending[id]) {
      this.pending[id] = []
    }
    // check if signatures are the same
    this.pending[id] = [ ...this.pending[id], signedTx ] // add transaction to map of pending tx
    const signedTxObj = { id: id, signedTx: signedTx }
    this.broker.sendTo(`${betId}`, 'signature', i, JSON.stringify(signedTxObj))
  }

  async processSignature (i, signedTxObj) {
    const { id, signedTx } = signedTxObj
    debug(`Received signature for tx ${id} from host ${i}`, signedTx)
    const pendingTxSigs = this.pending[id]
    const readyToSend = await this.checkSignatures(pendingTxSigs)
    if (readyToSend) {
      console.log('ITS READY TO SEND')
      debug(`Submitting multisigned transaction ${id}`)
      const response = await this.ripple.request('combine', pendingTxSigs)
      const txToSubmit = response.signedTransaction
      console.log('PENDING MULTISIG TX', pendingTxSigs)
      console.log('TX TO SUBMIT', txToSubmit)
      await this.ripple.request('submit', txToSubmit)
      this.fulfilled[id] = pendingTxSigs
      delete this.pending[id]
      return true
    }
  }

  async preparePayment (payment, instructions = {}) {
    instructions.signersCount = this.threshold
    const sender = payment.source.address
    console.log('sender', sender, payment)
    const prepared = await this.ripple.preparePayment(sender, payment, instructions)
    debug(`Payment transaction prepared ${prepared}`)
    return prepared
  }

  configureMultisignTx (txJSON) {
    txJSON.TransactionType = 'TrustSet'
    txJSON.LimitAmount = {
      "currency": "USD", "issuer": txJSON.Destination, "value": "100"
    }
    txJSON.Fee = 100
    delete txJSON.Amount
    delete txJSON.Memos
    delete txJSON.LastLedgerSequence
    delete txJSON.DestinationTag
    delete txJSON.Destination
  }
  // Get new signature that has been added
  async filterSignatures (txObj) {
    const { address } = await db.get('keypair')
    const signers = txObj.txJSON.Signers
    const newSigners = signers.filter(signer => signer.Account !== address)
    console.log('FILTERED SIG', newSigners)
    return newSigners
  }

  addSignatures (id, signatures) {
    console.log('IDDDDD', id)
    console.log('PENDING', this.pending)
    console.log('PENDING ID', this.pending[id])
    console.log('THRESHOLD', this.threshold)
    const signers = this.pending[id].Signers
    Object.values(signatures).forEach((signature) => { signers.push(signature) })
  }

  async init () {
    this.broker.receive('multisign', 'signature', async (i, tx) => {
      const txObj = JSON.parse(tx)
      await this.processSignature(i, txObj)
    })
    this.broker.receive('multisign', 'transaction', async (i, tx) => {
      const txObj = JSON.parse(tx)
      await this.processTransaction(i, txObj)
    })
  }

  async getAllSignatures (txObj, betId) {
    await this.sign(this.hostId, txObj)
    const tx = JSON.stringify(txObj)
    this.broker.broadcast('multisign', 'transaction', tx)
  }
}

module.exports = Multisign
