const path = require('path')
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const PORT = process.env.SERVER_PORT || 3002
const api = require('./backend/routes').router
const consensus = require('./backend/routes').consensus
const RippleAPI = require('ripple-lib').RippleAPI
const WebSocket = require('ws')
const BettyDB = require('./backend/common/BettyDB')
const wss = new WebSocket.Server({ port: Number(process.env.WEB_SOCKET) || 8002 })
const monitorBets = require('./backend/handlers/monitorBets').monitorBets
const { backgroundPayOut } = require('./backend/handlers/backgroundPayOut')
const axios = require('axios')
const debug = require('debug')('betty:server')

// Put logic for host key gen in here.
const tx = {
  'TransactionType': 'Payment',
  'Account': 'r4iV8xADLRERfho4ZC9VLTqN6MMP6U8ezk',
  'Destination': 'rULzgNDEEF8T292ZLYWSb8n5xVKG2JPMZt',
  'Amount': '10000',
  'Flags': 2147483648,
  'SourceTag': 1000001,
  'DestinationTag': 1000001,
  'LastLedgerSequence': 10373735,
  'Fee': '12',
  'Sequence': 112
}
const rippleAPI = new RippleAPI({server: 'wss://s.altnet.rippletest.net:51233'})
// Change to wss://s1.ripple.com:443 for production
let rippleStarted = false
wss.on('connection', ws => {
  ws.on('message', async message => {
    try {
      message = JSON.parse(message)
    } catch (err) {
    }
    if (message.keyGenInitiate) {
      rippleAPI.connect().then(async () => {
        const { address, secret } = rippleAPI.generateAddress()
        await BettyDB.set('keypair', {
          address,
          secret
        })
        debug('generated new xrp address', 'address', address, 'secret', secret)
        ws.send(JSON.stringify({
          address,
          walletAddress: true
        }))
      })
    }
    if (message.sendVerifiedSharedWallet) {
      const {address, hostList} = message
      await BettyDB.set('sharedWalletAddress', { address })
      await BettyDB.set('hostList', {
        hostList
      })
      hostList.forEach(hostURL => {
        // Propagate address to every thing sent in this peerList.
        const ws = new WebSocket(hostURL)
        const newHostList = hostList.filter(host => {
          return host !== hostURL
        })
        ws.on('open', () => {
          ws.send(JSON.stringify({
            'shareAddressWithPeer': true,
            'address': address,
            'hostList': newHostList
          }))
          ws.close()
        })
      })
      rippleStarted = true
      monitorBets(consensus)
      // backgroundPayOut(consensus)
    }
    if (message.shareAddressWithPeer) {
      const {address, hostList} = message
      await BettyDB.set('sharedWalletAddress', { address })
      await BettyDB.set('hostList', {
        hostList
      })
    }
  })
})
async function startMonitoring () {
  if (!rippleStarted) {
    const multiSignAddr = await BettyDB.get('sharedWalletAddress')
    if (multiSignAddr) {
      monitorBets(consensus)
      backgroundPayOut(consensus)
    }
  }
}

async function sendBackUps () {
  console.log('we in to send backups', process.env.BACKUP_URL)
  const bets = await BettyDB.getAllBets()
  axios.post(process.env.BACKUP_URL, {
    bets,
    token: process.env.BACKUP_TOKEN
  })
  setTimeout(sendBackUps, 1000 * 60 * 60)
}

setTimeout(sendBackUps, 1000 * 60 * 60)
startMonitoring()

rippleAPI.connect().then(async () => {
  const { address, secret } = rippleAPI.generateAddress()
  BettyDB.set('keypair', {
    address,
    secret
  })
  // debug('generated new xrp address', 'address', address, 'secret', secret)
  // // await signer.sign(1, tx).then((signedTx) => {
  // //   const isReady = signer.processTransaction({id: 1, txJSON: signedTx})
  // //   debug('IS READY', isReady)
  // // // })
  // // await signer.processTransaction(1, tx)
  // // await signer.processSignature(1, {id: 1, txJSON: tx})
  // await signer.init()
  // console.log('this transaction ....', {id: '1', txJSON: tx})
  // const txObj = {id: '1', txJSON: tx}
  // await signer.getAllSignatures(txObj)
  //  await signer.processTransaction(1, tx)

  // await signer.sign(process.env.CODIUS_HOST, tx)
})

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use('*', async (request, response, next) => {
  const multiSignContract = await BettyDB.get('sharedWalletAddress')
  if (multiSignContract) {
    request.walletAddress = multiSignContract
    next()
  } else {
    response.send(null)
  }
})
app.use('/api', api)
app.get('*', (request, response) => {
  response.sendFile(path.join(__dirname, '/public/index.html'))
})
app.use(express.static(path.join(__dirname, 'public')))
app.listen(PORT, error => {
  error
    ? console.error(error)
    : console.info(`==> 🌎 Listening on port ${PORT}. Visit http://localhost:${PORT}/ in your browser.`)
})
