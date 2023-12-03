// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SimpleCrowdLoanTerm.sol";
import "./interfaces/ISimpleCrowdLoanTerm.sol";

contract SimpleCrowdLoanTermFactory is Ownable {
    address public admin;
    ISimpleCrowdLoanTerm[] public loanTerms;

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
        SimpleCrowdLoanTerm loanTerm = new SimpleCrowdLoanTerm(
            _token,
            _targetAmount,
            _maturityPeriod,
            _interestRate,
            _borrower,
            ISimpleCrowdLoanTerm.LoanStatus.Created,
            admin
        );
        loanTerms.push(loanTerm);
    }

    function getLoanTerm(uint index) public view returns (ISimpleCrowdLoanTerm) {
        return loanTerms[index];
    }
}
