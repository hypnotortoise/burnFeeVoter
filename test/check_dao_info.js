import Web3 from 'web3';

const DAO_ABI = [
  {
      "constant": true,
      "inputs": [
        {
          "name": "_user",
          "type": "address"
        }
      ],
      "name": "isParticipant",
      "outputs": [
        {
          "name": "_is",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }
];

const DAO_INFORMATION_ABI = [
{
      "constant": true,
      "inputs": [
        {
          "name": "_user",
          "type": "address"
        }
      ],
      "name": "readUserInfo",
      "outputs": [
        {
          "name": "_isParticipant",
          "type": "bool"
        },
        {
          "name": "_isModerator",
          "type": "bool"
        },
        {
          "name": "_lastParticipatedQuarter",
          "type": "uint256"
        },
        {
          "name": "_lockedDgdStake",
          "type": "uint256"
        },
        {
          "name": "_lockedDgd",
          "type": "uint256"
        },
        {
          "name": "_reputationPoints",
          "type": "uint256"
        },
        {
          "name": "_quarterPoints",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
]


async function isParticipant() {
  const web3 = new Web3('http://localhost:8545');
  var DigixDAOContract = new web3.eth.Contract(DAO_ABI, "0x5d093A0e0328Ad17469b948De7f2DfD4b5eE5544");
  var DigixDAOInformationContract = new web3.eth.Contract(DAO_INFORMATION_ABI, "0x403cc7802725928652a3d116bb1781005e2e76d3");

  // initialize accounts
  for (var i=0; i < 10; i++) {
    web3.eth.accounts.wallet.add("0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b75012"+String(i).padStart(2, "0"));
  }
  for (var i=0; i < 10; i++) {
    web3.eth.accounts.wallet.add("0x3bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b75012"+String(i).padStart(2, "0"));
  }

  for (var i=0; i < 20; i++) {
    var isParticipant = await DigixDAOContract.methods.isParticipant(web3.eth.accounts.wallet[i].address).call({from: web3.eth.accounts.wallet[0].address});
    if (isParticipant) {
      console.log("Address:")
      console.log(web3.eth.accounts.wallet[i].address);
      var userInfo = await DigixDAOInformationContract.methods.readUserInfo(web3.eth.accounts.wallet[i].address).call({from: web3.eth.accounts.wallet[0].address});
      console.log("Locked DGDs");
      console.log(userInfo._lockedDgd);
      console.log("Locked DGDs Stake");
      console.log(userInfo._lockedDgdStake);
      console.log("--------------");
    }
  }
}
isParticipant();
