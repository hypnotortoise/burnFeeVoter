pragma solidity ^0.5.0;
/**
* @title BurnFeePoll
* @author hypnotortoise
* @notice Simple Vote Contract for DigixDAO participants to signal a proposed burn fee
*
*/
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

interface DigixDaoInfo {
    function readUserInfo(address _user)
    external
    view
    returns
    (
        bool _isParticipant,
        bool _isModerator,
        uint256 _lastParticipatedQuarter,
        uint256 _lockedDgdStake,
        uint256 _lockedDgd,
        uint256 _reputationPoints,
        uint256 _quarterPoints
    );
    function isParticipant(address _user) external view returns (bool _is);
}

contract BurnFeePoll {
    using SafeMath for uint256;
    /**
    * State variables
    */
    address public owner = msg.sender;
    DigixDaoInfo digixDaoInfoContract;

    enum VoteStatus { NOT_VOTED, VOTED, CANCELLED }

    struct Vote {
        uint8 fee;
        VoteStatus status;
        uint256 lockedDgdStake;
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
    event VoteIssued(address voter, uint8 fee, uint256 lockedDgdStake);
    event VoteChanged(address voter, uint8 fee);
    event VoteCancelled(address voter);
    event ChangedInfoContract(address sender, address newInfoAddress);

    /**
    * @dev constructor
    */
    constructor() public {}

    /**
     * @dev setInfoContract(): update external DaoInformation contract location
     * @param _address new contract address
     */
    function setInfoContract(address _address)
    public
    isContractOwner()
    isDeployedContract(_address)
    {
        digixDaoInfoContract = DigixDaoInfo(_address);
        emit ChangedInfoContract(msg.sender, _address);
    }

    /**
    * @dev issueVote(): instantiates a new vote
    * @param _fee voted fee
    */
    function issueVote (uint8 _fee)
    public
    beforeDeadline()
    isQuarterParticipant()
    hasStatus(VoteStatus.NOT_VOTED)
    feeWithinRange(_fee)
    {
        (
            bool _isParticipant,
            bool _isModerator,
            uint256 _lastParticipatedQuarter,
            uint256 _lockedDgdStake,
            uint256 _lockedDgd,
            uint256 _reputationPoints,
            uint256 _quarterPoints
        ) = digixDaoInfoContract.readUserInfo(msg.sender);
        votes[msg.sender] = Vote(_fee, VoteStatus.VOTED, _lockedDgdStake);
        emit VoteIssued(msg.sender, _fee, _lockedDgdStake);
    }

    /**
    * @dev changeVote(): modifiy existing vote
    * @param _fee changed fee
    */
    function changeVote(uint8 _fee)
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
    modifier isDeployedContract(address _address) {
      uint32 size;
      assembly {
        size := extcodesize(_address)
      }
      require(size > 0);
      _;
    }

    modifier isContractOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier beforeDeadline() {
        // @dev Voting deadline for the poll. No more vote changes alllowed after this.
        // @dev Hardcoded to: now + 90 days
        require(startTime + now.mul(90 days) > now);
        _;
    }

    modifier feeWithinRange(uint8 _fee) {
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
        require(digixDaoInfoContract.isParticipant(msg.sender));
        _;
    }
}