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

const etherscanBaseUrl = "https://rinkeby.etherscan.io";

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

  componentWillUnmount() {
    this.unsubscribe();
  }

  addEventListener(component) {
    // get all issued votes events
    this.state.votesInstance.events.VoteIssued({fromBlock: 0, toBlock: 'latest'})
    .on('data', async (event) => {
      var voter = event.returnValues.voter;
      event.returnValues['voteFee'] = event.returnValues.fee;
      event.returnValues['voteState'] = "VOTED";

      var votes = this.state.votes;
      votes[voter] = event.returnValues;
      component.setState({ votes: votes });
      console.log(votes);
      component.setState({ voteState: votes[voter].voteState });
    })
    .on('error', console.error);

    // get all changed votes events
    this.state.votesInstance.events.VoteChanged({fromBlock: 0, toBlock: 'latest'})
    .on('data', async (event) => {
      var voter = event.returnValues.voter;
      event.returnValues['voteFee'] = event.returnValues.fee;
      event.returnValues['voteState'] = "VOTED";

      var votes = this.state.votes;
      votes[voter] = event.returnValues;
      component.setState({ votes: votes });
      component.setState({ voteState: votes[voter].voteState });
    })
    .on('error', console.error);

    // get all cancelled votes events
    this.state.votesInstance.events.VoteCancelled({fromBlock: 0, toBlock: 'latest'})
    .on('data', async (event) => {
      var voter = event.returnValues.voter;
      event.returnValues['voteState'] = "CANCELLED";
      event.returnValues['voteFee'] = this.state.votes[voter].voteFee;

      var votes = this.state.votes;
      votes[voter] = event.returnValues;
      component.setState({ votes: votes });
      component.setState({ voteState: votes[voter].voteState });
    })
    .on('error', console.error);
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
    var cardHeader = (() => {
      switch (this.state.voteState) {
        case "NOT_VOTED":
        case "CANCELLED":
          return <Card.Header>Issue Vote</Card.Header>
        case "VOTED":
          return <Card.Header>Change Vote</Card.Header>
        default:
          break;
      }
    })();
    return (
      <div className="App">
        <Container>
          <Row className="justify-content-md-center">
          <Image
              className="App-logo"
              src="logo512.png"
          />
          </Row>
          <Row>
          <CardGroup>
          <Card>
            { cardHeader }
            <Card.Body>
              <Form onSubmit={(this.state.voteState === "VOTED") ? this.handleChangeVote : this.handleIssueVote}>
                <Form.Group controlId="fromIssueVote">
                  <Form.Control
                  type="range"
                  name="voteFee"
                  value={this.state.voteFee}
                  placeholder={(this.state.voteState === "VOTED") ? this.state.voteFee : 0}
                  onChange={this.handleChange}
                  min="0"
                  max="45"
                  step="1"
                />
                <Form.Text>Vote for Burn Fee ({this.state.voteFee}%)</Form.Text>
                <Button type="submit">{(this.state.voteState === "NOT_VOTED") ? "Vote" : "Change Vote"}</Button>
                </Form.Group>
              </Form>
              <Form onSubmit={this.handleCancelVote}>
                <Button type="submit">Cancel Vote</Button>
              </Form>
            </Card.Body>
          </Card>
          </CardGroup>
          </Row>
        </Container>
      </div>
    );
  }
}

export default App;
