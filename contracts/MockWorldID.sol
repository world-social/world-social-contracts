// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract MockWorldID {
    bool public mockVerifyProofResult = false;

    function setMockVerifyProof(bool _result) external {
        mockVerifyProofResult = _result;
    }

    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view {
        require(mockVerifyProofResult, "Mock proof verification failed");
    }
}