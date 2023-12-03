// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ISimpleCrowdLoanTerm.sol";

interface ISimpleCrowdLoanTermFactory {


    event MessageSent(bytes32 messageId);
    event MessageReceived(bytes32 messageId, uint64 sourceChainSelector, address sender, bytes data);

    function createLoanTerm(
        address _token,
        uint256 _targetAmount,
        uint256 _maturityPeriod,
        uint8 _interestRate,
        address _borrower,
        uint64 _executionChainSelector
    ) external;

    function getLoanTerm(uint index) external view returns (ISimpleCrowdLoanTerm);

}
