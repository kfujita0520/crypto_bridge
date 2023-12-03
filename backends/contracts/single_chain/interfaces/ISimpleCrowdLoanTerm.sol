// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface ISimpleCrowdLoanTerm {

    enum LoanStatus {
        Created,  //initial term creation
        Activated,  //collateral is deposited
        Started, //lenders offered target amount and ready to borrow
        Redeemed, //borrower complete redemption of loan
        Completed, // all lender has collected their principal and eligible interest
        Cancelled, //loan was not executed and canceled
        Defaulted //borrower failed to repay either interest at every 4 weeks or principal at maturity date
    }

    struct NFT {
        address owner;
        uint256 tokenId;
    }

    event Lend(address indexed lender, uint256 amount);
    event TransferLoan(address indexed from, address indexed to, uint256 amount);
    event Withdrawn(address indexed lender, uint256 amount);
    event ClaimInterest(address indexed lender, uint256 amount);
    event ApproveLoanTerm();
    event CollectInterest(uint256 amount);
    event CollectPrincipal(uint256 amount);
    event DefaultLoan();
    event DepositCollateral(address indexed owner, uint256 tokenId);
    event StartLoan();
    event RedeemPrincipal(address indexed owner, uint256 tokenId);
    event WithdrawCollateral(address indexed owner, uint256 tokenId);
    event LiquidateCollateral(address indexed borrower, address nft_owner, uint256 nft_tokenId);


    function balanceOf(address account) external view returns (uint256);
    function accruedInterestPerToken() external view returns (uint256);
    function accruedInterest(address account) external view returns (uint256);
    function lend(uint256 amount) external;
    function loanTransferWithBalance(address beneficiary) external;
    function withdrawPrincipal(uint256 amount) external;
    function claimInterest() external;
    function approveLoanTerm() external;
    function collectInterests() external;
    function collectPrincipal() external;
    function liquidateCollateral() external;
    function depositNFTCollateral(address owner, uint256 tokenId) external;
    function startBorrowing() external;
    function redeemPrincipal() external;
    function withdrawCollateral() external;
}
