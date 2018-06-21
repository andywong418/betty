import React from 'react';

class BetModal extends React.Component {
    constructor(props) {
        super(props)
    } 

    render () {
        return (
          <div className='cover'>
            <div className="modal">
                <div className="modal-dialog">
                    <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Submitting bet</h5>
                        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div className="modal-body">
                        <p>Please send transactions using your wallet of choice. The address you should send to is: </p>
                        <p> {} </p>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary">Save changes</button>
                        <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
                    </div>
                    </div>
                </div>
            </div>
          </div>
        )
    }
}

export default BetModal