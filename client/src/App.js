import React, { Component } from 'react';
import VoteContract from "./contracts/BurnFeePoll.json";
import getWeb3 from "./utils/getWeb3";
import './App.css';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Card from 'react-bootstrap/Card';
import CardGroup from 'react-bootstrap/CardGroup';
import Image from 'react-bootstrap/Image';

import BootstrapTable from 'react-bootstrap-table/lib/BootstrapTable';
import TableHeaderColumn from 'react-bootstrap-table/lib/TableHeaderColumn';

const etherscanBaseUrl = "https://rinkeby.etherscan.io";
const priceAPIBaseUrl = "https://api.cryptowat.ch/";


const CancelButton = ({voteState}) => {
  if (voteState === "CANCELLED") {
    return <Button type="submit" disabled>Cancel Vote</Button>;
  } else {
    return <Button type="submit">Cancel Vote</Button>;
  }
}

const VoteButton = ({voteState}) => {
  if (voteState === "CANCELLED") {
    return <Button type="submit" disabled>{(voteState === "NOT_VOTED") ? "Vote" : "Change Vote"}</Button>;
  } else {
    return <Button type="submit">{(voteState === "NOT_VOTED") ? "Vote" : "Change Vote"}</Button>;
  }
}

const VoteHeader = ({voteState}) => {
   switch (voteState) {
      case "NOT_VOTED":
      case "CANCELLED":
        return <Card.Header>Issue Vote</Card.Header>;
      case "VOTED":
        return <Card.Header>Change Vote</Card.Header>;
      default:
        break;
    }
}

function stats(props) {

}

