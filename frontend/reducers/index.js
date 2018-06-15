import {combineReducers} from 'redux'
import {routerReducer} from 'react-router-redux'
import matchReducer from './matchReducer'
function rootReducer (state = {name: 'Betty'}, action) {
  switch (action.type) {
    default:
      return state
  }
}
const mainReducer = combineReducers({routing: routerReducer, rootReducer, matchReducer})
export default mainReducer
