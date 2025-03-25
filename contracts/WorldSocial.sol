// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WorldSocialToken
 * @dev ERC20 Token for the WorldSocial platform with content creator rewards and permit functionality for gasless approvals.
 */
contract WorldSocialToken is ERC20, ERC20Permit, Ownable {
    // Events
    event CreatorRewarded(address indexed creator, uint256 amount);
    event ViewerRewarded(address indexed viewer, uint256 amount);

    // Constants
    uint256 public constant CREATOR_REWARD_PERCENTAGE = 70; // 70% of rewards go to creators
    uint256 public constant VIEWER_REWARD_PERCENTAGE = 30;  // 30% of rewards go to viewers

    // Mappings
    mapping(address => bool) public isContentCreator;
    mapping(address => uint256) public creatorRewards;
    mapping(address => uint256) public viewerRewards;

    constructor()
        ERC20("WorldSocial Token", "WST")
        ERC20Permit("WorldSocial Token")
        Ownable(msg.sender)
    {
        // Initial supply: 100 million tokens
        _mint(msg.sender, 100_000_000 * 10**decimals());
    }

    /**
     * @dev Register an address as a content creator.
     */
    function registerCreator(address creator) external onlyOwner {
        require(!isContentCreator[creator], "Already registered as creator");
        isContentCreator[creator] = true;
    }

    /**
     * @dev Reward a content creator for their content.
     */
    function rewardCreator(address creator, uint256 amount) external onlyOwner {
        require(isContentCreator[creator], "Not a registered creator");
        require(amount > 0, "Amount must be greater than 0");

        uint256 creatorAmount = (amount * CREATOR_REWARD_PERCENTAGE) / 100;
        creatorRewards[creator] += creatorAmount;
        _mint(creator, creatorAmount);

        emit CreatorRewarded(creator, creatorAmount);
    }

    /**
     * @dev Reward a viewer for watching content.
     */
    function rewardViewer(address viewer, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");

        uint256 viewerAmount = (amount * VIEWER_REWARD_PERCENTAGE) / 100;
        viewerRewards[viewer] += viewerAmount;
        _mint(viewer, viewerAmount);

        emit ViewerRewarded(viewer, viewerAmount);
    }

    /**
     * @dev Override _update to maintain standard ERC20 behavior.
     */
    function _update(address from, address to, uint256 value) internal virtual override {
        super._update(from, to, value);
    }
}
