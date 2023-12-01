// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IAny2EVMMessageReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IAny2EVMMessageReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import "hardhat/console.sol";

/// @title CCIPHandler - Base contract for CCIP applications that can receive messages.
abstract contract CCIPHandler is IAny2EVMMessageReceiver, IERC165, AccessControl {
    address immutable i_router;
    address immutable i_link;
    bool public securityMode = false;//test purpose. In production, this is always true.
    mapping(uint64 => address) public sourceSender;

    enum PayFeesIn {
        Native,
        LINK
    }

    constructor(address router, address link) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        if (router == address(0)) revert InvalidRouter(address(0));
        i_router = router;
        i_link = link;
        LinkTokenInterface(i_link).approve(i_router, type(uint256).max);
    }

    /// @notice IERC165 supports an interfaceId
    /// @param interfaceId The interfaceId to check
    /// @return true if the interfaceId is supported
    function supportsInterface(bytes4 interfaceId) public pure virtual override(AccessControl, IERC165) returns (bool) {
        return interfaceId == type(IAny2EVMMessageReceiver).interfaceId || interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IAccessControl).interfaceId;
    }

    function updateSourceSender(uint64 chainSelector, address messenger) public onlyAdmin(msg.sender) {
        sourceSender[chainSelector] = messenger;
    }

    function validateSourceSender(uint64 chainSelector, address sender) public view returns (bool) {
        return (sourceSender[chainSelector] == sender);
    }

    function updateSecurityMode(bool enable) public onlyAdmin(msg.sender) {
        securityMode = enable;
    }

    modifier onlyAdmin(address user) {
        require(hasRole(DEFAULT_ADMIN_ROLE, user), "Caller is not a admin");
        _;
    }

    /// @inheritdoc IAny2EVMMessageReceiver
    function ccipReceive(Client.Any2EVMMessage calldata message) external virtual override onlyRouter {
        address srcSender = abi.decode(message.sender, (address));
        if(securityMode){
            require(validateSourceSender(message.sourceChainSelector, srcSender), "the sender is unauthorized");
        }
        _ccipReceive(message);
    }

    /// @notice Override this function in your implementation.
    /// @param message Any2EVMMessage
    function _ccipReceive(Client.Any2EVMMessage memory message) internal virtual;

    function estimateFee(uint64 destinationChainSelector, Client.EVM2AnyMessage memory message) external virtual returns(uint256){
        uint256 fee = IRouterClient(i_router).getFee(
            destinationChainSelector,
            message
        );
        return fee;
    }

    function _ccipSend(uint64 destinationChainSelector, Client.EVM2AnyMessage memory message) internal virtual returns(bytes32){
        uint256 fee = IRouterClient(i_router).getFee(
            destinationChainSelector,
            message
        );

        bytes32 messageId;
        if (message.feeToken != address(0)) { //payFeeIn = PayFeesIn.LINK
            // pre-approved in constructor
            // LinkTokenInterface(i_link).approve(i_router, fee);
            messageId = IRouterClient(i_router).ccipSend(
                destinationChainSelector,
                message
            );
        } else {
            messageId = IRouterClient(i_router).ccipSend{value: fee}(
                destinationChainSelector,
                message
            );
        }
        return messageId;
    }

    /////////////////////////////////////////////////////////////////////
    // Plumbing
    /////////////////////////////////////////////////////////////////////

    /// @notice Return the current router
    /// @return i_router address
    function getRouter() public view returns (address) {
        return address(i_router);
    }

    error InvalidRouter(address router);

    /// @dev only calls from the set router are accepted.
    modifier onlyRouter() {
        if (securityMode && msg.sender != address(i_router)) revert InvalidRouter(msg.sender);
        _;
    }
}
