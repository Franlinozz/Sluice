// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title FundingPool — a matching pool for quadratic / retroactive content funding.
/// The operator funds the pool with USDC, then sweeps the computed matches to a long tail of
/// creators in a SINGLE transaction. Sub-cent payouts in one sweep are the unlock: breadth of
/// support can be matched across thousands of small creators without a transaction per creator.
///
/// The quadratic matching math is computed off-chain (verifiably, from on-chain tips); this contract
/// is the trust-minimized payout rail. Amounts are atomic USDC (6dp).
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract FundingPool {
    address public immutable token;
    address public operator;
    uint256 public roundsSettled;

    event Funded(address indexed from, uint256 amount);
    event Payout(uint256 indexed round, address indexed creator, uint256 amount);
    event RoundDistributed(uint256 indexed round, uint256 total, uint256 recipients);
    event OperatorChanged(address indexed operator);

    modifier onlyOperator() {
        require(msg.sender == operator, "not operator");
        _;
    }

    constructor(address _token, address _operator) {
        require(_token != address(0) && _operator != address(0), "zero");
        token = _token;
        operator = _operator;
    }

    function setOperator(address a) external onlyOperator {
        require(a != address(0), "zero");
        operator = a;
        emit OperatorChanged(a);
    }

    /// @notice Add USDC to the matching pool (caller must approve this contract first).
    function fund(uint256 amount) external {
        require(amount > 0, "amount=0");
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "transferFrom failed");
        emit Funded(msg.sender, amount);
    }

    function balance() external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /// @notice Sweep matches to creators in one transaction. `round` tags the event log.
    function distribute(uint256 round, address[] calldata creators, uint256[] calldata amounts)
        external
        onlyOperator
    {
        require(creators.length == amounts.length && creators.length > 0, "bad input");
        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) total += amounts[i];
        require(IERC20(token).balanceOf(address(this)) >= total, "pool underfunded");

        for (uint256 i = 0; i < creators.length; i++) {
            require(creators[i] != address(0), "creator=0");
            if (amounts[i] == 0) continue;
            require(IERC20(token).transfer(creators[i], amounts[i]), "transfer failed");
            emit Payout(round, creators[i], amounts[i]);
        }
        roundsSettled += 1;
        emit RoundDistributed(round, total, creators.length);
    }
}
