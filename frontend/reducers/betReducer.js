import * as types from '../actions/types'

const defaultState = {
  destinationTag: null,
  bettingTeam: null,
  address: null,
  betInfoError: null,
  bets: {}
}

const copyState = (state) => {
  return Object.assign({}, state)
}

export default function (state = defaultState, action) {
  let newState = copyState(state)
  switch (action.type) {
    case types.POST_BET_INFO:
      newState.destinationTag = action.payload.destinationTag
      newState.bettingTeam = action.payload.bettingTeam
      newState.address = action.payload.address
      newState.betInfoError = action.payload.betInfoError
      return newState
    case types.FETCH_BETS:
      newState.bets = action.payload
      return newState
    case types.POST_OPPOSING_BET_INFO:
      newState.destinationTag = action.payload.destinationTag
      newstate.bettingTeam - action.payload.bettingTeam
      newState.address = action.payload.address
      newState.betInfoError = action.payload.betInfoError
    default:
      return state
  }
}
