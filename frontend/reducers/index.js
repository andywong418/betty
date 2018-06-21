import {combineReducers} from 'redux'
import {routerReducer} from 'react-router-redux'
import matchReducer from './matchReducer'
import addressReducer from './addressReducer'
function rootReducer (state = {name: 'Betty'}, action) {
  switch (action.type) {
    default:
      return state
  }
}
const mainReducer = combineReducers({routing: routerReducer, rootReducer, matchReducer, addressReducer})
export default mainReducer
