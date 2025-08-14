// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LootBox} from "../src/LootBox.sol";

// Mock ERC20 for testing
contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    string public name = "Mock Token";
    string public symbol = "MOCK";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }
}

// Mock ERC721 for testing
contract MockERC721 {
    mapping(uint256 => address) public ownerOf;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    mapping(uint256 => address) public getApproved;
    uint256 public totalSupply;

    function transferFrom(address from, address to, uint256 tokenId) external {
        require(ownerOf[tokenId] == from, "Not owner");
        require(
            msg.sender == from ||
                isApprovedForAll[from][msg.sender] ||
                getApproved[tokenId] == msg.sender,
            "Not approved"
        );

        ownerOf[tokenId] = to;
        getApproved[tokenId] = address(0);
    }

    function mint(address to, uint256 tokenId) external {
        ownerOf[tokenId] = to;
        totalSupply++;
    }

    function setApprovalForAll(address operator, bool approved) external {
        isApprovedForAll[msg.sender][operator] = approved;
    }
}

// Mock ERC1155 for testing
contract MockERC1155 {
    mapping(address => mapping(uint256 => uint256)) public balanceOf;
    mapping(address => mapping(address => bool)) public isApprovedForAll;

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata
    ) external {
        require(balanceOf[from][id] >= amount, "Insufficient balance");
        require(
            from == msg.sender || isApprovedForAll[from][msg.sender],
            "Not approved"
        );

        balanceOf[from][id] -= amount;
        balanceOf[to][id] += amount;
    }

    function mint(address to, uint256 id, uint256 amount) external {
        balanceOf[to][id] += amount;
    }

    function setApprovalForAll(address operator, bool approved) external {
        isApprovedForAll[msg.sender][operator] = approved;
    }
}

// Mock VRF Coordinator for testing
contract MockVRFCoordinator {
    uint256 private nextRequestId = 1;
    mapping(uint256 => address) public requestIdToConsumer;

    function requestRandomWords(
        bytes32,
        uint64,
        uint16,
        uint32,
        uint32
    ) external returns (uint256 requestId) {
        requestId = nextRequestId++;
        requestIdToConsumer[requestId] = msg.sender;
        return requestId;
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) external {
        address consumer = requestIdToConsumer[requestId];
        require(consumer != address(0), "Invalid request");

        LootBox(payable(consumer)).fulfillRandomWords(requestId, randomWords);
    }
}

