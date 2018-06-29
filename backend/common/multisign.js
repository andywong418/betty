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

async function signAll (txJSON, ripple) {
  await multisign(txJSON, ripple).then(signedTx => {
    broker.broadcast('epochMS', 'multisign', signedTx)
  })
}

module.exports = {
  multisign,
  signAll
}
