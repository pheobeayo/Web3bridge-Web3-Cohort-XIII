// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/DynamicTimeNFT.sol";


contract DynamicTimeNFTTest is Test {
    DynamicTimeNFT public nft;
    address public rick = makeAddr("rick");
    address public john = makeAddr("john");
    
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    
    function setUp() public {
        nft = new DynamicTimeNFT();
    }
    
    
    function test_InitialState() public view {
        assertEq(nft.name(), "Dynamic Time NFT");
        assertEq(nft.symbol(), "DTIME");
        assertEq(nft.balanceOf(rick), 0);
    }
    
    function test_Mint() public {
        // Test minting first token
        vm.expectEmit(true, true, true, false);
        emit Transfer(address(0), rick, 0);
        
        uint256 tokenId = nft.mint(rick);
        
        assertEq(tokenId, 0);
        assertEq(nft.ownerOf(0), rick);
        assertEq(nft.balanceOf(rick), 1);
        assertEq(nft.balanceOf(john), 0);
    }
    
    function test_MintMultiple() public {
        uint256 tokenId1 = nft.mint(rick);
        uint256 tokenId2 = nft.mint(john);
        uint256 tokenId3 = nft.mint(rick);
        
        assertEq(tokenId1, 0);
        assertEq(tokenId2, 1);
        assertEq(tokenId3, 2);
        
        assertEq(nft.ownerOf(0), rick);
        assertEq(nft.ownerOf(1), john);
        assertEq(nft.ownerOf(2), rick);
        
        assertEq(nft.balanceOf(rick), 2);
        assertEq(nft.balanceOf(john), 1);
    }
    
    function test_CannotMintToZeroAddress() public {
        vm.expectRevert("Mint to zero address");
        nft.mint(address(0));
    }
    
    
    function test_TokenURIExists() public {
        uint256 tokenId = nft.mint(rick);
        string memory uri = nft.tokenURI(tokenId);
        
        // Should start with data:application/json;base64
        assertTrue(bytes(uri).length > 0);
        assertEq(bytes(uri)[0], "d");
        assertEq(bytes(uri)[1], "a");
        assertEq(bytes(uri)[2], "t");
        assertEq(bytes(uri)[3], "a");
    }
    
    function test_TokenURINonexistentToken() public {
        vm.expectRevert("URI query for nonexistent token");
        nft.tokenURI(999);
    }
    
    function test_TokenURIChangeOverTime() public {
        uint256 tokenId = nft.mint(rick);
        
        // Get URI at current timestamp
        string memory uri1 = nft.tokenURI(tokenId);
        
        // Advance time by 1 hour
        vm.warp(block.timestamp + 3600);
        
        // Get URI at new timestamp
        string memory uri2 = nft.tokenURI(tokenId);
        
        // URIs should be different because time changed
        assertFalse(keccak256(bytes(uri1)) == keccak256(bytes(uri2)));
    }
    
    function test_TokenURIConsistentAtSameTime() public {
        uint256 tokenId = nft.mint(rick);
        
        string memory uri1 = nft.tokenURI(tokenId);
        string memory uri2 = nft.tokenURI(tokenId);
        
        // Should be identical at same timestamp
        assertEq(keccak256(bytes(uri1)), keccak256(bytes(uri2)));
    }
    
    
    
    function test_Transfer() public {
        uint256 tokenId = nft.mint(rick);
        
        vm.prank(rick);
        nft.transferFrom(rick, john, tokenId);
        
        assertEq(nft.ownerOf(tokenId), john);
        assertEq(nft.balanceOf(rick), 0);
        assertEq(nft.balanceOf(john), 1);
    }
    
    function test_Approve() public {
        uint256 tokenId = nft.mint(rick);
        
        vm.prank(rick);
        nft.approve(john, tokenId);
        
        assertEq(nft.getApproved(tokenId), john);
        
        // john can now transfer
        vm.prank(john);
        nft.transferFrom(rick, john, tokenId);
        
        assertEq(nft.ownerOf(tokenId), john);
    }
    
    function test_ApprovalForAll() public {
        uint256 tokenId = nft.mint(rick);
        
        vm.prank(rick);
        nft.setApprovalForAll(john, true);
        
        assertTrue(nft.isApprovedForAll(rick, john));
        
        // john can transfer any of rick's tokens
        vm.prank(john);
        nft.transferFrom(rick, john, tokenId);
        
        assertEq(nft.ownerOf(tokenId), john);
    }
    
    function test_SafeTransferFrom() public {
        uint256 tokenId = nft.mint(rick);
        
        vm.prank(rick);
        nft.safeTransferFrom(rick, john, tokenId);
        
        assertEq(nft.ownerOf(tokenId), john);
    }
    
    function test_CannotTransferNonexistentToken() public {
        vm.expectRevert("Operator query for nonexistent token");
        vm.prank(rick);
        nft.transferFrom(rick, john, 999);
    }
    
    function test_CannotTransferWithoutPermission() public {
        uint256 tokenId = nft.mint(rick);
        
        vm.expectRevert("Transfer caller is not owner nor approved");
        vm.prank(john);
        nft.transferFrom(rick, john, tokenId);
    }
    
        
    function test_SupportsInterface() public view {
        assertTrue(nft.supportsInterface(type(IERC721).interfaceId));
        assertTrue(nft.supportsInterface(type(IERC721Metadata).interfaceId));
        assertTrue(nft.supportsInterface(type(IERC165).interfaceId));
        assertFalse(nft.supportsInterface(0xffffffff));
    }
    
    
    function testFuzz_Mint(address to, uint256 count) public {
        vm.assume(to != address(0));
        count = bound(count, 1, 100); // Limit for gas reasons
        
        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = nft.mint(to);
            assertEq(tokenId, i);
            assertEq(nft.ownerOf(tokenId), to);
        }
        
        assertEq(nft.balanceOf(to), count);
    }
    
    function testFuzz_TokenURIAtDifferentTimes(uint256 timestamp) public {
        timestamp = bound(timestamp, 1, type(uint256).max - 86400);
        
        uint256 tokenId = nft.mint(rick);
        
        vm.warp(timestamp);
        string memory uri = nft.tokenURI(tokenId);
        assertTrue(bytes(uri).length > 0);
    }
    
    
    
    function test_GasCostMint() public {
        uint256 gasBefore = gasleft();
        nft.mint(rick);
        uint256 gasUsed = gasBefore - gasleft();
        
        // Should be reasonable gas cost (adjust based on your requirements)
        assertLt(gasUsed, 200_000);
        console.log("Gas used for mint:", gasUsed);
    }
    
    function test_GasCostTokenURI() public {
        uint256 tokenId = nft.mint(rick);
        
        uint256 gasBefore = gasleft();
        nft.tokenURI(tokenId);
        uint256 gasUsed = gasBefore - gasleft();
        
        // TokenURI generation should be reasonably efficient
        assertLt(gasUsed, 500_000);
        console.log("Gas used for tokenURI:", gasUsed);
    }
    
    
    
    function test_FullWorkflow() public {
        // Mint token
        uint256 tokenId = nft.mint(rick);
        
        // Check initial state
        assertEq(nft.ownerOf(tokenId), rick);
        string memory uri1 = nft.tokenURI(tokenId);
        
        // Ensure URI exists
        assertTrue(bytes(uri1).length > 0);
        
        // Approve john
        vm.prank(rick);
        nft.approve(john, tokenId);
        
        // john transfers to himself
        vm.prank(john);
        nft.transferFrom(rick, john, tokenId);
        
        // Check final state
        assertEq(nft.ownerOf(tokenId), john);
        assertEq(nft.balanceOf(rick), 0);
        assertEq(nft.balanceOf(john), 1);
        
        // URI should still work
        string memory uri2 = nft.tokenURI(tokenId);
        assertTrue(bytes(uri2).length > 0);
    }
}