const BurnFeePoll = artifacts.require("BurnFeePoll");
const getCurrentTime = require('./utils/time').getCurrentTime;
const increaseTimeInSeconds = require('./utils/time').increaseTimeInSeconds;
const assertRevert = require('./utils/assertRevert').assertRevert;
const dayInSeconds = 86400;

contract('BurnFeePoll', function(accounts) {

  let burnFeePollInstance;

  beforeEach(async () => {
    burnFeePollInstance = await BurnFeePoll.new();
  });

  it("Should allow a participant to issue a new vote", async () => {
    let tx = await burnFeePollInstance.issueVote(
      30,
      {from: accounts[0]}
    );

    assert.strictEqual(tx.receipt.logs.length, 1, "issueVote() call did not log 1 event");
    assert.strictEqual(tx.logs.length, 1, "issueVote() call did not log 1 event");
    const logVoteIssued = tx.logs[0];
    assert.strictEqual(logVoteIssued.event, "VoteIssued", "issueVote() call did not log event VoteIssued");
    assert.strictEqual(logVoteIssued.args.voter, accounts[0], "VoteIssued event logged did not have expected voter");
    assert.strictEqual(logVoteIssued.args.fee.toNumber(),30, "VoteIssued event logged did not have expected fee");
  });

  it("Should not allow a participant to issue a vote sending ETH to the contract", async () => {
    assertRevert(burnFeePollInstance.issueVote(30,
                               {from: accounts[0], value: 50}), "Bounty issued with sending ETH to the contract");
  });

  it("Should not allow a participant to issue a bounty with a deadline 90 days in the future", async () => {
    await increaseTimeInSeconds((dayInSeconds * 90)+1);
    assertRevert(burnFeePollInstance.issueVote(30,
                                {from: accounts[0], value: 0}), "Bounty issued with deadline of + 90 days");
  });

  it("Should cancelVote", async () => {
    await burnFeePollInstance.issueVote(30,
        {from: accounts[0], value: 0});
    let tx = await burnFeePollInstance.cancelVote({from: accounts[0]});
    const logVoteCancelled = tx.logs[0];
    assert.strictEqual(logVoteCancelled.event, "VoteCancelled", "cancelVote() call did not log event VoteCancelled");
    assert.strictEqual(logVoteCancelled.args.voter, accounts[0], "VoteCancelled event logged did not have expected voter");
    assert.strictEqual(logVoteCancelled.args.votingRights.toNumber(),0, "VoteCancelled event logged did not have expected votingRights");
  });

});