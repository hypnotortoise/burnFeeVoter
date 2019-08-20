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
      {from: accounts[4]}
    );

    assert.strictEqual(tx.receipt.logs.length, 1, "issueVote() call did not log 1 event");
    assert.strictEqual(tx.logs.length, 1, "issueVote() call did not log 1 event");
    const logVoteIssued = tx.logs[0];
    assert.strictEqual(logVoteIssued.event, "VoteIssued", "issueVote() call did not log event VoteIssued");
    assert.strictEqual(logVoteIssued.args.voter, accounts[4], "VoteIssued event logged did not have expected voter");
    assert.strictEqual(logVoteIssued.args.fee.toNumber(), 30, "VoteIssued event logged did not have expected fee");
    assert.strictEqual(logVoteIssued.args.lockedDgdStake.toNumber(), 110000000000, "VoteIssued event logged did not have expected lockedDgdStake");
  });

  it("Should not allow a participant to issue a vote sending ETH to the contract", async () => {
    assertRevert(burnFeePollInstance.issueVote(30,
                               {from: accounts[4], value: 50}), "Bounty issued with sending ETH to the contract");
  });

  it("Should cancel vote if voted previously", async () => {
    await burnFeePollInstance.issueVote(
      30,
      {from: accounts[4]}
    );
    await increaseTimeInSeconds(60);
    let tx = await burnFeePollInstance.cancelVote( {from: accounts[4]} );
    const logVoteCancelled = tx.logs[0];
    assert.strictEqual(tx.receipt.logs.length, 1, "cancelVote() call did not log 1 event");
    assert.strictEqual(tx.logs.length, 1, "cancelVote() call did not log 1 event");
    assert.strictEqual(logVoteCancelled.event, "VoteCancelled", "cancelVote() call did not log event VoteCancelled");
    assert.strictEqual(logVoteCancelled.args.voter, accounts[4], "VoteCancelled event logged did not have expected voter");
  });

  it("Should change a vote if voted previously", async () => {
    await burnFeePollInstance.issueVote(
      30,
      {from: accounts[4]}
    );
    await increaseTimeInSeconds(60);
    let tx = await burnFeePollInstance.changeVote(20, {from: accounts[4]});
    const logVoteChanged = tx.logs[0];
    assert.strictEqual(tx.receipt.logs.length, 1, "cancelVote() call did not log 1 event");
    assert.strictEqual(tx.logs.length, 1, "cancelVote() call did not log 1 event");
    assert.strictEqual(logVoteChanged.event, "VoteChanged", "changeVote() call did not log event VoteChanged");
    assert.strictEqual(logVoteChanged.args.voter, accounts[4], "changeVote() event did not have expected voter");
    assert.strictEqual(logVoteChanged.args.fee.toNumber(), 20, "changeVote() event did not have expected new fee");
  });


  it("Should not allow to re-vote, if previously called cancelVote()", async () => {
    await burnFeePollInstance.issueVote(
      30,
      {from: accounts[4]}
    );
    await increaseTimeInSeconds(60);
    await burnFeePollInstance.cancelVote( {from: accounts[4]} );
    assertRevert(burnFeePollInstance.issueVote(10, {from: accounts[4]}));
  });

  // it("Should not allow a participant to issue a bounty with a deadline 90 days in the future", async () => {
  //   await increaseTimeInSeconds((dayInSeconds * 90)+1);
  //   assertRevert(burnFeePollInstance.issueVote(30,
  //                               {from: accounts[4], value: 0}), "Bounty issued with deadline of + 90 days");
  // });
});