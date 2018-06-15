import * as types from '../actions/types'
const defaultState = {
  matchesNotPlayed: [],
  matchesPlayed: [],
  specificTeamMatches: []
}

const copyState = (state) => {
  return Object.assign({}, state)
}

export default function (state = defaultState, action) {
  let newState = copyState(state)
  switch (action.type) {
    case types.FETCH_MATCHES:
      newState.matchesNotPlayed = []
      newState.matchesPlayed = []
      action.payload.forEach(match => {
        if (new Date(match.matchTime) > new Date()) {
          newState.matchesNotPlayed.push(match)
        } else {
          newState.matchesPlayed.push(match)
        }
      })
      return newState
    default:
      return state
  }
}
