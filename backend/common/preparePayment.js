const debug = require('debug')('betty:preparePayment')

function preparePayment (payment, ripple, instructions = {}) {
  const sender = payment.source.address
  console.log('sender', sender, payment)
  return ripple.preparePayment(sender, payment, instructions).then(prepared => {
    debug(`Payment transaction prepared ${prepared}`)
    return prepared
  }).catch((error) => {
    console.log('failed prep')
    debug(`Payment preparation step failed`)
    throw error
  })
}

module.exports = {
  preparePayment
}
