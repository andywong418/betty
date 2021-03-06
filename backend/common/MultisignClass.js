const db = require('../common/BettyDB.js')
const debug = require('debug')('betty:multisign')
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
    return this.ripple.sign(txJSON.txJSON, request.secret, {
      signAs: keypair.address
    }).signedTransaction
  }

  async processTransaction (i, txJSON, betId, purpose) {
    const id = betId // randomBytes(16).toString('hex')
    debug(`Received new transaction ${id} from host ${i}`)
    debug(`Signing transaction transaction ${id}`)
    const signedTx = await this.sign(txJSON)
    if (!this.pending[id]) {
      this.pending[id] = []
    }
    // check if signatures are the same
    this.pending[id] = [ ...this.pending[id], signedTx ] // add transaction to map of pending tx
    if (purpose === 'refundPendingBet') {
      this.broker.sendTo(betId, 'signatureForPendingRefund', i, signedTx)
    } else {
      this.broker.sendTo(`${betId}`, 'signature', i, signedTx)
    }
  }

  async processSignature (betId, signedTxArr) {
    const response = await this.ripple.combine(signedTxArr)
    const txToSubmit = response.signedTransaction
    const bet = db.getBet(betId)
    if (bet.status !== 'refunded' && bet.status !== 'resolved') {
      await this.ripple.connect()
      await this.ripple.submit(txToSubmit)
      return true
    }
    return false
  }

  async preparePayment (payment, instructions = {}) {
    instructions.signersCount = this.threshold
    const sender = payment.source.address
    const prepared = await this.ripple.preparePayment(sender, payment, instructions)
    debug(`Payment transaction prepared ${prepared}`)
    return prepared
  }

  async getAllSignatures (txObj, betId) {
    await this.sign(this.hostId, txObj)
    const tx = JSON.stringify(txObj)
    this.broker.broadcast('multisign', 'transaction', tx)
  }
}

module.exports = Multisign
