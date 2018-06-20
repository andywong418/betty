const levelup = require('levelup')
const leveldown = require('leveldown')
let dbUrl = './mydb'
if(process.env.PORT) {
  dbUrl += '-' + process.env.PORT
}
const db = levelup(leveldown(dbUrl))

class BettyDB {
    constructor (database) {
        this.db = db
    }
    async get (key) {
        try {
            return await this.db.get(key, { asBuffer: false })
        } catch (err) {
            throw err
        }
    }

    async set (key, value) {
        try {
            return await this.db.put(key, value)
        } catch (err) {
            throw err
        }
    }
}

module.exports = BettyDB