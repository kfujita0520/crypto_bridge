// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ICrowdLoanTerm.sol";

interface ICrowdLoanTermFactory {
    struct MasterTerm {
        uint64 chainSelector;
        address loanTerm;
    }

    //TODO create ICCIPHandler and inherit it, rather than declare PayFeeIn again here.
    enum PayFeesIn {
        Native,
        LINK
    }

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

    function getLoanTerm(uint index) external view returns (ICrowdLoanTerm);

    function activateLoanTermRequest(
        uint64 destinationChainSelector,
        address _token,
        uint256 _targetAmount,
        uint256 _maturityPeriod,
        uint8 _interestRate,
        address _borrower,
        PayFeesIn payFeesIn
    ) external payable;

    function notifyRedemptionRequest(
        PayFeesIn payFeesIn
    ) external payable;
}
