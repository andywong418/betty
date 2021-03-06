
import React from 'react'
import { connect } from 'react-redux'
import BetList from '../components/BetList'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { getMatches, getAddress, getBets } from '../actions/index'

class Bet extends React.Component {
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
      <div className='text-center main-body'>
        <Header name={this.props.name} />
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
export default connect(mapStateToProps, mapDispatchToProps)(Bet)
