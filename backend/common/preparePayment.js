const debug = require('debug')('betty:preparePayment')

function preparePayment (payment, ripple, instructions = {}) {
  const sender = payment.source.address
  return ripple.preparePayment(sender, payment, instructions).then(prepared => {
    debug(`Payment transaction prepared ${prepared}`)
    return prepared
  }).catch((error) => {
    debug(`Payment preparation step failed`)
    throw error
  })
}

module.exports = {
  preparePayment
}
