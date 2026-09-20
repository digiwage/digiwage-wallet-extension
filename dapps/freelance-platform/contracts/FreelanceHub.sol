// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// A hybrid freelance platform, meant as a worked example of a DigiWage
// dApp -- not an audited production contract. Combines two models:
//
//  - Job board (Upwork/Freelancer.com-style): an employer posts a job with
//    WAGE escrowed up front, freelancers apply publicly, the employer
//    hires one, completing the job releases the escrow.
//  - Service marketplace (Fiverr-style): a freelancer lists a fixed-price
//    service, a buyer orders it (escrowing the price), the freelancer
//    marks it delivered, and the buyer confirms to release payment.
//
// Plus on-chain profiles (display name / bio / avatar URI) any address can
// set for itself, used to give jobs, services and applications a face.
//
// Targets Shanghai (PUSH0 etc.) on purpose: this chain's evmone activates
// Shanghai at consensus.digiwage_contract_height (block 30 on forktest --
// see kernel/chainparams.cpp), well before this contract's deployment
// height, so there's no reason to target an older EVM version here.
contract FreelanceHub {
    enum JobStatus { Open, InProgress, Completed, Cancelled }
    enum OrderStatus { Placed, Delivered, Completed, Cancelled }

    struct Profile {
        string displayName;
        string bio;
        string avatarUri;
        uint256 updatedAt;
        bool exists;
    }

    struct Job {
        address employer;
        address freelancer;
        string title;
        string description;
        uint256 budget;
        JobStatus status;
        uint256 createdAt;
    }

    struct Application {
        address freelancer;
        string proposal;
        uint256 appliedAt;
    }

    struct Service {
        address freelancer;
        string title;
        string description;
        uint256 price;
        bool active;
        uint256 createdAt;
    }

    struct Order {
        uint256 serviceId;
        address buyer;
        address freelancer;
        uint256 amount;
        OrderStatus status;
        uint256 createdAt;
    }

    mapping(address => Profile) public profiles;

    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Application[]) private jobApplications;

    uint256 public serviceCount;
    mapping(uint256 => Service) public services;

    uint256 public orderCount;
    mapping(uint256 => Order) public orders;

    event ProfileUpdated(address indexed user);
    event JobPosted(uint256 indexed jobId, address indexed employer, string title, uint256 budget);
    event JobApplied(uint256 indexed jobId, address indexed freelancer);
    event FreelancerHired(uint256 indexed jobId, address indexed freelancer);
    event JobCompleted(uint256 indexed jobId);
    event JobCancelled(uint256 indexed jobId);
    event ServicePosted(uint256 indexed serviceId, address indexed freelancer, string title, uint256 price);
    event ServiceActiveSet(uint256 indexed serviceId, bool active);
    event OrderPlaced(uint256 indexed orderId, uint256 indexed serviceId, address indexed buyer);
    event OrderDelivered(uint256 indexed orderId);
    event OrderCompleted(uint256 indexed orderId);
    event OrderCancelled(uint256 indexed orderId);

    modifier onlyEmployer(uint256 jobId) {
        require(jobId < jobCount, "no such job");
        require(jobs[jobId].employer == msg.sender, "not the employer");
        _;
    }

    // ---------------------------------------------------------------
    // Profiles
    // ---------------------------------------------------------------

    function setProfile(string calldata displayName, string calldata bio, string calldata avatarUri) external {
        profiles[msg.sender] = Profile({
            displayName: displayName,
            bio: bio,
            avatarUri: avatarUri,
            updatedAt: block.timestamp,
            exists: true
        });
        emit ProfileUpdated(msg.sender);
    }

    function getProfile(address user) external view returns (
        string memory displayName,
        string memory bio,
        string memory avatarUri,
        uint256 updatedAt,
        bool exists
    ) {
        Profile storage p = profiles[user];
        return (p.displayName, p.bio, p.avatarUri, p.updatedAt, p.exists);
    }

    // ---------------------------------------------------------------
    // Job board
    // ---------------------------------------------------------------

    function postJob(string calldata title, string calldata description) external payable returns (uint256) {
        require(msg.value > 0, "budget required");
        uint256 jobId = jobCount;
        jobs[jobId] = Job({
            employer: msg.sender,
            freelancer: address(0),
            title: title,
            description: description,
            budget: msg.value,
            status: JobStatus.Open,
            createdAt: block.timestamp
        });
        jobCount += 1;
        emit JobPosted(jobId, msg.sender, title, msg.value);
        return jobId;
    }

    // Applications are intentionally public to read (getApplication /
    // getApplicationCount below take no access-control) so freelancers can
    // see who else applied and buyers can browse a job's activity -- only
    // *hiring* is restricted to the employer.
    function applyToJob(uint256 jobId, string calldata proposal) external {
        require(jobId < jobCount, "no such job");
        require(jobs[jobId].status == JobStatus.Open, "job not open");
        jobApplications[jobId].push(Application({
            freelancer: msg.sender,
            proposal: proposal,
            appliedAt: block.timestamp
        }));
        emit JobApplied(jobId, msg.sender);
    }

    function getApplicationCount(uint256 jobId) external view returns (uint256) {
        return jobApplications[jobId].length;
    }

    function getApplication(uint256 jobId, uint256 index) external view returns (
        address freelancer,
        string memory proposal,
        uint256 appliedAt
    ) {
        Application storage a = jobApplications[jobId][index];
        return (a.freelancer, a.proposal, a.appliedAt);
    }

    function hireFreelancer(uint256 jobId, address freelancer) external onlyEmployer(jobId) {
        require(jobs[jobId].status == JobStatus.Open, "job not open");
        require(freelancer != address(0), "bad freelancer address");
        jobs[jobId].freelancer = freelancer;
        jobs[jobId].status = JobStatus.InProgress;
        emit FreelancerHired(jobId, freelancer);
    }

    function completeJob(uint256 jobId) external onlyEmployer(jobId) {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.InProgress, "job not in progress");
        job.status = JobStatus.Completed;
        payable(job.freelancer).transfer(job.budget);
        emit JobCompleted(jobId);
    }

    function cancelJob(uint256 jobId) external onlyEmployer(jobId) {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Open, "already hired");
        job.status = JobStatus.Cancelled;
        payable(job.employer).transfer(job.budget);
        emit JobCancelled(jobId);
    }

    function getJob(uint256 jobId) external view returns (
        address employer,
        address freelancer,
        string memory title,
        string memory description,
        uint256 budget,
        JobStatus status,
        uint256 createdAt
    ) {
        require(jobId < jobCount, "no such job");
        Job storage job = jobs[jobId];
        return (job.employer, job.freelancer, job.title, job.description, job.budget, job.status, job.createdAt);
    }

    // ---------------------------------------------------------------
    // Service marketplace
    // ---------------------------------------------------------------

    function postService(string calldata title, string calldata description, uint256 price) external returns (uint256) {
        require(price > 0, "price required");
        uint256 serviceId = serviceCount;
        services[serviceId] = Service({
            freelancer: msg.sender,
            title: title,
            description: description,
            price: price,
            active: true,
            createdAt: block.timestamp
        });
        serviceCount += 1;
        emit ServicePosted(serviceId, msg.sender, title, price);
        return serviceId;
    }

    function setServiceActive(uint256 serviceId, bool active) external {
        require(serviceId < serviceCount, "no such service");
        require(services[serviceId].freelancer == msg.sender, "not your service");
        services[serviceId].active = active;
        emit ServiceActiveSet(serviceId, active);
    }

    function getService(uint256 serviceId) external view returns (
        address freelancer,
        string memory title,
        string memory description,
        uint256 price,
        bool active,
        uint256 createdAt
    ) {
        require(serviceId < serviceCount, "no such service");
        Service storage s = services[serviceId];
        return (s.freelancer, s.title, s.description, s.price, s.active, s.createdAt);
    }

    function orderService(uint256 serviceId) external payable returns (uint256) {
        require(serviceId < serviceCount, "no such service");
        Service storage service = services[serviceId];
        require(service.active, "service not active");
        require(msg.value == service.price, "wrong payment amount");
        require(msg.sender != service.freelancer, "can't order your own service");
        uint256 orderId = orderCount;
        orders[orderId] = Order({
            serviceId: serviceId,
            buyer: msg.sender,
            freelancer: service.freelancer,
            amount: msg.value,
            status: OrderStatus.Placed,
            createdAt: block.timestamp
        });
        orderCount += 1;
        emit OrderPlaced(orderId, serviceId, msg.sender);
        return orderId;
    }

    function deliverOrder(uint256 orderId) external {
        require(orderId < orderCount, "no such order");
        Order storage order = orders[orderId];
        require(order.freelancer == msg.sender, "not your order to deliver");
        require(order.status == OrderStatus.Placed, "order not placed");
        order.status = OrderStatus.Delivered;
        emit OrderDelivered(orderId);
    }

    // Buyer releases escrow. Callable straight from Placed too, in case
    // the buyer is happy to pay before formal delivery (common in
    // practice for small/quick services).
    function completeOrder(uint256 orderId) external {
        require(orderId < orderCount, "no such order");
        Order storage order = orders[orderId];
        require(order.buyer == msg.sender, "not your order");
        require(order.status == OrderStatus.Placed || order.status == OrderStatus.Delivered, "order not active");
        order.status = OrderStatus.Completed;
        payable(order.freelancer).transfer(order.amount);
        emit OrderCompleted(orderId);
    }

    function cancelOrder(uint256 orderId) external {
        require(orderId < orderCount, "no such order");
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Placed, "too late to cancel");
        require(msg.sender == order.buyer || msg.sender == order.freelancer, "not party to this order");
        order.status = OrderStatus.Cancelled;
        payable(order.buyer).transfer(order.amount);
        emit OrderCancelled(orderId);
    }

    function getOrder(uint256 orderId) external view returns (
        uint256 serviceId,
        address buyer,
        address freelancer,
        uint256 amount,
        OrderStatus status,
        uint256 createdAt
    ) {
        require(orderId < orderCount, "no such order");
        Order storage o = orders[orderId];
        return (o.serviceId, o.buyer, o.freelancer, o.amount, o.status, o.createdAt);
    }
}
