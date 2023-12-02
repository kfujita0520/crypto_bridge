// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

//import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/ISimpleP2PLoanTerm.sol";
import "hardhat/console.sol";


//At First, create simple crowd loan Term. This contract does not support advanced scenario such as partial refund etc.
//i.e. borrower always needs to refund in full. This will be taken care another contract or to be enhanced
//TODO must implement {IERC721Receiver-onERC721Received} to accept collateral NFT
//TODO implement cancel function
//TODO write test case script
contract SimpleP2PLoanTerm is ISimpleP2PLoanTerm
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

    uint256 public initiatedTime; //TO be set when starting the loan. unchange once it is set for the record purpose.
    uint256 public maturityTime; //To be set when starting the loan
    uint256 public lastCheckTime; //the last time interest amount is calculated. this is updated when redeemed principal in part or full.

    uint256 public totalAmount;//the total amount borrower would like to borrow
    uint256 public redeemedAmount;
    uint256 public paidInterest;//paid interest by borrower
    uint256 public principal;//amount of loan the lender offers
    uint256 public claimedPrincipal;
    uint256 public claimedInterest;//claimed interest amount of the lender
    uint256 public lastCheckAccruedInterest;//claimed interest amount of the lender. this is updated when redeemed principal in part or full.

    address public borrower;//the account of borrower
    address public lender;//the account of lender
    address public admin;//the account of platform admin
    LoanStatus public status;
    NFT public collateral;//TODO currently only support one NFT collateral. this can be more flexible by making it as array.

    /* ========== CONSTRUCTOR ========== */


    constructor(
        address _token,
        uint256 _totalAmount,
        uint256 _maturityPeriod,
        uint8 _interestRate,
        address _borrower,
        address _lender,
        address _admin,
        LoanStatus _status
    ) {
        require(_totalAmount > 0, "amount of loan should be positive");
        token = IERC20Metadata(_token);
        totalAmount = _totalAmount;
        maturityPeriod = _maturityPeriod;
        interestRate = _interestRate;
        borrower = _borrower;
        lender = _lender;
        admin = _admin;
        status = _status;
        redeemedAmount = 0;
        paidInterest = 0;
        principal = 0;
        claimedInterest = 0;
        lastCheckAccruedInterest = 0;
    }

    /* ========== VIEWS ========== */

    function currentPrincipal() public view override returns (uint256) {
        return totalAmount - redeemedAmount;
    }

    function accruedInterest() public view override returns (uint256) {
        uint256 latestTime = Math.min(maturityTime, block.timestamp);
        return ((latestTime - lastCheckTime) / SECONDS_IN_A_YEAR) * (interestRate / DENOMINATOR)
            * currentPrincipal() + lastCheckAccruedInterest;
    }

    function claimableInterest() public view override returns (uint256) {
        return accruedInterest() - claimedInterest;
    }

    function withdrawablePrincipal() public view override returns (uint256) {
        return redeemedAmount - claimedPrincipal;
    }


    /* ========== Lender FUNCTIONS ========== */
    function lend() external override onlyLender(msg.sender)
    {
        require(status == LoanStatus.Activated, "cannot loan in current status");

        token.safeTransferFrom(msg.sender, address(this), totalAmount);
        principal = totalAmount;
        emit Lend(msg.sender, principal);
    }


    function loanTransfer(address beneficiary) external onlyLender(msg.sender)  {
        lender = beneficiary;
        emit TransferLoan(msg.sender, beneficiary);
    }

    //This is called during the working status when partial redeem is happen or redeemed status when principal is fully redeemed
    function withdrawPrincipal() public override onlyLender(msg.sender)
    {
        //TODO when withdraw Principal make sure all eligible interest for that lender should also claim back altogether
        //TODO in case borrower did not paid back in full, only proportional amount of principal should be withdrawable
        require(status == LoanStatus.Started || status == LoanStatus.Redeemed, "Not the status lender can withdraw own princiapl");
        claimInterest(); //TODO fix some implementaiton to be called internally
        uint256 amount = withdrawablePrincipal();
        token.safeTransfer(msg.sender, amount);
        claimedPrincipal += amount;
        emit Withdrawn(msg.sender, amount);
        if(currentPrincipal() == 0 && collateral.owner == address(0)) {
            status = LoanStatus.Completed;
        }

    }

    function claimInterest() public override onlyLender(msg.sender)
    {
        //TODO in case defaulted, the behavior should be different
        require (status == LoanStatus.Started || status == LoanStatus.Redeemed, "Not the status user can claim the interest");
        uint256 claimableAmount = claimableInterest();
        if (claimableAmount > 0) {
            claimedInterest += claimableAmount;
            //TODO make it default if cannot collect interest
            try token.transferFrom(borrower, msg.sender, claimableAmount) {//directly take interest from borrower's wallet.
                emit CollectInterest(claimableAmount);
            } catch {
                status = LoanStatus.Defaulted;
                emit DefaultLoan();
            }
            emit ClaimInterest(msg.sender, claimableAmount);
        }
    }

    function approveLoanTerm() external onlyLender(msg.sender) {
        require(status == LoanStatus.Created, "already approved");
        status = LoanStatus.Activated;
        emit ApproveLoanTerm();
    }


    //this function can be called only after maturity date
    function claimPrincipal() external onlyLender(msg.sender) {
        require(block.timestamp > maturityTime, "Maturity date is not yet come so cannot collect");

        // withdraw redeemed redeemedAmount. interest collection is also done within following function
        withdrawPrincipal();

        // usually after withdrawPrincipal, you will withdraw all money redeemed by borrwer to loan term contract
        //Following logic will be executed when borrower did not redeem all principal even after maturity date.
        //
        if(totalAmount - redeemedAmount > 0) {//after maturity date, still not all amount is redeemed
            uint256 amount = totalAmount - claimedPrincipal;
            try token.transferFrom(borrower, msg.sender, amount) {
                emit CollectPrincipal(amount);
            } catch {
                status = LoanStatus.Defaulted;
                emit DefaultLoan();
            }
        }

    }


    /* ========== Borrower FUNCTIONS ========== */
    function depositNFTCollateral(address owner, uint256 tokenId) external onlyBorrower(msg.sender) {
        require(collateral.owner == address(0), "collateral is already deposited");
        IERC721(owner).transferFrom(msg.sender, address(this), tokenId);
        collateral.owner = owner;
        collateral.tokenId = tokenId;
        emit DepositCollateral(owner, tokenId);
    }

    function cancelBorrowing() external onlyBorrower(msg.sender) {
        require(status == LoanStatus.Activated, "not the status borrower can cancel");
        //TODO: return the money to lender and withdraw collateral
        emit CancelLoan();

    }

    function startBorrowing() external onlyBorrower(msg.sender) {
        require(status == LoanStatus.Activated, "not the status borrower can start");
        initiatedTime = block.timestamp;
        maturityTime = block.timestamp + maturityPeriod;
        lastCheckTime = initiatedTime;
        status = LoanStatus.Started;
        emit StartLoan();
    }


    function redeemFullPrincipal() external onlyBorrower(msg.sender) {
        require(status == LoanStatus.Started, "loan term has not started yet");
        uint256 amount = currentPrincipal();
        token.transferFrom(msg.sender, address(this), amount);
        _checkAccruedInterest(); //need to execute this before redeemedAmount is updated. because currentPrincipal() will be changed.
        redeemedAmount += amount;
        status = LoanStatus.Redeemed;
        if(block.timestamp < maturityTime) {
            maturityTime = block.timestamp; //early redemption so stop interest accruing at this momement
        }
        emit RedeemPrincipal(msg.sender, amount);

        _withdrawCollateral();
    }

    function redeemPartialPrincipal(uint256 amount) external onlyBorrower(msg.sender) {
        require(status == LoanStatus.Started, "loan term has not started yet");
        require(amount < currentPrincipal(), "amount should be less than principal");
        token.transferFrom(msg.sender, address(this), amount);
        _checkAccruedInterest(); //need to execute this before redeemedAmount is updated. because currentPrincipal() will be changed.
        redeemedAmount += amount;
        emit RedeemPrincipal(msg.sender, totalAmount);

    }

    function _checkAccruedInterest() internal {
        lastCheckTime = block.timestamp;
        lastCheckAccruedInterest = accruedInterest();
    }

    function withdrawCollateral() external onlyBorrower(msg.sender) {
        _withdrawCollateral();
    }

    function _withdrawCollateral() internal {
        require(status == LoanStatus.Redeemed, "loan is not redeemed yet");
        IERC721(collateral.owner).safeTransferFrom(address(this), borrower, collateral.tokenId);
        collateral.owner = address(0);
        status = LoanStatus.Completed;
        emit WithdrawCollateral(collateral.owner, collateral.tokenId);
    }

    /* ========== Admin FUNCTIONS ========== */
    function liquidateCollateral() external onlyAdmin(msg.sender) {
        require(status == LoanStatus.Defaulted, "The loan is not default");

        //TODO: implementation for selling off and distribution
        emit LiquidateCollateral(borrower, collateral.owner, collateral.tokenId);
    }

    /* ========== MODIFIERS ========== */
    modifier onlyBorrower(address user) {
        require(msg.sender == borrower, "not borrower");
        _;
    }

    modifier onlyLender(address user) {
        require(msg.sender == lender, "not lender");
        _;
    }

    modifier onlyAdmin(address user) {
        require(msg.sender == admin, "not admin");
        _;
    }

}
