const path = require('path')
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const PORT = process.env.PORT || 3002
const api = require('./backend/routes')
const RippleAPI = require('ripple-lib').RippleAPI
const WebSocket = require('ws')
const broker = require('./codule/n-squared')()
const BettyDB = require('./backend/common/BettyDB')
const wss = new WebSocket.Server({ port: Number(process.env.WEB_SOCKET) || 8002 })
// Put logic for host key gen in here.

const rippleAPI = new RippleAPI({server: 'wss://s.altnet.rippletest.net:51233'})
// Change to wss://s1.ripple.com:443 for production

wss.on('connection', ws => {
  ws.on('message', message => {
    try {
      message = JSON.parse(message)
    } catch (err) {
    }
    if (message.keyGenInitiate) {
      rippleAPI.connect().then(() => {
        const { address, secret } = rippleAPI.generateAddress()
        BettyDB.set('keypair', {
          address,
          secret
        })
        ws.send(JSON.stringify({
          address,
          walletAddress: true
        }))
      })
    }
    if (message.sendVerifiedSharedWallet) {
      const {address, hostList} = message
      BettyDB.set('sharedWalletAddress', { address })
      BettyDB.set('hostList', {
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
    }
    if (message.shareAddressWithPeer) {
      const {address, hostList} = message
      BettyDB.set('sharedWalletAddress', { address })
      BettyDB.set('hostList', {
        hostList
      })
    }
  })
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
    response.send('NO XRP ACCOUNT CREATED')
  }
})
app.use('/api', api)
app.get('*', (request, response) => {
  response.sendFile(__dirname + '/public/index.html')
})
app.use(express.static(path.join(__dirname, 'public')))
app.listen(PORT, error => {
  error
    ? console.error(error)
    : console.info(`==> 🌎 Listening on port ${PORT}. Visit http://localhost:${PORT}/ in your browser.`)
})
