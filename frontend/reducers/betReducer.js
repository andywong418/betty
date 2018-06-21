import * as types from '../actions/types'

const defaultState = {
  destinationTag: null,
  bettingTeam: null,
  publicKey: null,
  betInfoError: null
}

const copyState = (state) => {
  return Object.assign({}, state)
}

export default function (state = defaultState, action) {
  let newState = copyState(state)
  switch (action.type) {
    case types.POST_BET_INFO:
      console.log('what?', action.payload)
      newState.destinationTag = action.payload.destinationTag
      newState.bettingTeam = action.payload.bettingTeam
      newState.publicKey = action.payload.publicKey
      newState.betInfoError = action.payload.betInfoError
      return newState
    default:
      return state
  }
}
