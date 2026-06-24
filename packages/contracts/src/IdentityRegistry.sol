// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IdentityRegistry — minimal ERC-8004 (Trustless Agents) Identity Registry.
/// Each agent self-registers from its own address and receives a monotonic agentId. The agent
/// advertises a `domain` (where its A2A/agent card lives) and a `metadataURI`. One identity per
/// address. This is a reference implementation — intentionally small, not a full ERC-8004 build.
contract IdentityRegistry {
    struct Agent {
        address owner;
        string domain;
        string metadataURI;
        uint64 registeredAt;
    }

    uint256 public agentCount;
    mapping(uint256 => Agent) public agents;
    mapping(address => uint256) public agentIdOf; // owner => id (0 = none)

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string domain, string metadataURI);
    event AgentUpdated(uint256 indexed agentId, string domain, string metadataURI);

    /// @notice Register the caller as an agent. Reverts if already registered.
    function register(string calldata domain, string calldata metadataURI) external returns (uint256 id) {
        require(agentIdOf[msg.sender] == 0, "already registered");
        id = ++agentCount;
        agents[id] = Agent(msg.sender, domain, metadataURI, uint64(block.timestamp));
        agentIdOf[msg.sender] = id;
        emit AgentRegistered(id, msg.sender, domain, metadataURI);
    }

    /// @notice Update the caller's agent record.
    function update(string calldata domain, string calldata metadataURI) external {
        uint256 id = agentIdOf[msg.sender];
        require(id != 0, "not registered");
        agents[id].domain = domain;
        agents[id].metadataURI = metadataURI;
        emit AgentUpdated(id, domain, metadataURI);
    }

    function exists(uint256 id) public view returns (bool) {
        return id != 0 && id <= agentCount;
    }

    function ownerOf(uint256 id) external view returns (address) {
        return agents[id].owner;
    }
}