contract LootBoxScript is Script {
    LootBox public lootBox;
    MockVRFCoordinator public vrfCoordinator;
    MockERC20 public mockERC20;
    MockERC721 public mockERC721;
    MockERC1155 public mockERC1155;

    // VRF Configuration (using mock values for testing)
    bytes32 public constant KEY_HASH =
        0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f;
    uint64 public constant SUBSCRIPTION_ID = 1;
    uint256 public constant BOX_PRICE = 0.1 ether;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Deploy mock contracts first
        vrfCoordinator = new MockVRFCoordinator();
        mockERC20 = new MockERC20();
        mockERC721 = new MockERC721();
        mockERC1155 = new MockERC1155();

        console.log("Mock contracts deployed:");
        console.log("VRF Coordinator:", address(vrfCoordinator));
        console.log("Mock ERC20:", address(mockERC20));
        console.log("Mock ERC721:", address(mockERC721));
        console.log("Mock ERC1155:", address(mockERC1155));

        // Deploy LootBox contract
        lootBox = new LootBox(
            address(vrfCoordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            BOX_PRICE
        );

        console.log("LootBox deployed at:", address(lootBox));
        console.log("Initial owner:", lootBox.owner());
        console.log("Initial box price:", lootBox.boxPrice());
        console.log("Initial total weight:", lootBox.totalWeight());

        // Setup mock tokens - mint to LootBox contract
        setupMockTokens();

        // Test all owner functions
        testOwnerFunctions();

        // Test view functions
        testViewFunctions();

        // Test box opening (this will create a pending request)
        testBoxOpening();

        // Test reward fulfillment
        testRewardFulfillment();

        // Test withdrawal
        testWithdrawal();

        vm.stopBroadcast();

        console.log("\n=== Script execution completed successfully! ===");
    }

    function setupMockTokens() internal {
        console.log("\n=== Setting up mock tokens ===");

        // Mint tokens to LootBox contract
        mockERC20.mint(address(lootBox), 1000 ether);
        console.log("Minted 1000 ERC20 tokens to LootBox");

        // Mint NFTs to LootBox
        mockERC721.mint(address(lootBox), 1);
        mockERC721.mint(address(lootBox), 2);
        mockERC721.mint(address(lootBox), 3);
        console.log("Minted NFTs (1, 2, 3) to LootBox");

        // Set approval for LootBox to transfer its own NFTs
        mockERC721.setApprovalForAll(address(lootBox), true);
        console.log("Set NFT approval for LootBox");

        // Mint ERC1155 tokens to LootBox
        mockERC1155.mint(address(lootBox), 1, 100);
        mockERC1155.mint(address(lootBox), 2, 50);
        console.log("Minted ERC1155 tokens to LootBox");

        // Set approval for ERC1155
        mockERC1155.setApprovalForAll(address(lootBox), true);
        console.log("Set ERC1155 approval for LootBox");
    }

    function testOwnerFunctions() internal {
        console.log("\n=== Testing Owner Functions ===");

        // Test addReward function with different token types
        console.log("Adding ERC20 reward...");
        lootBox.addReward(
            LootBox.RewardType.ERC20,
            address(mockERC20),
            0, // tokenId not used for ERC20
            50 ether,
            4000 // 40% probability
        );

        console.log("Adding ERC721 reward...");
        lootBox.addReward(
            LootBox.RewardType.ERC721,
            address(mockERC721),
            1, // NFT token ID
            1, // amount = 1 for NFTs
            3000 // 30% probability
        );

        console.log("Adding ERC1155 reward...");
        lootBox.addReward(
            LootBox.RewardType.ERC1155,
            address(mockERC1155),
            1, // token ID
            10, // amount
            2000 // 20% probability
        );

        console.log("Adding another ERC721 reward...");
        lootBox.addReward(
            LootBox.RewardType.ERC721,
            address(mockERC721),
            2,
            1,
            1000 // 10% probability
        );

        console.log("Total rewards added:", lootBox.getRewardCount());
        console.log("Total weight:", lootBox.totalWeight());

        // Test toggleReward function
        console.log("Toggling reward 0 (should deactivate)...");
        lootBox.toggleReward(0);
        console.log("New total weight:", lootBox.totalWeight());

        console.log("Toggling reward 0 again (should reactivate)...");
        lootBox.toggleReward(0);
        console.log("Final total weight:", lootBox.totalWeight());

        // Test setBoxPrice function
        console.log("Changing box price to 0.2 ETH...");
        lootBox.setBoxPrice(0.2 ether);
        console.log("New box price:", lootBox.boxPrice());

        // Reset box price for testing
        lootBox.setBoxPrice(BOX_PRICE);
    }

    function testViewFunctions() internal {
        console.log("\n=== Testing View Functions ===");

        uint256 rewardCount = lootBox.getRewardCount();
        console.log("Total reward count:", rewardCount);

        // Test getReward function for each reward
        for (uint256 i = 0; i < rewardCount; i++) {
            (
                LootBox.RewardType rewardType,
                address tokenAddress,
                uint256 tokenId,
                uint256 amount,
                uint256 weight,
                bool active
            ) = lootBox.getReward(i);

            console.log("Reward", i, ":");
            console.log("  Type:", uint256(rewardType));
            console.log("  Token:", tokenAddress);
            console.log("  Token ID:", tokenId);
            console.log("  Amount:", amount);
            console.log("  Weight:", weight);
            console.log("  Active:", active);

            // Test calculateRewardProbability function
            uint256 probability = lootBox.calculateRewardProbability(i);
            console.log("  Probability (basis points):", probability);
            console.log("  Probability (%):", probability / 100);
        }
    }

    function testBoxOpening() internal {
        console.log("\n=== Testing Box Opening ===");

        // Create a test user address
        address testUser = address(0x123456789);

        console.log("Test user balance before:", testUser.balance);
        console.log("LootBox balance before:", address(lootBox).balance);

        // Simulate opening a box by calling the receive function
        // This will create a VRF request
        (bool success, ) = address(lootBox).call{value: BOX_PRICE}("");
        require(success, "Box opening failed");

        console.log("Box opened successfully!");
        console.log("LootBox balance after:", address(lootBox).balance);

        // The VRF request should now be pending - let's check
        console.log("VRF request created, checking pending status...");
    }

    function testRewardFulfillment() internal {
        console.log("\n=== Testing Reward Fulfillment ===");

        // Create mock random words for testing
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 5000; // This should select one of the rewards

        console.log("Fulfilling request with random value:", randomWords[0]);

        // The request ID should be 1 (first request from MockVRFCoordinator)
        // But let's make sure we're fulfilling the correct request
        uint256 requestId = 1;

        // Check if this request exists in our coordinator
        address requestConsumer = vrfCoordinator.requestIdToConsumer(requestId);
        console.log("Request consumer for ID 1:", requestConsumer);

        if (requestConsumer == address(lootBox)) {
            vrfCoordinator.fulfillRandomWords(requestId, randomWords);
            console.log("Reward fulfilled successfully!");

            // Check the request status
            (address user, bool fulfilled) = lootBox.pendingRequests(requestId);
            console.log("Request user:", user);
            console.log("Request fulfilled:", fulfilled);
        } else {
            console.log("No valid request found to fulfill");
        }
    }

    function testWithdrawal() internal {
        console.log("\n=== Testing Withdrawal ===");

        address owner = lootBox.owner();
        uint256 contractBalance = address(lootBox).balance;
        uint256 ownerBalanceBefore = owner.balance;

        console.log("Contract balance before withdrawal:", contractBalance);
        console.log("Owner balance before withdrawal:", ownerBalanceBefore);

        if (contractBalance > 0) {
            lootBox.withdraw();
            console.log("Withdrawal successful!");
            console.log("Owner balance after withdrawal:", owner.balance);
            console.log(
                "Contract balance after withdrawal:",
                address(lootBox).balance
            );
        } else {
            console.log("No funds to withdraw");
        }
    }
}
