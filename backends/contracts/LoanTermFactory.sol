// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SimpleLoanTerm.sol";
import "./interfaces/ISimpleLoanTerm.sol";

contract LoanTermFactory is Ownable {
    address public admin;
    ISimpleLoanTerm[] public loanTerms;

    constructor() Ownable(msg.sender) {
        admin = msg.sender;
    }

    function createLoanTerm(
        address _token,
        uint256 _targetAmount,
        uint256 _maturityPeriod,
        uint8 _interestRate,
        address _borrower
    ) public {
        SimpleLoanTerm loanTerm = new SimpleLoanTerm(
            _token,
            _targetAmount,
            _maturityPeriod,
            _interestRate,
            _borrower,
            ISimpleLoanTerm.LoanStatus.Created,
            admin
        );
        loanTerms.push(loanTerm);
    }

    function getLoanTerm(uint index) public view returns (ISimpleLoanTerm) {
        return loanTerms[index];
    }
}
