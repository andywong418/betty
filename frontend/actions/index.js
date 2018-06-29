// Action Creators

import * as types from './types'
import * as axios from 'axios'

export const getMatches = () => async (dispatch) => {
  const resp = await axios.get('/api/matches')
  dispatch({
    type: types.FETCH_MATCHES,
    payload: resp.data.matches
  })
}

export const getAddress = () => async (dispatch) => {
  const resp = await axios.get('/api/wallet-address')
  dispatch({
    type: types.FETCH_ADDRESS,
    payload: resp.data
  })
}

export const postBetInfo = (betObj) => async (dispatch) => {
  const resp = await axios.post('/api/bet-info', betObj)
  dispatch({
    type: types.POST_BET_INFO,
    payload: resp.data
  })
}

export const postOpposingBetInfo = (betObj) => async (dispatch) => {
  const resp = await axios.post('/api/opposing-bet-info', betObj)
  dispatch({
    type: types.POST_BET_INFO,
    payload: resp.data
  })
}
export const getBets = () => async (dispatch) => {
  const resp = await axios.get('/api/bets')
  dispatch({
    type: types.FETCH_BETS,
    payload: resp.data
  })
}

export const resetDestinationTag = () => async (dispatch) => {
  dispatch({
    type: types.RESET_DESTINATION_TAG
  })
}
