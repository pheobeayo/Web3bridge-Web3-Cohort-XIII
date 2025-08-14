// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IERC1155 {
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

interface VRFCoordinatorV2Interface {
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId);
}

contract LootBox {
    // Events
    event BoxOpened(address indexed user, uint256 indexed requestId, uint256 boxPrice);
    event RewardGranted(address indexed user, uint256 indexed requestId, RewardType rewardType, address tokenAddress, uint256 tokenId, uint256 amount);
    event BoxConfigured(uint256 boxPrice, uint256 totalWeight);
    event RewardAdded(RewardType rewardType, address tokenAddress, uint256 tokenId, uint256 amount, uint256 weight);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // Enums
    enum RewardType { ERC20, ERC721, ERC1155 }

    // Structs
    struct Reward {
        RewardType rewardType;
        address tokenAddress;
        uint256 tokenId; // For NFTs, 0 for ERC20
        uint256 amount;
        uint256 weight;
        bool active;
    }

    struct PendingRequest {
        address user;
        bool fulfilled;
    }

    // State variables
    address public owner;
    uint256 public boxPrice;
    uint256 public totalWeight;
    
    Reward[] public rewards;
    mapping(uint256 => PendingRequest) public pendingRequests;
    
    // VRF Configuration
    VRFCoordinatorV2Interface public vrfCoordinator;
    bytes32 public keyHash;
    uint64 public subscriptionId;
    uint16 public requestConfirmations = 3;
    uint32 public callbackGasLimit = 200000;

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyVRFCoordinator() {
        require(msg.sender == address(vrfCoordinator), "Not VRF coordinator");
        _;
    }

    constructor(
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId,
        uint256 _boxPrice
    ) {
        owner = msg.sender;
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
        boxPrice = _boxPrice;
        
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // Owner functions
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    function setBoxPrice(uint256 _boxPrice) external onlyOwner {
        boxPrice = _boxPrice;
        emit BoxConfigured(boxPrice, totalWeight);
    }

    function addReward(
        RewardType _rewardType,
        address _tokenAddress,
        uint256 _tokenId,
        uint256 _amount,
        uint256 _weight
    ) external onlyOwner {
        require(_tokenAddress != address(0), "Invalid token address");
        require(_weight > 0, "Weight must be > 0");
        require(_amount > 0, "Amount must be > 0");

        rewards.push(Reward({
            rewardType: _rewardType,
            tokenAddress: _tokenAddress,
            tokenId: _tokenId,
            amount: _amount,
            weight: _weight,
            active: true
        }));

        totalWeight += _weight;
        
        emit RewardAdded(_rewardType, _tokenAddress, _tokenId, _amount, _weight);
        emit BoxConfigured(boxPrice, totalWeight);
    }

    function toggleReward(uint256 _rewardIndex) external onlyOwner {
        require(_rewardIndex < rewards.length, "Invalid reward index");
        
        Reward storage reward = rewards[_rewardIndex];
        reward.active = !reward.active;
        
        if (reward.active) {
            totalWeight += reward.weight;
        } else {
            totalWeight -= reward.weight;
        }
        
        emit BoxConfigured(boxPrice, totalWeight);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    // Public functions
    function openBox() external payable {
        require(msg.value >= boxPrice, "Insufficient payment");
        require(totalWeight > 0, "No rewards available");
        
        uint256 requestId = vrfCoordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            1
        );
        
        pendingRequests[requestId] = PendingRequest({
            user: msg.sender,
            fulfilled: false
        });
        
        emit BoxOpened(msg.sender, requestId, msg.value);
        
        // Refund excess payment
        if (msg.value > boxPrice) {
            (bool success, ) = msg.sender.call{value: msg.value - boxPrice}("");
            require(success, "Refund failed");
        }
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external onlyVRFCoordinator {
        PendingRequest storage request = pendingRequests[requestId];
        require(!request.fulfilled, "Request already fulfilled");
        require(request.user != address(0), "Invalid request");
        
        request.fulfilled = true;
        
        uint256 randomValue = randomWords[0] % totalWeight;
        uint256 rewardIndex = _selectReward(randomValue);
        
        _grantReward(request.user, rewardIndex, requestId);
    }

    // Internal functions
    function _selectReward(uint256 randomValue) internal view returns (uint256) {
        uint256 currentWeight = 0;
        
        for (uint256 i = 0; i < rewards.length; i++) {
            if (rewards[i].active) {
                currentWeight += rewards[i].weight;
                if (randomValue < currentWeight) {
                    return i;
                }
            }
        }
        
        revert("No reward selected");
    }

    function _grantReward(address user, uint256 rewardIndex, uint256 requestId) internal {
        Reward storage reward = rewards[rewardIndex];
        
        if (reward.rewardType == RewardType.ERC20) {
            IERC20(reward.tokenAddress).transfer(user, reward.amount);
        } else if (reward.rewardType == RewardType.ERC721) {
            IERC721(reward.tokenAddress).transferFrom(address(this), user, reward.tokenId);
        } else if (reward.rewardType == RewardType.ERC1155) {
            IERC1155(reward.tokenAddress).safeTransferFrom(address(this), user, reward.tokenId, reward.amount, "");
        }
        
        emit RewardGranted(user, requestId, reward.rewardType, reward.tokenAddress, reward.tokenId, reward.amount);
    }

    // View functions
    function getRewardCount() external view returns (uint256) {
        return rewards.length;
    }

    function getReward(uint256 index) external view returns (
        RewardType rewardType,
        address tokenAddress,
        uint256 tokenId,
        uint256 amount,
        uint256 weight,
        bool active
    ) {
        require(index < rewards.length, "Invalid index");
        Reward storage reward = rewards[index];
        return (reward.rewardType, reward.tokenAddress, reward.tokenId, reward.amount, reward.weight, reward.active);
    }

    function calculateRewardProbability(uint256 rewardIndex) external view returns (uint256) {
        require(rewardIndex < rewards.length, "Invalid reward index");
        require(totalWeight > 0, "No active rewards");
        
        if (!rewards[rewardIndex].active) {
            return 0;
        }
        
        return (rewards[rewardIndex].weight * 10000) / totalWeight; // Returns basis points (0.01%)
    }

    // ERC1155 receiver
    function onERC1155Received(address, address, uint256, uint256, bytes memory) public pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] memory, uint256[] memory, bytes memory) public pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    // ERC721 receiver
    function onERC721Received(address, address, uint256, bytes memory) public pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // Fallback to receive ETH
    receive() external payable {}
}