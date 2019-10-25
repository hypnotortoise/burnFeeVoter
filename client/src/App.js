import React, { Component, useState } from "react";
import axios from "axios";
import VoteContract from "./contracts/BurnFeePoll.json";
import Web3 from "web3";
import getWeb3 from "./utils/getWeb3";
import './App.css';

import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Card from "react-bootstrap/Card";
import CardDeck from "react-bootstrap/CardDeck";
import Image from "react-bootstrap/Image";

import BootstrapTable from "react-bootstrap-table/lib/BootstrapTable";
import TableHeaderColumn from "react-bootstrap-table/lib/TableHeaderColumn";

const a = require('awaiting');
const etherscanBaseUrl = "https://rinkeby.etherscan.io";
axios.defaults.baseURL = "https://hypnotortoise-eval-prod.apigee.net/cw";

// const daoStakeStorageContractAddress = "0x320051bbd4eee344bb86f0a858d03595837463ef";
// const DAO_STAKE_ABI = [
//   {
//     "constant": true,
//     "inputs": [],
//     "name": "totalLockedDGDStake",
//     "outputs": [
//       {
//         "name": "",
//         "type": "uint256"
//       }
//     ],
//     "payable": false,
//     "stateMutability": "view",
//     "type": "function"
//   }
// ]

const CancelButton = ({voteState, cancelAction}) => {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);


  if (voteState === "CANCELLED") {
    return <Button variant="light" type="submit" disabled>Cancel Vote</Button>;
  } else {
    return (
      <>
      <Button variant="light" onClick={handleShow}>Cancel Vote</Button>
      <Modal show={show} onHide={handleClose}>
        <Modal.Header CancelButton>
          <Modal.Title>Cancel Vote</Modal.Title>
        </Modal.Header>
        <Modal.Body>Warning! If you cancel your vote you can't vote again! Are you sure you want to continue?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            No
          </Button>
          <Button variant="primary" type="submit" onClick={cancelAction}>
            Yes
          </Button>
        </Modal.Footer>
      </Modal>
      </>
    );
  }
}

