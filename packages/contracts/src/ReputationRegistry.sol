// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ReputationRegistry — minimal ERC-8004 Reputation Registry.
/// Clients leave on-chain feedback (1..5) on a registered agent. Aggregates are kept so a reader
/// can compute an average without replaying events. Validated against the IdentityRegistry so
/// feedback can only target a real agentId. Reference implementation — kept deliberately small.
interface IIdentityRegistry {
    function exists(uint256 id) external view returns (bool);
}

contract ReputationRegistry {
    IIdentityRegistry public immutable identity;

    struct Feedback {
        address from;
        uint8 score; // 1..5
        string uri; // optional evidence/context
        uint64 at;
    }

    mapping(uint256 => Feedback[]) private _feedback; // agentId => feedback log
    mapping(uint256 => uint256) public scoreSum;
    mapping(uint256 => uint256) public scoreCount;

    event FeedbackGiven(uint256 indexed agentId, address indexed from, uint8 score, string uri);

    constructor(address _identity) {
        require(_identity != address(0), "identity=0");
        identity = IIdentityRegistry(_identity);
    }

    /// @notice Leave feedback (1..5) on a registered agent.
    function giveFeedback(uint256 agentId, uint8 score, string calldata uri) external {
        require(identity.exists(agentId), "unknown agent");
        require(score >= 1 && score <= 5, "score 1..5");
        _feedback[agentId].push(Feedback(msg.sender, score, uri, uint64(block.timestamp)));
        scoreSum[agentId] += score;
        scoreCount[agentId] += 1;
        emit FeedbackGiven(agentId, msg.sender, score, uri);
    }

    /// @notice Average score scaled by 100 (e.g. 480 = 4.80). 0 if no feedback.
    function averageScoreX100(uint256 agentId) external view returns (uint256) {
        uint256 c = scoreCount[agentId];
        if (c == 0) return 0;
        return (scoreSum[agentId] * 100) / c;
    }

    function feedbackCount(uint256 agentId) external view returns (uint256) {
        return _feedback[agentId].length;
    }

    function feedbackAt(uint256 agentId, uint256 i)
        external
        view
        returns (address from, uint8 score, string memory uri, uint64 at)
    {
        Feedback storage f = _feedback[agentId][i];
        return (f.from, f.score, f.uri, f.at);
    }
}
