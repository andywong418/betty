const db = require('../common/BettyDB.js')
const debug = require('debug')('betty:multisign')
const broker = require('./broker.js')

async function multisign (txJSON, ripple) {
  const keypair = await db.get('keypair')
  const request = { account: keypair.address, secret: keypair.secret, tx_json: txJSON }

  debug(`signing transaction ${txJSON}`)
  return ripple.request('sign_for', request).then(async response => {
    const signedTx = response.tx_json
    debug('signed tx', JSON.stringify(signedTx, null, 2))
    return signedTx
  }).catch((error) => {
    debug('Unable to sign transaction using multisign')
    throw error
  })
}

async function sign (txJSON) {
  const keypair = await db.get('keypair')
  const request = { account: keypair.address, secret: keypair.secret, tx_json: txJSON }
  debug(`signing transaction ${JSON.stringify(txJSON, null, 2)}`)
  return this.ripple.request('sign_for', request).then(response => {
    const signedTx = response.tx_json
    debug('signed tx', JSON.stringify(signedTx, null, 2))
    return signedTx
  }).catch((error) => {
    debug('Unable to sign transaction using multisign')
    throw error
  })
}

function checkSignatures (txJSON) {
  const signers = txJSON.Signers
  if (!signers) { return false }
  if (signers.length >= this.threshold) {
    return true
  }
  return false
}

async function filterSignatures (txJSON) {
  const { address } = await db.get('keypair')
  const signers = txJSON.Signers
  const newSigners = signers.filter(signer => signer.Account !== address)
  return newSigners
}

module.exports = {
  multisign,
  checkSignatures,
  filterSignatures
}
