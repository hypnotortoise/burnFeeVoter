pragma solidity ^0.5.0;
/**
* @title BurnFeePoll
* @author hypntortoise
* @notice Simple Vote Contract for DigixDAO participants to signal a proposed burn fee
*
*/
import "@openzeppelin-solidity/contracts/math/SafeMath.sol";

interface DigixDao {
    function isParticipant(address _user) external view returns (bool _is);
}

contract BurnFeePoll {
    using SafeMath for uint256;
    /**
    * State variables
    */
    address public owner = msg.sender;
    address daoAddress = 0x5d093A0e0328Ad17469b948De7f2DfD4b5eE5544;
    DigixDao digixDaoContract = DigixDao(daoAddress);

    enum VoteStatus { NOT_VOTED, VOTED, CANCELLED }

    struct Vote {
        uint fee;
        VoteStatus status;
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
    event VoteIssued(address voter, uint fee);
    event VoteChanged(address voter, uint fee);
    event VoteCancelled(address voter);
    event ParticipantStatus(address voter, bool status);

    /**
    * @dev constructor
    */
    constructor() public {}

    /**
    * @dev checkParticipant(): only for debugging purpose
    */
    function checkParticipant()
    public
    {
        bool isParticipant = digixDaoContract.isParticipant(msg.sender);
        emit ParticipantStatus(msg.sender, isParticipant);
    }

    /**
    * @dev issueVote(): instantiates a new vote
    * @param _fee voted fee
    */
    function issueVote (
        uint _fee
    )
    public
    beforeDeadline()
    isQuarterParticipant()
    hasStatus(VoteStatus.NOT_VOTED)
    feeWithinRange(_fee)
    {
        votes[msg.sender] = Vote(_fee, VoteStatus.VOTED);
        emit VoteIssued(msg.sender, _fee);
    }

    /**
    * @dev changeVote(): modifiy existing vote
    * @param _fee changed fee
    */
    function changeVote(uint _fee)
    public
    beforeDeadline()
    isQuarterParticipant()
    hasStatus(VoteStatus.VOTED)
    feeWithinRange(_fee)
    {
        votes[msg.sender].fee = _fee;
        emit VoteChanged(msg.sender, _fee);
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
        votes[msg.sender].status = VoteStatus.CANCELLED;
        emit VoteCancelled(msg.sender);
    }

    /**
    * Modifiers
    */
    modifier beforeDeadline() {
        // @dev Voting deadline for the poll. No more vote changes alllowed after this.
        // @dev Hardcoded to: now + 90 days
        require(startTime + now.mul(90 days) > now);
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
        require(digixDaoContract.isParticipant(msg.sender));
        _;
    }
}