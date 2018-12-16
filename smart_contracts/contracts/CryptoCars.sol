pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract CryptoCars is Ownable {
    /** LIBRARIES **/

    /// Importing SafeMath library from OpenZeppelin framework.
    using SafeMath for uint;

    /** EVENTS **/

    /// Event is fired, when a new car dealer is created.
    event CreatedCarDealer(bytes32 carDealer, address indexed owner);

    /// Event is fired when a new car owner is created.
    event CreatedCarOwner(bytes32 name, address indexed carOwner);

    /// Event is fired, when a new car is added to the specified dealer.
    event AddedCarToDealer(bytes32 indexed carDealer, bytes32 indexed brand, bytes32 indexed model, uint salePrice);

    /// Event is fired, when a car is bought from dealer.
    event BoughtCarFromDealer(bytes32 indexed carDealer, bytes32 model, bytes32 brand, uint boughtPrice);

    /// Event is fired, when a car is bought from dealer.
    event BoughtCarFromOwner(address indexed carOwner, bytes32 model, bytes32 brand, uint boughtPrice);

    /// Event is fired, when ownership and permissions over
    /// the car is removed from the previous car dealer.
    event RemovedCarFromDealer(address indexed carDealerAddress, bytes32 indexed carDealer, bytes32 brand, bytes32 model);

    /// Event is fired, when ownership and permissions over
    /// the car is removed from the previous car owner.
    event RemovedCarFromDealer(address indexed carOwnerAddress, bytes32 brand, bytes32 model);

    /// Event is fired, when the contract owner asks to
    /// withdraw his received funds.
     event Withdrawal(uint256 amount, uint256 timestamp);

    /** DATA TYPES **/

    /// This is the ERC-20 token contract address used to
    /// interact within the contract
    address public cryptoCarsToken;

    /// Describes car entity.
    struct Car {
        bytes32 brand;
        bytes32 model;
        uint pictureHash;
        uint manufacturerPrice;
        uint salePrice;
    }

    /// Describes car dealer entity.
    struct CarDealer {
        bytes32 name;
        address addr;
    }

    // Describes car owner entity.
    struct CarOwner {
        bytes32 name;
        address addr;
    }

    /** STORAGES **/

    /// Storing all car dealers.
    mapping(bytes32 => CarDealer) public carDealers;

    /// Storing all car owners.
    mapping(address => CarOwner) public carOwners;

    /// Storing all car owner cars.
    mapping(address => Car[]) public carOwnerCars;

    /// Storing all car dealer cars.
    mapping(address => Car[]) public carDealerCars;

    /// Storing money spent by car owner for his bought cars.
    mapping(address => uint) public carOwnerMoneySpent;

    /** CONSTRUCTOR **/

    constructor(address _cryptoCarsTokenContract) {
        cryptoCarsToken = _cryptoCarsTokenContract;
    }

    /** MODIFIERS **/

    /// Used to restrict non-owner of car dealer to adding car to it.
    modifier onlyCarDealerOwner(bytes32 _carDealer) {
        require(msg.sender == carDealers[_carDealer].addr, "Only car dealer owner can add cars.");
        _;
    }

    /** FUNCTIONS **/

    /// Creates CarDealer object and add it to the mapping storer.
    function createCarDealer(bytes32 _name) public {
        carDealers[_name] = CarDealer(_name, msg.sender);

        // Event call
        emit CreatedCarDealer(_name, msg.sender);
    }

    /// Creates CarOwner object and pushes it to the mapping.
    function _createCarOwner(bytes32 _name, Car _car) private {
        carOwners[msg.sender] = CarOwner(_name, msg.sender);

        // Event call
        emit CreatedCarOwner(_name, msg.sender);
    }

    /// The function adds a car to the specified car dealer.
    /// NOTE: Function prevents any others than car dealer owner
    /// add car.
    function addCarToDealer(
        bytes32 _carDealer,
        bytes32 _brand,
        bytes32 _model,
        uint _pictureHash,
        uint _manufacturerPrice,
        uint _salePrice
    )
        public
        onlyCarDealerOwner (_carDealer)
    {
        Car memory car = Car({
            brand: _brand,
            model: _model,
            pictureHash: _pictureHash,
            manufacturerPrice: _manufacturerPrice,
            salePrice: _salePrice
        });

        _pushCarToCarDealerCarsMappingArray(msg.sender, car);

        // Event call
        emit AddedCarToDealer(_carDealer, _brand, _model, _salePrice);
    }

    /// The function creates new mapping record
    /// with given key and initial empty value.
    function _addRecordToCarOwnerMoneySpentMapping(address _carOwnerAddress) private {
        carOwnerMoneySpent[_carOwnerAddress] = 0;
    }

    /// The function updates money spent amount
    /// of the given car owner.
    function _updateCarOwnerMoneySpentMappingValue(address _carOwnerAddress, uint amount) private {
        carOwnerMoneySpent[_carOwnerAddress] += amount;
    }

    /// The function pushes car and his car owner
    /// to the public mapping, where all cars
    /// of car owners are stored and any user
    /// have access to this view with information.
    function _pushCarToCarOwnerCarsMappingArray(address _carOwnerAddress, Car _car) private returns (uint) {
        return carOwnerCars[_carOwnerAddress].push(_car) - 1;
    }

     /// The function pushes car and his car dealer
    /// to the public mapping, where all cars
    /// of car dealers are stored and any user
    /// have access to this view with information.
    function _pushCarToCarDealerCarsMappingArray(address _carDealerAddress, Car _car) private returns (uint) {
        return carDealerCars[_carDealerAddress].push(_car) - 1;
    }

    /// The function removes car of car owner
    /// from the public mapping, where all
    /// cars of car owners are stored.
    function _removeCarFromCarOwnerCarsMapping(address _carOwnerAddress, uint _carIndex) private{
        delete carOwnerCars[_carOwnerAddress][_carIndex];
    }

    /// The function removes car of car owner
    /// from the public mapping, where all
    /// cars of car owners are stored.
    function _removeCarFromCarDealerCarsMapping(address _carDealerAddress, uint _carIndex) private{
        delete carDealerCars[_carDealerAddress][_carIndex];
    }

    /// The function removes record from mapping.
    function _removeFromCarOwnerMoneySpentMapping(address _carOwnerAddress) private {
        delete carOwnerMoneySpent[_carOwnerAddress];
    }

    /// The function presents the address of passed as argument car dealer.
    function getCarDealerAddress(bytes32 _carDealer) public view returns (address) {
        return carDealers[_carDealer].addr;
    }

    /// The function presents information about the specific car.
    function getCarByDealer(
        address _carDealer,
        uint _carIndex
    )
        public
        view
        returns (
        bytes32 brand,
        bytes32 model,
        uint pictureHash,
        uint manufacturerPrice,
        uint salePrice
    ) {
        Car memory car = carDealerCars[_carDealer][_carIndex];

        return (car.brand, car.model, car.pictureHash, car.manufacturerPrice, car.salePrice);
    }

    /// The function presents information about the specific car owned by person.
    function getCarByOwner(
        address _carOwner,
        uint _carIndex
    )
        public
        view
        returns (
        bytes32 brand,
        bytes32 model,
        uint pictureHash,
        uint manufacturerPrice,
        uint salePrice
    ) {
        Car memory car = carOwnerCars[_carOwner][_carIndex];

        return (car.brand, car.model, car.pictureHash, car.manufacturerPrice, car.salePrice);
    }

    // The function presents number of cars, that car dealer contains.
    function getCarDealerCarsNumber(address _carDealer) public view returns (uint256) {
        return carDealerCars[_carDealer].length;
    }

    // The function presents number of cars, that car owner contains.
    function getCarOwnerCarsNumber(address _carOwner) public view returns (uint256) {
        return carOwnerCars[_carOwner].length;
    }

    /// The function gives the opportunity
    /// to buy a car from specific dealer.
    /// You buying a car by sending the exact
    /// same amount of car sale price(not manufacturer).
    /// NOTE: %50 of bought car price goes
    /// to the contract as reward.
    function buyCarFromDealer(
        address _carDealerAddress,
        bytes32 _carDealer,
        uint _carIndex,
        uint tokens,
        bytes32 _buyerName
    )
        public
    {
        CarDealer storage carDealer = carDealers[_carDealer];
        Car memory car = carDealerCars[_carDealerAddress][_carIndex];
        require(carDealer.addr == _carDealerAddress);
        require(tokens == car.salePrice);
        uint priceToSent = tokens.mul(50).div(100);
        address buyerAddress = msg.sender;

        require(ERC20(cryptoCarsToken).transferFrom(buyerAddress, _carDealerAddress, priceToSent));

        if (carOwners[buyerAddress].addr != buyerAddress ) {
            _createCarOwner(_buyerName, car);
            _addRecordToCarOwnerMoneySpentMapping(buyerAddress);
        }

        _pushCarToCarOwnerCarsMappingArray(buyerAddress, car);
        _updateCarOwnerMoneySpentMappingValue(buyerAddress,tokens);
        _removeCarFromCarDealerCarsMapping(_carDealerAddress, _carIndex);

        // Event call
        emit BoughtCarFromDealer(_carDealer, car.model, car.brand, priceToSent);
    }

    /// The function gives the opportunity
    /// to buy a car from specific dealer.
    /// You buying a car by sending the exact
    /// same amount of car sale price(not manufacturer).
    /// NOTE: %50 of bought car price goes
    /// to the contract as reward.
    function buyCarFromOwner(
        address _carOwnerAddress,
        uint _carIndex,
        uint _tokens,
        bytes32 _buyerName
    )
        public
    {
        CarOwner storage carOwner = carOwners[_carOwnerAddress];
        Car memory car = carOwnerCars[_carOwnerAddress][_carIndex];
        require(carOwner.addr == _carOwnerAddress);
        require(_tokens == car.salePrice);
        uint priceToSent = _tokens.mul(50).div(100);
        address buyerAddress = msg.sender;

        require(ERC20(cryptoCarsToken).transferFrom(buyerAddress, address(this), priceToSent));

        if (carOwners[buyerAddress].addr != buyerAddress ) {
             _createCarOwner(_buyerName, car);
             _addRecordToCarOwnerMoneySpentMapping(buyerAddress);
        }

        if (carOwnerMoneySpent[_carOwnerAddress] == 0) {
            _removeFromCarOwnerMoneySpentMapping(_carOwnerAddress);
        } else {
            _updateCarOwnerMoneySpentMappingValue(_carOwnerAddress, -_tokens);
        }

        uint indexOfCar = _pushCarToCarOwnerCarsMappingArray(buyerAddress, car);
        _updateCarOwnerMoneySpentMappingValue(buyerAddress, _tokens);
        _removeCarFromCarOwnerCarsMapping(_carOwnerAddress, indexOfCar);

        // Event call
        emit BoughtCarFromOwner(buyerAddress, car.model, car.brand, priceToSent);
    }

    /// The function sends to the owner of the contract
    /// received amount of rewards.
    /// NOTE: Only contract owner can use this function.
    function withdraw() public onlyOwner() {
        ERC20 cryptoCarsTokenContract = ERC20(cryptoCarsToken);
        uint256 balance = cryptoCarsTokenContract.balanceOf(address(this));

         cryptoCarsTokenContract.transfer(owner, balance);

         emit Withdrawal(balance, now);
    }
}
