// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IERC7432.sol";
import "./DAOMembershipNFT.sol";

contract TokenGatedDAO is ReentrancyGuard {
    error InsufficientRolePermissions();
    error ProposalDoesNotExist();
    error VotingEnded();
    error AlreadyVoted();
    error ProposalNotActive();
    error VotingNotEnded();
    error QuorumNotMet();
    error ProposalRejected();

    bytes32 public constant VOTER_ROLE = keccak256("VOTER_ROLE");
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    enum ProposalState { Pending, Active, Defeated, Succeeded, Executed }

    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    IERC7432 public immutable roleContract;
    DAOMembershipNFT public immutable membershipNFT;
    
    uint256 private _proposalIdCounter;
    mapping(uint256 => Proposal) public proposals;
    
    uint256 public votingPeriod = 7 days;
    uint256 public quorumPercentage = 30;

    constructor(address _roleContract, address _membershipNFT) {
        roleContract = IERC7432(_roleContract);
        membershipNFT = DAOMembershipNFT(_membershipNFT);
    }

    modifier onlyWithRole(bytes32 role) {
        if (!hasValidRole(role, msg.sender)) revert InsufficientRolePermissions();
        _;
    }

    function hasValidRole(bytes32 role, address account) public view returns (bool) {
        uint256 totalSupply = membershipNFT.totalSupply();
        
        for (uint256 i = 0; i < totalSupply; i++) {
            if (!membershipNFT.exists(i)) continue;
            
            try membershipNFT.ownerOf(i) returns (address owner) {
                if (owner == account) {
                    if (roleContract.hasRole(role, address(membershipNFT), i, account)) {
                        return true;
                    }
                }
            } catch {
                continue;
            }
        }
        return false;
    }

    function getVotingWeight(address account) public view returns (uint256 weight) {
        if (!hasValidRole(VOTER_ROLE, account)) return 0;

        uint256 totalSupply = membershipNFT.totalSupply();
        
        for (uint256 i = 0; i < totalSupply; i++) {
            if (!membershipNFT.exists(i)) continue;
            
            try membershipNFT.ownerOf(i) returns (address owner) {
                if (owner == account) {
                    if (roleContract.hasRole(VOTER_ROLE, address(membershipNFT), i, account)) {
                        weight += 1;
                    }
                }
            } catch {
                continue;
            }
        }
    }

    function createProposal(string memory title, string memory description) 
        external onlyWithRole(PROPOSER_ROLE) returns (uint256) {
        
        uint256 proposalId = _proposalIdCounter++;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.title = title;
        proposal.description = description;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;

        emit ProposalCreated(proposalId, msg.sender, title);
        return proposalId;
    }

    function vote(uint256 proposalId, bool support) external onlyWithRole(VOTER_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.id != proposalId) revert ProposalDoesNotExist();
        if (block.timestamp > proposal.endTime) revert VotingEnded();
        if (proposal.hasVoted[msg.sender]) revert AlreadyVoted();
        if (proposal.executed) revert ProposalNotActive();

        uint256 weight = getVotingWeight(msg.sender);
        
        proposal.hasVoted[msg.sender] = true;
        
        if (support) {
            proposal.yesVotes += weight;
        } else {
            proposal.noVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function executeProposal(uint256 proposalId) external onlyWithRole(EXECUTOR_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.id != proposalId) revert ProposalDoesNotExist();
        if (block.timestamp <= proposal.endTime) revert VotingNotEnded();
        if (proposal.executed) revert ProposalNotActive();

        uint256 totalVotes = proposal.yesVotes + proposal.noVotes;
        uint256 totalSupply = membershipNFT.totalSupply();
        uint256 quorumRequired = (totalSupply * quorumPercentage + 99) / 100;
        
        if (totalVotes < quorumRequired) revert QuorumNotMet();
        if (proposal.yesVotes <= proposal.noVotes) revert ProposalRejected();

        proposal.executed = true;
        emit ProposalExecuted(proposalId);
    }

    function getProposalState(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.id != proposalId) return ProposalState.Pending;
        if (proposal.executed) return ProposalState.Executed;
        if (block.timestamp <= proposal.endTime) return ProposalState.Active;
        
        uint256 totalVotes = proposal.yesVotes + proposal.noVotes;
        uint256 totalSupply = membershipNFT.totalSupply();
        uint256 quorumRequired = (totalSupply * quorumPercentage) / 100;
        
        if (totalVotes < quorumRequired || proposal.yesVotes <= proposal.noVotes) {
            return ProposalState.Defeated;
        }
        
        return ProposalState.Succeeded;
    }

    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory title,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 yesVotes,
        uint256 noVotes,
        bool executed
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.title,
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.yesVotes,
            proposal.noVotes,
            proposal.executed
        );
    }

    function proposalCount() external view returns (uint256) {
        return _proposalIdCounter;
    }
}