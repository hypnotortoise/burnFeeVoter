import React, { Component } from "react";
import BountiesContract from "./contracts/Bounties.json";
import getWeb3 from "./utils/getWeb3";
import { setJSON, getJSON } from './utils/ipfs.js';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Card from 'react-bootstrap/Card';
import CardGroup from 'react-bootstrap/CardGroup';
import Image from 'react-bootstrap/Image';

import BootstrapTable from 'react-bootstrap-table/lib/BootstrapTable';
import TableHeaderColumn from 'react-bootstrap-table/lib/TableHeaderColumn';

import "./App.css";
import 'react-bootstrap-table/dist/react-bootstrap-table-all.min.css';

const etherscanBaseUrl = "https://rinkeby.etherscan.io";
const ipfsBaseUrl = "https://ipfs.infura.io/ipfs";

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      storageValue: 0,
      bountiesInstance: undefined,
      bountyAmount: undefined,
      bountyData: undefined,
      bountyDeadline: undefined,
      fulfilData: undefined,
      bountyId: undefined,
      etherscanLink: "https://rinkeby.etherscan.io",
      bounties: [],
      fulfilments: {},
      account: null,
      web3: null
    };

    this.handleIssueBounty = this.handleIssueBounty.bind(this);
    this.handleFulfilBounty = this.handleFulfilBounty.bind(this);
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
      const deployedNetwork = BountiesContract.networks[networkId];
      const instance = new web3.eth.Contract(
        BountiesContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ bountiesInstance: instance, web3: web3, account: accounts[0] });
      this.addEventListener(this);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  addEventListener(component) {
    // get all issued bounties events
    this.state.bountiesInstance.events.BountyIssued({fromBlock: 0, toBlock: 'latest'})
    .on('data', async function(event){
      //First get the data from IPFS and add it to the event
      var ipfsJson = {};
      try {
        ipfsJson = await getJSON(event.returnValues.data);
      }
      catch (e) {}

      if(ipfsJson.bountyData !== undefined) {
        event.returnValues['bountyData'] = ipfsJson.bountyData;
        event.returnValues['ipfsData'] = ipfsBaseUrl+"/"+event.returnValues.data;
      }
      else {
        event.returnValues['bountyData'] = event.returnValues.data;
        event.returnValues['ipfsData'] = "none";
      }
      var newBountiesArray = component.state.bounties.slice()
      newBountiesArray.push(event.returnValues)
      component.setState({ bounties: newBountiesArray })
    })
    .on('error', console.error);

    // get all bountyFulfiled events
    this.state.bountiesInstance.events.BountyFulfiled({fromBlock: 0, toBlock: 'latest'})
    .on('data', async function(event){
         var ipfsJson = {};
      try {
        ipfsJson = await getJSON(event.returnValues.data);
      }
      catch (e) {}

      if(ipfsJson.fulfilData !== undefined) {
        event.returnValues['fulfilData'] = ipfsJson.fulfilData;
        event.returnValues['ipfsFulfilData'] = ipfsBaseUrl+"/"+event.returnValues.data;
      }
      else {
        event.returnValues['fulfilData'] = event.returnValues.data;
        event.returnValues['ipfsFulfilData'] = "none";
      }
      var bounty_id = event.returnValues.bounty_id;
      var newFulfilmentsArray = [];
      if (Object.keys(component.state.fulfilments).includes(bounty_id)) {
        newFulfilmentsArray = component.state.fulfilments[bounty_id].slice();
      }
      newFulfilmentsArray.push(event.returnValues);
      var newFulfilmentsObject = component.state.fulfilments;
      newFulfilmentsObject[bounty_id] = newFulfilmentsArray;
      component.setState({ fulfilments: newFulfilmentsObject });
    })
    .on('error', console.error);
  }


  // update etherscanLink
  setLastTransactionDetails(result) {
    if(result.tx !== 'undefined')
    {
      this.setState({etherscanLink: etherscanBaseUrl+"/tx/"+result.tx})
    }
    else
    {
      this.setState({etherscanLink: etherscanBaseUrl})
    }
  }

  // Handle form submit
  async handleIssueBounty(event) {
    if (typeof this.state.bountiesInstance !== 'undefined') {
      event.preventDefault();
      const ipfsHash = await setJSON({ bountyData: this.state.bountyData });
      let result = await this.state.bountiesInstance.methods.issueBounty(ipfsHash, this.state.bountyDeadline).send({from: this.state.account, value: this.state.web3.utils.toWei(this.state.bountyAmount, 'ether')});
      this.setLastTransactionDetails(result);
    }
  }

  // Handle form submit
  async handleFulfilBounty(event) {
    if (typeof this.state.bountiesInstance !== 'undefined') {
      event.preventDefault();
      const ipfsHash = await setJSON({ fulfilData: this.state.fulfilData });
      let result = await this.state.bountiesInstance.methods.fulfilBounty(this.state.bountyId, ipfsHash).send({from: this.state.account});
      this.setLastTransactionDetails(result);
    }
  }

  // Handle form data change
  handleChange(event) {
    switch(event.target.name) {
      case "bountyData":
        this.setState({"bountyData": event.target.value})
        break;
      case "bountyDeadline":
        this.setState({"bountyDeadline": event.target.value})
        break;
      case "bountyAmount":
        this.setState({"bountyAmount": event.target.value})
        break;
      case "bountyId":
        this.setState({"bountyId": event.target.value})
        break;
      case "fulfilData":
        this.setState({"fulfilData": event.target.value})
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
          <Row>
          <a href={this.state.etherscanLink} target="_blank" rel="noopener noreferrer">Last Transaction Details</a>
          </Row>
          <Row>
          <CardGroup>
          <Card>
            <Card.Header>Issue Bounty</Card.Header>
            <Card.Body>
              <Form onSubmit={this.handleIssueBounty}>
                <Form.Group
                  controlId="fromCreateBounty"
                >
                  <Form.Control
                    componentclass="textarea"
                    name="bountyData"
                    value={this.state.bountyData}
                    placeholder="Enter bounty details"
                    onChange={this.handleChange}
                  />
                  <Form.Text>Enter bounty data</Form.Text><br/>

                  <Form.Control
                    type="text"
                    name="bountyDeadline"
                    value={this.state.bountyDeadline}
                    placeholder="Enter bounty deadline"
                    onChange={this.handleChange}
                  />
                  <Form.Text>Enter bounty deadline in seconds since epoch</Form.Text><br/>

                  <Form.Control
                    type="text"
                    name="bountyAmount"
                    value={this.state.bountyAmount}
                    placeholder="Enter bounty amount"
                    onChange={this.handleChange}
                  />
                  <Form.Text>Enter bounty amount</Form.Text><br/>
                  <Button type="submit">Issue Bounty</Button>
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>
          <Card>
            <Card.Header>Fulfil Bounty</Card.Header>
            <Card.Body>
              <Form onSubmit={this.handleFulfilBounty}>
              <Form.Group controlId="fromFulfilBounty">
                <Form.Control
                  componentclass="textarea"
                  name="fulfilData"
                  value={this.state.fulfilData}
                  placeholder="Enter Fulfilment details"
                  onChange={this.handleChange}
                />
                <Form.Text>Enter fulfilment data</Form.Text><br/>
                <Form.Control
                  as="select"
                  name="bountyId"
                  value={this.state.bountyId}
                  onChange={this.handleChange}
                >
                {this.state.bounties.map((bounty) => (
                  <option key={bounty.bounty_id} value={bounty.bounty_id}>{bounty.bounty_id}</option>
                ))}
                </Form.Control>
                <Form.Text>Select bounty ID</Form.Text><br/>
                <Button type="submit">Fulfil Bounty</Button>
              </Form.Group>
            </Form>
            </Card.Body>
          </Card>
          </CardGroup>
          </Row>
          <Row>
          <Card>
          <Card.Header>Issued Bounties</Card.Header>
          <Card.Body>
          <BootstrapTable data={this.state.bounties} striped hover>
            <TableHeaderColumn isKey dataField='bounty_id'>ID</TableHeaderColumn>
            <TableHeaderColumn dataField='issuer'>Issuer</TableHeaderColumn>
            <TableHeaderColumn dataField='amount'>Amount</TableHeaderColumn>
            <TableHeaderColumn dataField='ipfsData'>IPFS Bounty Data</TableHeaderColumn>
            <TableHeaderColumn dataField='bountyData'>Bounty Data</TableHeaderColumn>
          </BootstrapTable>
          </Card.Body>
          </Card>
          </Row>
          <Row>
          <Card>
          <Card.Header>Issued Fulfilments</Card.Header>
          <Card.Body>
          {Object.entries(this.state.fulfilments).map(([key,bountyFulfilments]) => (
            <BootstrapTable data={bountyFulfilments} striped hover>
              <TableHeaderColumn isKey dataField='bounty_id'>Bounty ID</TableHeaderColumn>
              <TableHeaderColumn dataField='fulfilment_id'>Fulfilment ID</TableHeaderColumn>
              <TableHeaderColumn dataField='fulfiler'>Fulfiler</TableHeaderColumn>
              <TableHeaderColumn dataField='ipfsFulfilData'>IPFS Fulfilment Data</TableHeaderColumn>
              <TableHeaderColumn dataField='fulfilData'>Fulfilment Data</TableHeaderColumn>
            </BootstrapTable>
          ))}
          </Card.Body>
          </Card>
          </Row>
        </Container>
      </div>
    );
  }
}

export default App;
