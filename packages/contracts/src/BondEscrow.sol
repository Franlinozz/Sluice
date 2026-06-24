// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title BondEscrow — reputation backed by capital at risk.
/// A provider (or its broker) posts a USDC bond guaranteeing delivery for a specific match. If the
/// provider delivers, the bond is RELEASED back to whoever posted it. If the provider underdelivers,
/// the arbiter SLASHES the bond to the harmed beneficiary (validated, semi-manual resolution). The
/// per-provider running totals (bonded / active / slashed / released) ARE the on-chain reputation:
/// reliability you can read as money, not a star rating you have to trust.
///
/// USDC on Arc is 6dp; all amounts here are atomic USDC (e.g. 50_000 = 0.05 USDC).
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract BondEscrow {
    address public immutable token; // Arc USDC
    address public arbiter; // resolves disputes (the platform / validator)

    enum Status {
        None,
        Active,
        Released,
        Slashed
    }

    struct Bond {
        address broker; // posts + funds the bond; receives it back on release
        address provider; // the agent whose delivery is guaranteed
        address beneficiary; // paid if the provider is slashed (the harmed buyer)
        uint256 amount;
        Status status;
        uint64 createdAt;
        uint64 resolvedAt;
        string reason; // resolution reason (release/slash)
    }

    mapping(bytes32 => Bond) public bonds; // matchId => bond

    // Per-provider reputation = capital at risk + slash history (read straight off-chain).
    mapping(address => uint256) public bondedTotal;
    mapping(address => uint256) public activeStake;
    mapping(address => uint256) public slashedTotal;
    mapping(address => uint256) public releasedTotal;
    mapping(address => uint256) public matchCount;
    mapping(address => uint256) public slashCount;

    event BondPosted(
        bytes32 indexed matchId,
        address indexed broker,
        address indexed provider,
        address beneficiary,
        uint256 amount
    );
    event BondReleased(bytes32 indexed matchId, address indexed provider, uint256 amount, string reason);
    event BondSlashed(
        bytes32 indexed matchId,
        address indexed provider,
        address beneficiary,
        uint256 amount,
        string reason
    );
    event ArbiterChanged(address indexed arbiter);

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "not arbiter");
        _;
    }

    constructor(address _token, address _arbiter) {
        require(_token != address(0) && _arbiter != address(0), "zero");
        token = _token;
        arbiter = _arbiter;
    }

    function setArbiter(address a) external onlyArbiter {
        require(a != address(0), "zero");
        arbiter = a;
        emit ArbiterChanged(a);
    }

    /// @notice Post a bond for a match. Caller (broker) must approve this contract for `amount` first.
    function postBond(bytes32 matchId, address provider, address beneficiary, uint256 amount) external {
        require(bonds[matchId].status == Status.None, "match exists");
        require(provider != address(0) && beneficiary != address(0) && amount > 0, "bad args");
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "transferFrom failed");
        bonds[matchId] = Bond({
            broker: msg.sender,
            provider: provider,
            beneficiary: beneficiary,
            amount: amount,
            status: Status.Active,
            createdAt: uint64(block.timestamp),
            resolvedAt: 0,
            reason: ""
        });
        bondedTotal[provider] += amount;
        activeStake[provider] += amount;
        matchCount[provider] += 1;
        emit BondPosted(matchId, msg.sender, provider, beneficiary, amount);
    }

    /// @notice Successful delivery — return the bond to the broker. Arbiter or the broker may call.
    function release(bytes32 matchId, string calldata reason) external {
        Bond storage b = bonds[matchId];
        require(b.status == Status.Active, "not active");
        require(msg.sender == arbiter || msg.sender == b.broker, "not authorized");
        b.status = Status.Released;
        b.resolvedAt = uint64(block.timestamp);
        b.reason = reason;
        activeStake[b.provider] -= b.amount;
        releasedTotal[b.provider] += b.amount;
        require(IERC20(token).transfer(b.broker, b.amount), "transfer failed");
        emit BondReleased(matchId, b.provider, b.amount, reason);
    }

    /// @notice Underdelivery — slash the bond to the beneficiary. Arbiter only (validated).
    function slash(bytes32 matchId, string calldata reason) external onlyArbiter {
        Bond storage b = bonds[matchId];
        require(b.status == Status.Active, "not active");
        b.status = Status.Slashed;
        b.resolvedAt = uint64(block.timestamp);
        b.reason = reason;
        activeStake[b.provider] -= b.amount;
        slashedTotal[b.provider] += b.amount;
        slashCount[b.provider] += 1;
        require(IERC20(token).transfer(b.beneficiary, b.amount), "transfer failed");
        emit BondSlashed(matchId, b.provider, b.beneficiary, b.amount, reason);
    }

    function getBond(bytes32 matchId) external view returns (Bond memory) {
        return bonds[matchId];
    }

    /// @notice Provider's on-chain reputation snapshot.
    function reputation(address provider)
        external
        view
        returns (
            uint256 bonded,
            uint256 active,
            uint256 slashed,
            uint256 released,
            uint256 matches,
            uint256 slashes
        )
    {
        return (
            bondedTotal[provider],
            activeStake[provider],
            slashedTotal[provider],
            releasedTotal[provider],
            matchCount[provider],
            slashCount[provider]
        );
    }
}
