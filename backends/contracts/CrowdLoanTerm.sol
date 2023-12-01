// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

//import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ICrowdLoanTerm.sol";
import "./interfaces/ICrowdLoanTermFactory.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import "hardhat/console.sol";


//At First, create Crowd Loan Term. This contract does not support advanced scenario such as partial refund etc.
//i.e. borrower always needs to refund in full. This will be taken care another contract or to be enhanced
//TODO must implement {IERC721Receiver-onERC721Received} to accept collateral NFT
contract CrowdLoanTerm is ICrowdLoanTerm, ReentrancyGuard
{
    using SafeERC20 for IERC20Metadata;

    uint256 public constant SECONDS_IN_A_HOUR = 3600;
    uint256 public constant SECONDS_IN_A_DAY = 86400;
    uint256 public constant SECONDS_IN_A_WEEK = 604800;
    uint256 public constant SECONDS_IN_A_YEAR = 31449600;
    uint256 public constant DENOMINATOR = 10000;


    /* ========== STATE VARIABLES ========== */
    IERC20Metadata public token;//loan token
    uint8 public interestRate;// 0 - 10000
    uint256 public maturityPeriod;

    uint256 public initiatedTime; //TO be set when starting the loan
    uint256 public maturityTime; //To be set when starting the loan

    uint256 public targetAmount;//the target amount borrower would like to raise
    uint256 public totalOffer;//the amount of loan offered by all lenders.
    uint256 public paidInterest;//paid interest by borrower
    mapping(address => uint256) public balances;//amount of loan each lender offers
    mapping(address => uint256) public claimedInterest;//claimed interest amount of each lender

    address public borrower;//the account of borrower
    address public admin;//the account of platform admin
    LoanStatus public status;
    NFT public collateral;//TODO currently only support one NFT collateral. this can be more flexible.

    address factory;
    uint64 masterChainSelector;
    address masterChainAddress;
    uint64 executionChainSelector;

    /* ========== CONSTRUCTOR ========== */


    constructor(
        address _token,
        uint256 _targetAmount,
        uint256 _maturityPeriod,
        uint8 _interestRate,
        address _borrower,
        LoanStatus _status,
        address _admin,
        address _factory,
        uint64 _masterChainSelector,
        uint64 _executionChainSelector,
        address _masterChainAddress //address(0) if this instance is master contract
    ) {
        require(_targetAmount > 0, "amount of loan should be positive");
        token = IERC20Metadata(_token);
        targetAmount = _targetAmount;
        maturityPeriod = _maturityPeriod;
        interestRate = _interestRate;
        borrower = _borrower;
        status = _status;
        totalOffer = 0;
        admin = _admin;
        factory = _factory;
        masterChainSelector = _masterChainSelector;
        executionChainSelector = _executionChainSelector;
        masterChainAddress = _masterChainAddress;
    }

    /* ========== VIEWS ========== */

    function balanceOf(address account) external view override returns (uint256) {
        return balances[account];
    }

    function accruedInterestPerToken() public view override returns (uint256) {
        return ((block.timestamp - initiatedTime) / SECONDS_IN_A_YEAR) * (interestRate / DENOMINATOR)
            * (10 ^ token.decimals());
    }

    function accruedInterest(address account) public view override returns (uint256) {
        return balances[account] * accruedInterestPerToken() - claimedInterest[account];
    }


    /* ========== Lender FUNCTIONS ========== */
    function lend(uint256 amount) external override
    nonReentrant
    {
        require(amount > 0, "Cannot lend 0");
        require(status == LoanStatus.Activated, "cannot loan in current status");
        require(targetAmount - totalOffer >= amount, "target amount has been reached");
        totalOffer += amount;
        balances[msg.sender] += amount;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Lend(msg.sender, amount);
    }

    //TODO partial transfer should be possible.
    function loanTransferWithBalance(address beneficiary) external nonReentrant  {
        uint256 amount = balances[msg.sender];
        balances[beneficiary] += amount;
        balances[msg.sender] = 0;
        claimedInterest[beneficiary] += claimedInterest[msg.sender];
        claimedInterest[msg.sender] = 0;
        emit TransferLoan(msg.sender, beneficiary, amount);
    }

    function withdrawPrincipal(uint256 amount) public override
    nonReentrant
    {
        require(block.timestamp > maturityTime, "Maturity date is not yet come so cannot withdraw");
        require(amount > 0, "Cannot withdraw 0");
        //TODO when withdraw Principal make sure all eligible interest for that lender should also claim back altogether
        //TODO in case borrower did not paid back in full, only proportional amount of principal should be withdrawable

        totalOffer -= amount;
        balances[msg.sender] -= amount;
        token.safeTransfer(msg.sender, amount);
        if(totalOffer == 0 && collateral.owner == address(0)) {
            status = LoanStatus.Completed;
        }
        emit Withdrawn(msg.sender, amount);

    }

    function claimInterest() public override nonReentrant
    {
        //TODO in case defaulted, the behavior should be different
        uint256 claimableInterest = accruedInterest(msg.sender);
        if (claimableInterest > 0) {
            claimedInterest[msg.sender] += claimableInterest;
            token.safeTransfer(msg.sender, claimableInterest);
            emit ClaimInterest(msg.sender, claimableInterest);
        }
    }


    /* ========== Admin FUNCTIONS ========== */
    //function is payable in case send cross chain message with native token fee
    function approveLoanTerm(ICrowdLoanTermFactory.PayFeesIn payFeesIn) external onlyAdmin(msg.sender) payable {
        require(status == LoanStatus.Created, "already approved");
        status = LoanStatus.Activated;

        if(masterChainAddress != address(0)) { //in case execution chain is different
            ICrowdLoanTermFactory(factory).activateLoanTermRequest(masterChainSelector,
                address(token), targetAmount, maturityPeriod, interestRate, borrower, payFeesIn);
            status = LoanStatus.Delegated;
        }
        emit ApproveLoanTerm();
    }

    //borrower needs to make a payment for 4 weeks interest in advance. lender can only claim eligible amount at the time.
    function collectInterests() external onlyAdmin(msg.sender) {
        uint256 timestamp = block.timestamp + 4 * SECONDS_IN_A_WEEK;
        uint256 interestAmountPerToken = ((timestamp - initiatedTime) / SECONDS_IN_A_YEAR) * (interestRate / DENOMINATOR)
            * (10 ^ token.decimals());
        uint256 amount = interestAmountPerToken * totalOffer - paidInterest;
        try token.transferFrom(borrower, address(this), amount) {
            paidInterest += amount;
            emit CollectInterest(amount);
        } catch {
            status = LoanStatus.Defaulted;
            emit DefaultLoan();
        }
    }

    function collectPrincipal() external onlyAdmin(msg.sender) {
        require(block.timestamp > maturityTime, "Maturity date is not yet come so cannot collect");

        try token.transferFrom(borrower, address(this), totalOffer) {
            emit CollectPrincipal(totalOffer);
        } catch {
            status = LoanStatus.Defaulted;
            emit DefaultLoan();
        }
    }

    function liquidateCollateral() external onlyAdmin(msg.sender) {
        require(status == LoanStatus.Defaulted, "The loan is not default");

        //TODO: implementation and distribution
        emit LiquidateCollateral(borrower, collateral.owner, collateral.tokenId);
    }

    /* ========== Borrower FUNCTIONS ========== */
    function depositNFTCollateral(address owner, uint256 tokenId) external onlyBorrower(msg.sender) {
        require(collateral.owner == address(0), "collateral is already deposited");
        IERC721(owner).transferFrom(msg.sender, address(this), tokenId);
        collateral.owner = owner;
        collateral.tokenId = tokenId;
        emit DepositCollateral(owner, tokenId);
    }

    function startBorrowing() external onlyBorrower(msg.sender) {
        require(status == LoanStatus.Activated, "not the status borrower can start");
        maturityTime = block.timestamp + maturityPeriod;
        status = LoanStatus.Activated;
        emit StartLoan();
    }

    function redeemPrincipal(ICrowdLoanTermFactory.PayFeesIn payFeesIn) external onlyBorrower(msg.sender) payable {
        require(status == LoanStatus.Started, "loan term is not working status");
        token.transferFrom(msg.sender, address(this), totalOffer);
        status = LoanStatus.Redeemed;
        if(masterChainAddress != address(0)) { //in case execution chain is different
            ICrowdLoanTermFactory(factory).notifyRedemptionRequest(payFeesIn);
        }
        emit RedeemPrincipal(msg.sender, totalOffer);
    }

    function withdrawCollateral() external onlyBorrower(msg.sender) {
        require(status == LoanStatus.Redeemed, "loan is not redeemed yet");
        IERC721(collateral.owner).safeTransferFrom(address(this), msg.sender, collateral.tokenId);
        collateral.owner = address(0);
        if (totalOffer == 0) {
            status = LoanStatus.Completed;
        }
        emit WithdrawCollateral(collateral.owner, collateral.tokenId);
    }


    /* ========== MODIFIERS ========== */
    modifier onlyBorrower(address user) {
        require(msg.sender == borrower, "not borrower");
        _;
    }

    modifier onlyAdmin(address user) {
        require(msg.sender == admin, "not admin");
        _;
    }

}
