// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title RoyaltySplitter — fans out an ERC-20 (USDC) balance to collaborators by share.
/// One instance per multi-collaborator resource (immutable split). `distribute()` pays out the
/// contract's current token balance; the last payee absorbs any rounding dust. Anyone may call it.
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract RoyaltySplitter {
    address public immutable token;
    address[] public payees;
    uint256[] public shares;
    uint256 public totalShares;

    event PayeeAdded(address indexed payee, uint256 shares);
    event Paid(address indexed payee, uint256 amount);
    event Distributed(uint256 total);

    constructor(address _token, address[] memory _payees, uint256[] memory _shares) {
        require(_token != address(0), "token=0");
        require(_payees.length == _shares.length && _payees.length > 0, "bad input");
        token = _token;
        for (uint256 i = 0; i < _payees.length; i++) {
            require(_payees[i] != address(0) && _shares[i] > 0, "bad payee");
            payees.push(_payees[i]);
            shares.push(_shares[i]);
            totalShares += _shares[i];
            emit PayeeAdded(_payees[i], _shares[i]);
        }
    }

    /// @notice Distribute the contract's full token balance to payees by share.
    function distribute() external {
        uint256 bal = IERC20(token).balanceOf(address(this));
        require(bal > 0, "nothing to distribute");
        uint256 sent;
        uint256 n = payees.length;
        for (uint256 i = 0; i < n; i++) {
            uint256 amt = i == n - 1 ? bal - sent : (bal * shares[i]) / totalShares;
            sent += amt;
            require(IERC20(token).transfer(payees[i], amt), "transfer failed");
            emit Paid(payees[i], amt);
        }
        emit Distributed(bal);
    }

    function payeesCount() external view returns (uint256) {
        return payees.length;
    }

    function splitOf(uint256 i) external view returns (address payee, uint256 share) {
        return (payees[i], shares[i]);
    }
}
