import axios from 'axios'
const oracle = process.env.ORACLE

export function validateBet (betObj) {
    const match = await axios.get(oracle + `/game/${betObj.matchId}`)
    if (match.data.matchTime >= new Date()) {
        return false
    }
    if (betObj.bettingTeam !== match.data.team1 && betObj.bettingTeam !== match.data.team2) {
        return false
    }

    return true
}