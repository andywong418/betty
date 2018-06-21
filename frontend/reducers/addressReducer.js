import * as types from '../actions/types'
const defaultState = {
  address: null
}

const copyState = (state) => {
  return Object.assign({}, state)
}

export default function (state = defaultState, action) {
  let newState = copyState(state)
  switch (action.type) {
    case types.FETCH_ADDRESS:
      newState.address = action.payload.address
      return newState
    default:
      return state
  }
}
