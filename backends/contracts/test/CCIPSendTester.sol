// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import "../interfaces/ICCIPHandler.sol";
import "hardhat/console.sol";

contract CCIPSendTester {

    address public ccipHandler;
    struct LoanTerm {
        address token;
        uint256 totalAmount;
        uint256 maturityPeriod;
        uint64 interestRate;
        address borrower;
        address lender;
        ICCIPHandler.PayFeesIn payFeesIn;
    }

    constructor(address _ccipHandler){
        ccipHandler = _ccipHandler;
    }


    function updateDestinationMinter(address _ccipHandler) public {
        ccipHandler = _ccipHandler;
    }


    function activateLoanTermTest(
        bytes32 messageId,
        uint64 sourceChainSelector,
        address srcSender,
        LoanTerm memory loanTerm
    ) public {
        //Important: In Function Signature, PayFeesIn will be uint8
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: messageId,
            sourceChainSelector: sourceChainSelector,
            sender: abi.encode(srcSender),
            data: abi.encodeWithSignature(
                "activateLoanTerm(address,uint256,uint256,uint64,address,address,uint8,uint64,address)",
                loanTerm.token,
                loanTerm.totalAmount,
                loanTerm.maturityPeriod,
                loanTerm.interestRate,
                loanTerm.borrower,
                loanTerm.lender,
                loanTerm.payFeesIn,
                sourceChainSelector,
                srcSender
            ),
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });
        console.log('start ccipReceive');
        ICCIPHandler(ccipHandler).ccipReceive(message);
    }

    function notifyRedemptionTest(
        bytes32 messageId,
        uint64 sourceChainSelector,
        address srcSender,
        address loanTerm
    ) public {
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: messageId,
            sourceChainSelector: sourceChainSelector,
            sender: abi.encode(srcSender),
            data: abi.encodeWithSignature("notifyRedemption(address)", loanTerm),
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });
        console.log('start ccipReceive');
        ICCIPHandler(ccipHandler).ccipReceive(message);
    }



}
