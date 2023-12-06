// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./P2PLoanTerm.sol";
import "./interfaces/IP2PLoanTerm.sol";
import "./interfaces/IP2PLoanTermFactory.sol";
import "./CCIPHandler.sol";


contract P2PLoanTermFactory is CCIPHandler, IP2PLoanTermFactory {

    address public admin;
    uint64 public chainSelector;
    IP2PLoanTerm[] public loanTerms;
    //execution loan term contract address => master contract address
    //the element will be added when activateLoanTerm cross chain function is executed.
    mapping(address => MasterTerm) masterTerms;
    //master loan term contract address => execution chain selector.
    mapping(address => uint64) executionChains;

    constructor(address _router, address _link, uint64 _chainSelector) CCIPHandler(_router, _link) {
        admin = msg.sender;
        chainSelector = _chainSelector;
    }

    function createLoanTerm(
        address _token,
        uint256 _totalAmount,
        uint256 _maturityPeriod,
        uint64 _interestRate,
        address _borrower,
        address _lender,
        PayFeesIn _payFeesIn,
        uint64 _executionChainSelector
    ) public returns(uint index){

        bool isCrossChain = (_executionChainSelector != chainSelector);
        P2PLoanTerm loanTerm = new P2PLoanTerm(
            _token,//if isCrossChain = true, token address should be the one on execution chain.
            _totalAmount,
            _maturityPeriod,
            _interestRate,
            _borrower,
            _lender,
            admin,
            IP2PLoanTerm.LoanStatus.Created,
            isCrossChain,
            _payFeesIn
        );
        loanTerms.push(loanTerm);
        executionChains[address(loanTerm)] = _executionChainSelector;
        emit CreateP2PLoanTerm(_token, _totalAmount, _maturityPeriod, _interestRate, _borrower, _lender, admin);
        return loanTerms.length - 1;
    }

    function getP2PLoanTerm(uint index) public view returns (IP2PLoanTerm) {
        return loanTerms[index];
    }

    function getLoanTermsLength() public view returns (uint256) {
        return loanTerms.length;
    }

    function activateLoanTermRequest(
        address _token,
        uint256 _totalAmount,
        uint256 _maturityPeriod,
        uint64 _interestRate,
        address _borrower,
        address _lender,
        PayFeesIn _payFeesIn
    ) public payable {

        uint64 destinationChainSelector = executionChains[msg.sender];
        if(securityMode){
            require(destinationChainSelector != 0, "caller is not loanTerm contract");
        }
        address receiver = sourceSender[destinationChainSelector];
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver), //receiver should be Factory contract on destination chain?
            data: abi.encodeWithSignature("activateLoanTerm(address,uint256,uint256,uint64,address,address,PayFeesIn,uint64,address)",
                _token,
                _totalAmount,
                _maturityPeriod,
                _interestRate,
                _borrower,
                _lender,
                _payFeesIn,
                chainSelector,
                msg.sender
            ),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: _payFeesIn == PayFeesIn.LINK ? i_link : address(0)
        });

        bytes32 messageId = _ccipSend(destinationChainSelector, message);

        emit MessageSent(messageId);
    }

    function notifyRedemptionRequest(
        PayFeesIn payFeesIn
    ) public payable {

        MasterTerm memory masterTerm = masterTerms[msg.sender];
        if(securityMode){
            require(masterTerm.chainSelector != 0, "caller is not loanTerm contract");
        }
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

    function liquidateCollateralRequest(
        PayFeesIn payFeesIn
    ) public payable {

        MasterTerm memory masterTerm = masterTerms[msg.sender];
        if(securityMode){
            require(masterTerm.chainSelector != 0, "caller is not loanTerm contract");
        }
        uint64 destinationChainSelector = masterTerm.chainSelector;
        address receiver = sourceSender[destinationChainSelector];

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver), //receiver should be Factory contract on destination chain
            data: abi.encodeWithSignature("liquidateCollateral(address)", masterTerm.loanTerm),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: payFeesIn == PayFeesIn.LINK ? i_link : address(0)
        });

        bytes32 messageId = _ccipSend(destinationChainSelector, message);

        emit MessageSent(messageId);
    }

    //This function is used for calling both activateLoanTerm and NotifyRedemption
    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        address srcSender = abi.decode(message.sender, (address));
        (bool success,) = address(this).call(message.data);
        require(success);
        emit MessageReceived(message.messageId, message.sourceChainSelector, srcSender, message.data);
    }

    function activateLoanTerm(
        address _token,
        uint256 _totalAmount,
        uint256 _maturityPeriod,
        uint64 _interestRate,
        address _borrower,
        address _lender,
        PayFeesIn _payFeesIn,
        uint64 _masterChainSelector,
        address _masterAddress
    )  external onlySelf {

        P2PLoanTerm loanTerm = new P2PLoanTerm(
            _token,
            _totalAmount,
            _maturityPeriod,
            _interestRate,
            _borrower,
            _lender,
            admin,
            IP2PLoanTerm.LoanStatus.Activated,
            true, //isCrossChain = true as this is initiated by cross chain message.
            _payFeesIn
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
    )  external onlySelf {
        //TODO: consider if there is any other validation mechanism
        //Right now, message is only validated on source chain Factory contract (notifyRedemptionRequest)
        IP2PLoanTerm(_loanTerm).withdrawCollateral();

    }

    function liquidateCollateral(
        address _loanTerm
    )  external onlySelf {
        //TODO: consider if there is any other validation mechanism
        //Right now, message is only validated on source chain Factory contract (notifyRedemptionRequest)
        IP2PLoanTerm(_loanTerm).liquidateCollateral();

    }

    receive() external payable {}


    /* ========== MODIFIERS ========== */
    modifier onlySelf() {
        require(msg.sender == address(this), "not through call function");
        _;
    }



}
