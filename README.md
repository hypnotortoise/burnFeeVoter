# BurnFeeVoter
This is a Digix DAO community initiative to allow DAO participants to vote for their preferred burning fee on the mainnet and according to their voting power based on locked DGDs in the DAO.
There's no centralized actor in the voting process and every voting action is done on chain.

[Visit the App Here](https://hypnotortoise.github.io/burnFeeVoter/)

## Components
Two components are mainly used for casting a vote:
* Smart Contract: [BurnFeePoll](https://gitlab.com/hypnotortoise/burnFeeVoter/blob/dev/contracts/BurnFeePoll.sol)
 * Checks DAO pariticpation status of `msg.sender`
 * Allows Voting/Vote Changes/Vote Cancellation
 * Stores vote, status & lockedDgdStake of each voter on chain

* Web Frontend: [BurnFeePoll](https://gitlab.com/hypnotortoise/burnFeeVoter/tree/dev/client)
 * React App for triggering the votes. Interfaces with Metamask to allow participants to vote.
 * Shows current voter turnout & voted fee average (takes into account voting power of each voter).
 * Shows current market price of DGD/ETH & calculated benefit with voted fee average over current price
 