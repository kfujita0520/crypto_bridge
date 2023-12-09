// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IP2PLoanTerm.sol";
import "./ICCIPHandler.sol";

interface IP2PLoanTermFactory is ICCIPHandler {

    struct MasterTerm {
        uint64 chainSelector;
        address loanTerm;
    }

    event CreateP2PLoanTerm(
        address indexed token,
        uint256 totalAmount,
        uint256 maturityPeriod,
        uint64 interestRate,
        address indexed borrower,
        address indexed lender,
        address admin
    );

    function createLoanTerm(
        address token,
        uint256 totalAmount,
        uint256 maturityPeriod,
        uint64 interestRate,
        address borrower,
        address lender,
        PayFeesIn _payFeesIn,
        uint64 executionChainSelector
    ) external returns(uint index);

    function getP2PLoanTerm(uint index) external view returns (address);

    function activateLoanTermRequest(
        address token,
        uint256 totalAmount,
        uint256 maturityPeriod,
        uint64 interestRate,
        address borrower,
        address lender,
        PayFeesIn payFeesIn
    ) external payable;

    function notifyRedemptionRequest(
        PayFeesIn payFeesIn
    ) external payable;

    function liquidateCollateralRequest(
        PayFeesIn payFeesIn
    ) external payable;
}
