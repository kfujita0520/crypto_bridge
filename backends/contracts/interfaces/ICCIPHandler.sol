// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

interface ICCIPHandler {
    enum PayFeesIn {
        Native,
        LINK
    }

    event MessageSent(bytes32 messageId);

    event MessageReceived(bytes32 messageId, uint64 sourceChainSelector, address sender, bytes data);

    event MessageFailed(bytes32 message, bytes err);

    function sourceSender(uint64 chainSelector) external view returns (address);

    function updateSourceSender(uint64 chainSelector, address messenger) external;

    function validateSourceSender(uint64 chainSelector, address sender) external view returns (bool);

    function updateSecurityMode(bool enable) external;

    function ccipReceive(Client.Any2EVMMessage calldata message) external;

    function estimateFee(uint64 destinationChainSelector, Client.EVM2AnyMessage memory message) external returns (uint256);

    function getRouter() external view returns (address);
}
