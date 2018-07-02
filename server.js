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
      backgroundPayOut(consensus)
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
    // await BettyDB.set('pendingBets', {})
    // const bet = { address: 'rDiFp1uRY2uYR8jJyWQzPs17oaZJ5wCirz', bettingTeam: 'France', matchId: 49,
    //   email: 'androswong418@gmail.com', name: 'Vernon', destinationTag: 688897978, amount: '10000', txHash: 'asdfasdfa', createdAt: 'asdfadsfa',
    //   opposingBet: 898312839 }
    // const opposingBet = { address: 'rDiFp1uRY2uYR8jJyWQzPs17oaZJ5wCirz', bettingTeam: 'Argentina', matchId: 49,
    //   email: 'androswong418@gmail.com', name: 'Jon', destinationTag: 898312839, amount: '10000', txHash: 'asdfasdfa', createdAt: 'asdfadsfa',
    //   opposingBet: 688897978 }
    // const refundBet = { address: 'rDiFp1uRY2uYR8jJyWQzPs17oaZJ5wCirz', bettingTeam: 'France', matchId: 49,
    //   email: 'androswong418@gmail.com', name: 'Dros', destinationTag: 688897980, amount: '10000', txHash: 'asdfasdfa', createdAt: 'asdfadsfa'
    // }
    // await BettyDB.addBet(688897978, bet)
    // await BettyDB.addBet(898312839, opposingBet)
    // await BettyDB.addBet(688897980, refundBet)

    // const bets = await BettyDB.getAllBets()
    // console.log('bets', bets)
    if (multiSignAddr) {
      monitorBets(consensus)
      backgroundPayOut(consensus)
    }
  }
}

async function sendBackUps () {
  const bets = await BettyDB.getAllBets()
  axios.post(process.env.BACKUP_URL, {
    bets,
    token: process.env.BACKUP_TOKEN
  })
  setTimeout(sendBackUps, 1000 * 60 * 30)
}

setTimeout(sendBackUps, 1000 * 60 * 20 * Math.random())

startMonitoring()

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