const VoteButton = ({voteState}) => {
  if (voteState === "CANCELLED") {
    return <Button variant="light" type="submit" disabled>{(voteState === "NOT_VOTED") ? "Vote" : "Change Vote"}</Button>;
  } else {
    return <Button variant="light" type="submit">{(voteState === "NOT_VOTED") ? "Vote" : "Change Vote"}</Button>;
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

const VotedStats = ({voteAvg, marketPrice, daoBalance}) => {
  return (
    <Card.Body>
      <Card.Text>
        Average Voted Fee: {voteAvg}
      </Card.Text>
      <Card.Text>
        Expected Average Exchange Price based on Voted Fee: {
          (
            parseFloat(daoBalance/2e6)
            - parseFloat(daoBalance/2e6)*voteAvg/100
          )
        }
      </Card.Text>
      <Card.Text>
        Surplus over current Exchange Price: {
          (
            (
              parseFloat(daoBalance/2e6)
              - parseFloat(daoBalance/2e6)*voteAvg/100
            )
            - parseFloat(marketPrice).toPrecision(5)
          )
        }
       </Card.Text>
    </Card.Body>
  );
}

const Stats = ({voteAvg, marketPrice, daoBalance}) => {
  return (
    <Card className="bg-dark text-white">
      <Card.Header>Vote Statistics</Card.Header>
      <Card.Body>
        Average Exchange Price:
          {isNaN(parseFloat(marketPrice)) ? "Unknown" : (<Card.Text>{parseFloat(marketPrice).toPrecision(5)} DGD/ETH</Card.Text>)}
      </Card.Body>
      <Card.Body>
        Total ETH in MultiSig: {daoBalance || 0}
      </Card.Body>
      {(voteAvg < 0) ? (<Card.Body>No counting votes</Card.Body>) :
        (<VotedStats voteAvg={voteAvg} marketPrice={marketPrice} daoBalance={daoBalance} />)
      }
    </Card>
  );
}

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      votesInstance: undefined,
      voteFee: undefined,
      voteState: "NOT_VOTED",
      voteWeight: undefined,
      etherscanLink: etherscanBaseUrl,
      voteAvg: undefined,
      votes: {},
      account: null,
      web3: null,
      marketPrice: undefined,
      daoBalance: undefined
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
      this.votingAvg();
      this.getMarketPrice();
      this.getDAOBalance();
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
      event.returnValues['voteWeight'] = event.returnValues.lockedDgdStake;

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
      event.returnValues['voteWeight'] = component.state.votes[voter].voteWeight;

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
      event.returnValues['voteFee'] = component.state.votes[voter].voteFee;
      event.returnValues['voteState'] = "CANCELLED";
      event.returnValues['voteWeight'] = component.state.votes[voter].voteWeight;

      var votes = component.state.votes;
      votes[voter] = event.returnValues;
      component.setState({ votes: votes });

      if (Object.keys(component.state.votes).includes(component.state.account)) {
        component.setState({ voteState: component.state.votes[component.state.account].voteState });
        component.setState({ voteFee: component.state.votes[component.state.account].voteFee });
      }
    })
    .on('error', console.error);

    // console.log(component.state.votes)
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

  // Calculate Voting Average
  async votingAvg() {
    if (typeof this.state.votesInstance !== 'undefined') {
      // var DigixDAOStakeStorage = new this.state.web3.eth.Contract(DAO_STAKE_ABI, daoStakeStorageContractAddress);
      // var totalLockedWeight = await DigixDAOStakeStorage.methods.totalLockedDGDStake().call({from: this.state.account});
      setInterval(() => {
        var voteAvg = 0;
        var [totalVotedWeight, i] = [0, 0];
        var votesWithoutCancelled = Object.values(this.state.votes).filter(vote => vote.voteState !== "CANCELLED");
        while(votesWithoutCancelled[i]) {
          totalVotedWeight += parseInt(votesWithoutCancelled[i].voteWeight);
          i++;
        }
        // console.log(totalVotedWeight);
        if (totalVotedWeight > 0) {
          votesWithoutCancelled.forEach((vote) => {
            voteAvg += parseFloat(parseInt(vote.voteFee) * parseInt(vote.voteWeight) / totalVotedWeight);
          });
          this.setState({voteAvg: parseInt(voteAvg)});
        } else {
          this.setState({voteAvg: -1});
        }
      }, 1000);
    }
  }

  // fetch current average market price for ETH/DGD pair
  async getMarketPrice() {
    try {
      const ax = axios.create({ timeout: 1000 });
      var asset = await ax.get('/assets/dgd')
      .then(
        (res) => { return res.data.result },
        (err) => { if (err.response) {
          throw err.response;
        }}
      );

      var exchanges = [];
      asset.markets.base.forEach((market) => {
        if (market.pair === "dgdeth") {
          exchanges.push(market);
        }
      });

      if (exchanges.length < 1) {
        throw Error("no exchanges found for DGD asset");
      };

      var sum_exchange_price = 0;
      var urls = [];
      exchanges.forEach((exchange) => {urls.push(exchange.route.replace("https://api.cryptowat.ch",""))});
      var prices = await a.map(urls, 3, async(url) => {
        var data = await ax.get(url + "/price")
        .then(
          (res) => { return res.data.result },
          (err) => { if (err.response) {
            console.error(err.response);
            urls.splice(urls.indexOf(url),1);
            return 0;
          }}
        );
        // console.log(data);
        return data;
      });
      // console.log(prices);

      prices.forEach((priceData) => {
        sum_exchange_price = sum_exchange_price + priceData.price;
      });
      // console.log(sum_exchange_price);
      this.setState({marketPrice: sum_exchange_price / urls.length});
    } catch (err) {
      console.error(err);
      this.setState({marketPrice: "Unknown"});
    }
  }

  // get ETH balance from DAO multi-sig contract
  async getDAOBalance() {
    const daoMultiSigContractAddress = "0x75bA02c5bAF9cc3E9fE01C51Df3cB1437E8690D4";
    let web3 = undefined;
    if (this.state.networkId !== 1) {
      let provider = new Web3.providers.HttpProvider(
        "https://mainnet.infura.io/v3/8aad543c526449b78cacb050cb44f158"
      );
      web3 = new Web3(provider);
    } else {
      web3 = this.state.web3;
    }
    var daoBalance = await web3.eth.getBalance(daoMultiSigContractAddress);
    this.setState({daoBalance: web3.utils.fromWei(daoBalance)});
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
          <Row className="pb-3 justify-content-md-center">
          <Image
              className="App-logo"
              src="logo.svg"
          />
          </Row>
          <Row className="pb-3 justify-content-md-center">
          <CardDeck>
          <Card className="bg-dark text-white">
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
              <Form>
                <CancelButton voteState={this.state.voteState} cancelAction={this.handleCancelVote} />
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
          <Stats voteAvg={this.state.voteAvg} marketPrice={this.state.marketPrice} daoBalance={this.state.daoBalance} />
          </CardDeck>
          </Row>
          <Row className="pb-3 justify-content-md-center">
          <Card className="w-100 bg-dark text-white">
          <Card.Header>Issued Votes (excludes votes cancelled)</Card.Header>
          <Card.Body>
            <BootstrapTable className="table-secondary" version='4' data={Object.values(this.state.votes).filter(vote => vote.voteState !== "CANCELLED")} striped hover>
              <TableHeaderColumn isKey dataField='voter'>Voter</TableHeaderColumn>
              <TableHeaderColumn dataField='voteFee'>Fee(%)</TableHeaderColumn>
              <TableHeaderColumn dataField='voteWeight'>Voting Weight</TableHeaderColumn>
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
