// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/LootBox.sol";

// Mock contracts for testing
contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    string public name = "Mock Token";
    string public symbol = "MOCK";
    uint8 public decimals = 18;

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
}

contract MockERC721 {
    mapping(uint256 => address) public ownerOf;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    mapping(uint256 => address) public getApproved;

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
    }

    function approve(address spender, uint256 tokenId) external {
        getApproved[tokenId] = spender;
    }

    function setApprovalForAll(address operator, bool approved) external {
        isApprovedForAll[msg.sender][operator] = approved;
    }
}

contract MockERC1155 {
    mapping(address => mapping(uint256 => uint256)) public balanceOf;
    mapping(address => mapping(address => bool)) public isApprovedForAll;

    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata) external {
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

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        address consumer = requestIdToConsumer[requestId];
        require(consumer != address(0), "Invalid request");
        
      
        LootBox(payable(consumer)).fulfillRandomWords(requestId, randomWords);
    }
}

contract LootBoxTest is Test {
    LootBox public lootBox;
    MockVRFCoordinator public vrfCoordinator;
    MockERC20 public mockERC20;
    MockERC721 public mockERC721;
    MockERC1155 public mockERC1155;

    address public owner = address(0x123);
    address public user1 = address(0x456);
    address public user2 = address(0x789);

    bytes32 public constant KEY_HASH = 0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f;
    uint64 public constant SUBSCRIPTION_ID = 1;
    uint256 public constant BOX_PRICE = 0.1 ether;

    event BoxOpened(address indexed user, uint256 indexed requestId, uint256 boxPrice);
    event RewardGranted(address indexed user, uint256 indexed requestId, LootBox.RewardType rewardType, address tokenAddress, uint256 tokenId, uint256 amount);
    event BoxConfigured(uint256 boxPrice, uint256 totalWeight);
    event RewardAdded(LootBox.RewardType rewardType, address tokenAddress, uint256 tokenId, uint256 amount, uint256 weight);

    function setUp() public {
        // Deploy mock contracts
        vrfCoordinator = new MockVRFCoordinator();
        mockERC20 = new MockERC20();
        mockERC721 = new MockERC721();
        mockERC1155 = new MockERC1155();

        // Deploy LootBox
        vm.prank(owner);
        lootBox = new LootBox(
            address(vrfCoordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            BOX_PRICE
        );

        // Setup mock tokens
        mockERC20.mint(address(lootBox), 1000 ether);
        
        mockERC721.mint(address(lootBox), 1);
        mockERC721.mint(address(lootBox), 2);
        vm.prank(address(lootBox));
        mockERC721.setApprovalForAll(address(lootBox), true);
        
        mockERC1155.mint(address(lootBox), 1, 100);
        mockERC1155.mint(address(lootBox), 2, 50);
        vm.prank(address(lootBox));
        mockERC1155.setApprovalForAll(address(lootBox), true);

        // Give users some ETH
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
    }

    function testInitialState() public view {
    assertEq(lootBox.owner(), owner);
    assertEq(lootBox.boxPrice(), BOX_PRICE);
    assertEq(lootBox.totalWeight(), 0);
    assertEq(lootBox.getRewardCount(), 0);
}

    function testAddReward() public {
        vm.prank(owner);
        lootBox.addReward(
            LootBox.RewardType.ERC20,
            address(mockERC20),
            0,
            100 ether,
            5000
        );

        assertEq(lootBox.totalWeight(), 5000);
        assertEq(lootBox.getRewardCount(), 1);

        (
            LootBox.RewardType rewardType,
            address tokenAddress,
            uint256 tokenId,
            uint256 amount,
            uint256 weight,
            bool active
        ) = lootBox.getReward(0);

        assertEq(uint256(rewardType), uint256(LootBox.RewardType.ERC20));
        assertEq(tokenAddress, address(mockERC20));
        assertEq(tokenId, 0);
        assertEq(amount, 100 ether);
        assertEq(weight, 5000);
        assertTrue(active);
    }

    function testAddMultipleRewards() public {
        vm.startPrank(owner);
        
        // Add ERC20 reward
        lootBox.addReward(
            LootBox.RewardType.ERC20,
            address(mockERC20),
            0,
            50 ether,
            3000
        );

        // Add ERC721 reward
        lootBox.addReward(
            LootBox.RewardType.ERC721,
            address(mockERC721),
            1,
            1,
            1500
        );

        // Add ERC1155 reward
        lootBox.addReward(
            LootBox.RewardType.ERC1155,
            address(mockERC1155),
            1,
            10,
            500
        );

        vm.stopPrank();

        assertEq(lootBox.totalWeight(), 5000);
        assertEq(lootBox.getRewardCount(), 3);
    }

    function testToggleReward() public {
        vm.startPrank(owner);
        
        lootBox.addReward(
            LootBox.RewardType.ERC20,
            address(mockERC20),
            0,
            100 ether,
            5000
        );

        assertEq(lootBox.totalWeight(), 5000);

        // Toggle off
        lootBox.toggleReward(0);
        assertEq(lootBox.totalWeight(), 0);

        // Toggle on
        lootBox.toggleReward(0);
        assertEq(lootBox.totalWeight(), 5000);

        vm.stopPrank();
    }

    function testSetBoxPrice() public {
        uint256 newPrice = 0.2 ether;
        
        vm.prank(owner);
        lootBox.setBoxPrice(newPrice);
        
        assertEq(lootBox.boxPrice(), newPrice);
    }

    function testOpenBox() public {
        // Setup rewards
        vm.startPrank(owner);
        lootBox.addReward(
            LootBox.RewardType.ERC20,
            address(mockERC20),
            0,
            100 ether,
            10000
        );
        vm.stopPrank();

        // User opens box
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit BoxOpened(user1, 1, BOX_PRICE);
        lootBox.openBox{value: BOX_PRICE}();

        // Check pending request
        (address user, bool fulfilled) = lootBox.pendingRequests(1);
        assertEq(user, user1);
        assertFalse(fulfilled);
    }

    function testOpenBoxWithExcessPayment() public {
        // Setup rewards
        vm.startPrank(owner);
        lootBox.addReward(
            LootBox.RewardType.ERC20,
            address(mockERC20),
            0,
            100 ether,
            10000
        );
        vm.stopPrank();

        uint256 userBalanceBefore = user1.balance;
        uint256 excessPayment = BOX_PRICE + 0.05 ether;

        // User opens box with excess payment
        vm.prank(user1);
        lootBox.openBox{value: excessPayment}();

        // Check refund
        assertEq(user1.balance, userBalanceBefore - BOX_PRICE);
    }

    function testFulfillRandomWords() public {
        // Setup rewards
        vm.startPrank(owner);
        lootBox.addReward(
            LootBox.RewardType.ERC20,
            address(mockERC20),
            0,
            100 ether,
            10000
        );
        vm.stopPrank();

        // User opens box
        vm.prank(user1);
        lootBox.openBox{value: BOX_PRICE}();

        uint256 userBalanceBefore = mockERC20.balanceOf(user1);

        // Fulfill random words
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 5000; // This should select the ERC20 reward
        
        vm.expectEmit(true, true, false, true);
        emit RewardGranted(user1, 1, LootBox.RewardType.ERC20, address(mockERC20), 0, 100 ether);
        vrfCoordinator.fulfillRandomWords(1, randomWords);

        // Check reward granted
        assertEq(mockERC20.balanceOf(user1), userBalanceBefore + 100 ether);

        // Check request fulfilled
        (, bool fulfilled) = lootBox.pendingRequests(1);
        assertTrue(fulfilled);
    }

    function testERC721Reward() public {
        // Setup ERC721 reward
        vm.prank(owner);
        lootBox.addReward(
            LootBox.RewardType.ERC721,
            address(mockERC721),
            1,
            1,
            10000
        );

        // User opens box
        vm.prank(user1);
        lootBox.openBox{value: BOX_PRICE}();

        // Fulfill random words
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 5000;
        vrfCoordinator.fulfillRandomWords(1, randomWords);

        // Check NFT ownership
        assertEq(mockERC721.ownerOf(1), user1);
    }

    function testERC1155Reward() public {
        // Setup ERC1155 reward
        vm.prank(owner);
        lootBox.addReward(
            LootBox.RewardType.ERC1155,
            address(mockERC1155),
            1,
            10,
            10000
        );

        uint256 userBalanceBefore = mockERC1155.balanceOf(user1, 1);

        // User opens box
        vm.prank(user1);
        lootBox.openBox{value: BOX_PRICE}();

        // Fulfill random words
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 5000;
        vrfCoordinator.fulfillRandomWords(1, randomWords);

        // Check balance increase
        assertEq(mockERC1155.balanceOf(user1, 1), userBalanceBefore + 10);
    }

    function testCalculateRewardProbability() public {
        vm.startPrank(owner);
        
        // Add rewards with different weights
        lootBox.addReward(LootBox.RewardType.ERC20, address(mockERC20), 0, 100 ether, 5000); // 50%
        lootBox.addReward(LootBox.RewardType.ERC721, address(mockERC721), 1, 1, 3000); // 30%
        lootBox.addReward(LootBox.RewardType.ERC1155, address(mockERC1155), 1, 10, 2000); // 20%
        
        vm.stopPrank();

        // Check probabilities (in basis points)
        assertEq(lootBox.calculateRewardProbability(0), 5000); // 50%
        assertEq(lootBox.calculateRewardProbability(1), 3000); // 30%
        assertEq(lootBox.calculateRewardProbability(2), 2000); // 20%
    }

    function testWithdraw() public {
        // Send some ETH to contract
        vm.deal(address(lootBox), 1 ether);
        
        uint256 ownerBalanceBefore = owner.balance;
        
        vm.prank(owner);
        lootBox.withdraw();
        
        assertEq(owner.balance, ownerBalanceBefore + 1 ether);
        assertEq(address(lootBox).balance, 0);
    }

    function testTransferOwnership() public {
        address newOwner = address(0xABC);
        
        vm.prank(owner);
        lootBox.transferOwnership(newOwner);
        
        assertEq(lootBox.owner(), newOwner);
    }

    // Test failures
   // Test failures - Updated to use vm.expectRevert() instead of testFail*
    function test_RevertWhen_OpenBoxInsufficientPayment() public {
        vm.startPrank(owner);
        lootBox.addReward(LootBox.RewardType.ERC20, address(mockERC20), 0, 100 ether, 10000);
        vm.stopPrank();

        vm.prank(user1);
        vm.expectRevert("Insufficient payment");
        lootBox.openBox{value: BOX_PRICE - 1}(); // Should fail
    }

    function test_RevertWhen_OpenBoxNoRewards() public {
        vm.prank(user1);
        vm.expectRevert("No rewards available");
        lootBox.openBox{value: BOX_PRICE}(); // Should fail - no rewards
    }

    function test_RevertWhen_AddRewardNotOwner() public {
        vm.prank(user1);
        vm.expectRevert("Not owner");
        lootBox.addReward(LootBox.RewardType.ERC20, address(mockERC20), 0, 100 ether, 5000);
    }

    function test_RevertWhen_TransferOwnershipNotOwner() public {
        vm.prank(user1);
        vm.expectRevert("Not owner");
        lootBox.transferOwnership(user1);
    }

    function test_RevertWhen_FulfillRandomWordsNotVRF() public {
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 5000;
        
        vm.prank(user1);
        vm.expectRevert("Not VRF coordinator");
        lootBox.fulfillRandomWords(1, randomWords);
    }

    function test_RevertWhen_FulfillRandomWordsAlreadyFulfilled() public {
        // Setup and open box
        vm.prank(owner);
        lootBox.addReward(LootBox.RewardType.ERC20, address(mockERC20), 0, 100 ether, 10000);
        
        vm.prank(user1);
        lootBox.openBox{value: BOX_PRICE}();

        // Fulfill once
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 5000;
        vrfCoordinator.fulfillRandomWords(1, randomWords);

        // Try to fulfill again - should fail
        vm.expectRevert("Request already fulfilled");
        vrfCoordinator.fulfillRandomWords(1, randomWords);
    }

    function test_RevertWhen_WithdrawNoFunds() public {
        // Ensure contract has no balance
        vm.prank(owner);
        vm.expectRevert("No funds to withdraw");
        lootBox.withdraw();
    }

    function test_RevertWhen_TransferOwnershipZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("Invalid address");
        lootBox.transferOwnership(address(0));
    }

    function test_RevertWhen_AddRewardZeroWeight() public {
        vm.prank(owner);
        vm.expectRevert("Weight must be > 0");
        lootBox.addReward(LootBox.RewardType.ERC20, address(mockERC20), 0, 100 ether, 0);
    }

    function test_RevertWhen_AddRewardZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert("Amount must be > 0");
        lootBox.addReward(LootBox.RewardType.ERC20, address(mockERC20), 0, 0, 5000);
    }

    function test_RevertWhen_AddRewardZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("Invalid token address");
        lootBox.addReward(LootBox.RewardType.ERC20, address(0), 0, 100 ether, 5000);
    }

    function test_RevertWhen_ToggleRewardInvalidIndex() public {
        vm.prank(owner);
        vm.expectRevert("Invalid reward index");
        lootBox.toggleReward(999); // Non-existent reward
    }

    function test_RevertWhen_GetRewardInvalidIndex() public {
        vm.expectRevert("Invalid index");
        lootBox.getReward(999); // Non-existent reward
    }

    function test_RevertWhen_CalculateRewardProbabilityInvalidIndex() public {
        vm.expectRevert("Invalid reward index");
        lootBox.calculateRewardProbability(999); // Non-existent reward
    }
}
