import Proptypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import MatchList from '../components/MatchList'
import BetList from '../components/BetList'
import Footer from '../components/Footer'
import { getMatches, getAddress, getBets } from '../actions/index'

class Home extends React.Component {
  constructor (props) {
    super(props)
    this.state = {

    }
  }

  componentDidMount () {
    this.props.getMatches()
    this.props.getAddress()
    this.props.getBets()
  }
  render () {
    return (
      <div className='text-center'>
        <div className='header'>
          <div className='content-wrapper'>
            <span className='title'> {this.props.name} </span>
            <div className='image-container'>
              <img width ={200} src= '/images/world-cup.svg' />
            </div>
            <span className='world-cup-title'> 2018 </span>
          </div>
          <p>The first decentralized betting platform for the Russian World Cup built on Codius </p>
        </div>
        <MatchList matchesNotPlayed={this.props.matchesNotPlayed} matchesPlayed={this.props.matchesPlayed} sharedAddress={this.props.address} />
        <BetList getBets = {() => this.getBets()} bets= {this.props.bets} sharedAddress={this.props.address}/>
        <Footer />
      </div>
    )
  }
}
const mapStateToProps = (state) => {
  return {
    name: state.rootReducer.name,
    matchesNotPlayed: state.matchReducer.matchesNotPlayed,
    matchesPlayed: state.matchReducer.matchesPlayed,
    address: state.addressReducer.address,
    bets: state.betReducer.bets
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    getMatches: () => dispatch(getMatches()),
    getAddress: () => dispatch(getAddress()),
    getBets: () => dispatch(getBets())
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Home)