function marketPrice() {

  var markets = "markets/binance/dgdeth/price";
}

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      votesInstance: undefined,
      voteFee: undefined,
      voteState: "NOT_VOTED",
      etherscanLink: etherscanBaseUrl,
      votes: {},
      account: null,
      web3: null
    };

    this.handleIssueVote = this.handleIssueVote.bind(this);
    this.handleChangeVote = this.handleChangeVote.bind(this);
    this.handleCancelVote = this.handleCancelVote.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = VoteContract.networks[networkId];
      const instance = new web3.eth.Contract(
        VoteContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ votesInstance: instance, web3: web3, account: accounts[0] });
      this.addEventListener(this);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  // componentWillUnmount() {
  //   this.unsubscribe();
  // }

  addEventListener(component) {
    // get all issued votes events
    component.state.votesInstance.events.VoteIssued({fromBlock: 0, toBlock: 'latest'})
    .on('data', async (event) => {
      var voter = event.returnValues.voter;
      event.returnValues['voteFee'] = event.returnValues.fee;
      event.returnValues['voteState'] = "VOTED";

      var votes = component.state.votes;
      votes[voter] = event.returnValues;
      component.setState({ votes: votes });

      if (Object.keys(component.state.votes).includes(component.state.account)) {
        component.setState({ voteState: component.state.votes[component.state.account].voteState });
        component.setState({ voteFee: component.state.votes[component.state.account].voteFee });
      }
    })
    .on('error', console.error);

    // get all changed votes events
    component.state.votesInstance.events.VoteChanged({fromBlock: 0, toBlock: 'latest'})
    .on('data', async (event) => {
      var voter = event.returnValues.voter;
      event.returnValues['voteFee'] = event.returnValues.fee;
      event.returnValues['voteState'] = "VOTED";

      var votes = component.state.votes;
      votes[voter] = event.returnValues;
      component.setState({ votes: votes });

      if (Object.keys(component.state.votes).includes(component.state.account)) {
        component.setState({ voteState: component.state.votes[component.state.account].voteState });
        component.setState({ voteFee: component.state.votes[component.state.account].voteFee });
      }
    })
    .on('error', console.error);

    // get all cancelled votes events
    component.state.votesInstance.events.VoteCancelled({fromBlock: 0, toBlock: 'latest'})
    .on('data', async (event) => {
      var voter = event.returnValues.voter;
      event.returnValues['voteState'] = "CANCELLED";
      event.returnValues['voteFee'] = component.state.votes[voter].voteFee;

      var votes = component.state.votes;
      votes[voter] = event.returnValues;
      component.setState({ votes: votes });

      if (Object.keys(component.state.votes).includes(component.state.account)) {
        component.setState({ voteState: component.state.votes[component.state.account].voteState });
        component.setState({ voteFee: component.state.votes[component.state.account].voteFee });
      }
    })
    .on('error', console.error);

    console.log(component.state.votes)
  }

  async handleIssueVote(event) {
    if (typeof this.state.votesInstance !== 'undefined') {
      event.preventDefault();
      let res = await this.state.votesInstance.methods.issueVote(this.state.voteFee).send({from: this.state.account});
      this.setLastTransactionDetails(res);
    }
  }

  async handleChangeVote(event) {
    if (typeof this.state.votesInstance !== 'undefined') {
      event.preventDefault();
      let res = await this.state.votesInstance.methods.changeVote(this.state.voteFee).send({from: this.state.account});
      this.setLastTransactionDetails(res);
    }
  }

  async handleCancelVote(event) {
    if (typeof this.state.votesInstance !== 'undefined') {
      event.preventDefault();
      let res = await this.state.votesInstance.methods.cancelVote().send({from: this.state.account});
      this.setLastTransactionDetails(res);
    }
  }

  // update etherscanLink
  setLastTransactionDetails(res) {
    if(res.tx !== 'undefined')
    {
      this.setState({etherscanLink: etherscanBaseUrl+"/tx/"+res.tx})
    }
    else
    {
      this.setState({etherscanLink: etherscanBaseUrl})
    }
  }

  handleChange(event) {
    switch(event.target.name) {
      case "voteFee":
        this.setState({"voteFee": event.target.value})
        break;
      default:
        break;
    }
  }

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }

    return (
      <div className="App">
        <Container>
          <Row className="justify-content-md-center">
          <Image
              className="App-logo"
              src="logo.svg"
          />
          </Row>
          <Row className="justify-content-md-center">
          <CardGroup>
          <Card>
            <VoteHeader voteState={this.state.voteState} />
            <Card.Body>
              <Form onSubmit={(this.state.voteState === "VOTED") ? this.handleChangeVote : this.handleIssueVote}>
                <Form.Group controlId="fromIssueVote">
                  <Form.Control
                  type="range"
                  name="voteFee"
                  value={this.state.voteFee || "20"}
                  onChange={this.handleChange}
                  min="0"
                  max="45"
                  step="1"
                  disabled={(this.state.voteState === "CANCELLED")}
                />
                <Form.Text>Vote for Burn Fee ({this.state.voteFee || "20"}%)</Form.Text>
                <VoteButton voteState={this.state.voteState} />
                </Form.Group>
              </Form>
              <Form onSubmit={this.handleCancelVote}>
                <CancelButton voteState={this.state.voteState} />
              </Form>
              {(this.state.voteState === "CANCELLED") ? (
                <Card.Text className="mt-5 alert alert-info">
                  You previously cancelled your vote.<br />
                  Can't vote again
                  </Card.Text>
                ) : null
              }
            </Card.Body>
          </Card>
          </CardGroup>
          </Row>
          <Row className="justify-content-md-center">
          <Card>
          <Card.Header>Issued Votes</Card.Header>
          <Card.Body>
            <BootstrapTable data={Object.values(this.state.votes)} striped hover>
              <TableHeaderColumn isKey dataField='voter'>Voter</TableHeaderColumn>
              <TableHeaderColumn dataField='voteFee'>Voted(in %)</TableHeaderColumn>
            </BootstrapTable>
          </Card.Body>
          </Card>
          </Row>
        </Container>
      </div>
    );
  }
}

export default App;
