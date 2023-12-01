// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./CrowdLoanTerm.sol";
import "./interfaces/ICrowdLoanTerm.sol";
import "./interfaces/ICrowdLoanTermFactory.sol";
import "./CCIPHandler.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract CrowdLoanTermFactory is CCIPHandler {

    struct MasterTerm {
        uint64 chainSelector;
        address loanTerm;
    }

    address public admin;
    uint64 public chainSelector;
    ICrowdLoanTerm[] public loanTerms;
    //execution contract address => master contract address
    //the element will be added when activateLoanTerm cross chain function is executed.
    mapping(address => MasterTerm) masterTerms;

    event MessageSent(bytes32 messageId);
    event MessageReceived(bytes32 messageId, uint64 sourceChainSelector, address sender, bytes data);

    constructor(address router, address link, uint64 _chainSelector) CCIPHandler(router, link) {
        admin = msg.sender;
        chainSelector = _chainSelector;
    }

    function createLoanTerm(
        address _token,
        uint256 _targetAmount,
        uint256 _maturityPeriod,
        uint8 _interestRate,
        address _borrower,
        uint64 executionChainSelector
    ) public {
        CrowdLoanTerm loanTerm = new CrowdLoanTerm(
            _token,
            _targetAmount,
            _maturityPeriod,
            _interestRate,
            _borrower,
            ICrowdLoanTerm.LoanStatus.Created,
            admin,
            address(this),
            chainSelector,
            executionChainSelector,
            address(0)
        );
        loanTerms.push(loanTerm);
    }

    function getLoanTerm(uint index) public view returns (ICrowdLoanTerm) {
        return loanTerms[index];
    }

    function activateLoanTermRequest(
        uint64 destinationChainSelector,
        address _token,
        uint256 _targetAmount,
        uint256 _maturityPeriod,
        uint8 _interestRate,
        address _borrower,
        PayFeesIn payFeesIn
    ) public payable {

        address receiver = sourceSender[destinationChainSelector];
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver), //receiver should be Factory contract on destination chain?
            data: abi.encodeWithSignature("activateLoanTerm(address,uint256,uint256,uint8,address,uint64,address)",
                    _token,//assuming token is the same address across chain. if not the case, Factory contract should prepare the mapping table
                    _targetAmount,
                    _maturityPeriod,
                    _interestRate,
                    _borrower,
                    chainSelector,
                    msg.sender
                ),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: payFeesIn == PayFeesIn.LINK ? i_link : address(0)
        });

        bytes32 messageId = _ccipSend(destinationChainSelector, message);

        emit MessageSent(messageId);
    }

    function notifyRedemptionRequest(
        PayFeesIn payFeesIn
    ) public payable {

        MasterTerm memory masterTerm = masterTerms[msg.sender];
        uint64 destinationChainSelector = masterTerm.chainSelector;
        address receiver = sourceSender[destinationChainSelector];

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver), //receiver should be Factory contract on destination chain
            data: abi.encodeWithSignature("notifyRedemption(address)", masterTerm.loanTerm),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: payFeesIn == PayFeesIn.LINK ? i_link : address(0)
        });

        bytes32 messageId = _ccipSend(destinationChainSelector, message);

        emit MessageSent(messageId);
    }

    //This function is called for both activateLoanTerm and ReleaseCollateral
    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        address srcSender = abi.decode(message.sender, (address));

        (bool success,) = address(this).call(message.data);
        require(success);
        emit MessageReceived(message.messageId, message.sourceChainSelector, srcSender, message.data);
    }

    // this is internal function to be called from _ccipReceive
    function activateLoanTerm(
        address _token,
        uint256 _targetAmount,
        uint256 _maturityPeriod,
        uint8 _interestRate,
        address _borrower,
        uint64 _masterChainSelector,
        address _masterAddress
    )  internal  {


        CrowdLoanTerm loanTerm = new CrowdLoanTerm(
            _token,
            _targetAmount,
            _maturityPeriod,
            _interestRate,
            _borrower,
            ICrowdLoanTerm.LoanStatus.Activated,
            admin,
            address(this),
            _masterChainSelector,
            chainSelector,
            _masterAddress
        );
        loanTerms.push(loanTerm);


        MasterTerm memory newMasterTerm = MasterTerm({
            chainSelector: _masterChainSelector,
            loanTerm: _masterAddress
        });
        masterTerms[address(loanTerm)] = newMasterTerm;

    }

    function notifyRedemption(
        address _loanTerm
    )  internal  {
        //TODO: think about any other validation is require to verify this comes from correct LoanTerm contract
        //TODO: right now rely on the validation on source chain side if message destination is correct one or not.
        //call withdrawCollateral function of CrowdLoanTerm contract
        //but original function is borrowerOnly so that may need to implement it or change it to accept from factory as well
        //also NFT should be sent to borrower address rather than msg.sender for this case.
        ICrowdLoanTerm(_loanTerm).withdrawCollateral();

    }

}
