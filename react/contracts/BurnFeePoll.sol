pragma solidity ^0.5.0;
/**
* @title BurnFeePoll
* @author hypntortoise
* @notice Simple Vote Contract for DigixDAO participants to signal a proposed burn fee
*
*/
import "@openzeppelin-solidity/contracts/math/SafeMath.sol";

contract BurnFeePoll {
    using SafeMath for uint256;
    /**
    * State variables
    */
    address public owner = msg.sender;
    address constant DGD_Q_CONTRACT = address(0xD7a4f012Ead240691A98144Cb488e483aefeF724);

    enum VoteStatus { VOTED, CANCELLED }

    struct Vote {
        uint fee;
        VoteStatus status;
        uint64 votingRights;
    }

    uint256 startTime = now;

    // @notice lower/upper fee limit for the poll;
    uint lowerBoundFeePercent = 0;
    uint upperBoundFeePercent = 45;

    // @dev votes storage
    mapping(address => Vote) public votes;

    /**
    * Events
    */
    event VoteIssued(address voter, uint fee, uint votingRights);
    event VoteChanged(address voter, uint fee, uint votingRights);
    event VoteCancelled(address voter, uint votingRights);

    /**
    * @dev constructor
    */
    constructor() public {}

    /**
    * @dev issueVote(): instantiates a new vote
    * @param _fee voted fee
    */
    function issueVote (
        uint memory _fee
    )
    public
    beforeDeadline()
    hasValue()
    isQuarterParticipant()
    hasNotVoted()
    feeWithinRange()
    {
        votes[msg.sender] = Vote(_fee, VoteStatus.VOTED);
        emit VoteIssued(msg.sender, _fee, votes[msg.sender].votingRights);
    }

    /**
    * @dev changeVote(): modifiy existing vote
    * @param _fee changed fee
    */
    function changeVote(uint memory _fee)
    public
    beforeDeadline()
    hasValue()
    isQuarterParticipant()
    hasStatus(VoteStatus.VOTED)
    feeWithinRange()
    {
        vote[msg.sender].fee = _fee;
        emit VoteChanged(msg.sender, _fee, votes[msg.sender].votingRights);
    }

    /**
    * @dev cancelVote(): withdraw existing vote
    */
    function cancelVote()
    public
    beforeDeadline()
    isQuarterParticipant()
    hasStatus(VoteStatus.VOTED)
    {
        vote[msg.sender].status = VoteStatus.CANCELLED;
        emit VoteCancelled(msg.sender, votes[msg.sender].votingRights);
    }

    /**
    * @dev lockedDGDs(): get locked DGDs for participant
    */
    function lockedDGDs()
    private
    view
    returns (uint256 _lockedDgd)
    {
        bytes memory payload = abi.encodeWithSignature("readUserInfo(address)", msg.sender);
        (bool success, bytes memory returnData) = DGD_Q_CONTRACT.staticcall(payload);
        if (success) {
             _lockedDgd = returnData._lockedDgdStake;
        } else {
            _lockedDgd = 0;
        }
    }

    /**
    * Modifiers
    */
    modifier hasNotVoted() {
        require(vote[msg.sender]);
        _;
    }

    modifier beforeDeadline() {
        // @dev Voting deadline for the poll. No more vote changes alllowed after this.
        // @dev Hardcoded to: now + 90 days
        require(startTime + 90*days > now);
        _;
    }

    modifier hasValue() {
        require(msg.value > 0);
        _;
    }

    modifier feeWithinRange(uint _fee) {
        require(
            lowerBoundFeePercent <= _fee &&
            _fee <= upperBoundFeePercent
        );
        _;
    }

    modifier hasStatus(VoteStatus status) {
        require(votes[msg.sender].status == status);
        _;
    }

    modifier isQuarterParticipant() {
        bytes memory payload = abi.encodeWithSignature("isParticipant(address)", msg.sender);
        (bool success, bytes memory returnData) = DGD_Q_CONTRACT.staticcall(payload);
        require(returnData._is);
        _;
    }
}