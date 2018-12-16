const etherlime = require('etherlime');
const CryptoCars = require('../build/CryptoCars.json');
const CryptoCarsToken = require('../build/CryptoCarsToken.json');
const helpers = require('./helpers.js');

describe('CryptoCars', () => {
    let owner = accounts[0];
    let client = accounts[1];
    let owner_address = owner.wallet.address;
    let client_address = client.wallet.address;;

    let deployer;
    let provider;
    let deployedCryptoCarsContractWrapper;
    let deployedCryptoCarsTokenContractWrapper;
    let cryptoCarsContract;
    let cryptoCarsTokenContract;
    let createCarDealerTrans;

    const CAR_DEALER_NAME = ethers.utils.formatBytes32String('BMW Motors');
    const CAR_PICTURE_HASH = ethers.utils.formatBytes32String('Qmcpo2iLBikrdf1d6QU6vXuNb')
    const MANUFACTURER_PRICE = 50
    const SALE_PRICE = 100

    beforeEach(async () => {
        deployer = new etherlime.EtherlimeGanacheDeployer(owner.secretKey);
        provider = deployer.provider;
        deployedCryptoCarsTokenContractWrapper = await deployer.deploy(CryptoCarsToken);
        cryptoCarsTokenContract = deployedCryptoCarsTokenContractWrapper.contract;
        deployedCryptoCarsContractWrapper = await deployer.deploy(CryptoCars, {}, cryptoCarsTokenContract.address);
        cryptoCarsContract = deployedCryptoCarsContractWrapper.contract;
        // Initially creates car dealer to be passed for all instances.
        createCarDealerTrans = await cryptoCarsContract.createCarDealer(CAR_DEALER_NAME);
    });

    describe('initialization', () => {
        it('should have valid private key', async () => {
            assert.strictEqual(deployer.wallet.privateKey, owner.secretKey);
        });
    });

    describe('creation of car dealer', () => {
        it('should have car dealer created with address of contract owner', async () => {
            let _carDealerAddress = await cryptoCarsContract.getCarDealerAddress(CAR_DEALER_NAME);
            let _transactionReceipt = await provider.getTransactionReceipt(createCarDealerTrans.hash);
             // Check for event
            let _transactionEvent = helpers.getTransactionEventLogs(_transactionReceipt, cryptoCarsContract, 'CreatedCarDealer')

            assert(_transactionEvent.isEventEmitted, 'Event CreatedCarDealer not emitted');
            //Check log details
            assert(_transactionEvent.logs[0].carDealer, CAR_DEALER_NAME);
            assert(_transactionEvent.logs[0].owner, owner_address);
            assert.strictEqual(_carDealerAddress, owner_address);
        });
    });

    describe('add car to specific dealer with owner account of the dealer', () => {
        it('should have car added to the specified dealer', async () => {
            let _carBrand = ethers.utils.formatBytes32String('BMW');
            let _carModel = ethers.utils.formatBytes32String('M5');

            let _transaction = await cryptoCarsContract.addCarToDealer(CAR_DEALER_NAME, _carBrand, _carModel, CAR_PICTURE_HASH, MANUFACTURER_PRICE, SALE_PRICE);

            let _totalCarDealerCarsNumber = await cryptoCarsContract.getCarDealerCarsNumber(owner.wallet.address);

            let _transactionReceipt = await provider.getTransactionReceipt(_transaction.hash);
             // Check for event
            let _transactionEvent = helpers.getTransactionEventLogs(_transactionReceipt, cryptoCarsContract, 'AddedCarToDealer')

            assert(_transactionEvent.isEventEmitted, 'Event AddedCarToDealer not emitted');
            //Check log details
            assert(_transactionEvent.logs[0].carDealer, CAR_DEALER_NAME);
            assert(_transactionEvent.logs[0].brand, _carBrand);
            assert(_transactionEvent.logs[0].model, _carModel);
            assert(_transactionEvent.logs[0].salePrice, 50);
            assert.strictEqual(_totalCarDealerCarsNumber.toNumber(), 1);

            let _carInfo = await cryptoCarsContract.getCarByDealer(owner_address, 0);

            assert.isNotNull(_carInfo);
            assert.strictEqual(_carInfo.brand, _carBrand);
            assert.strictEqual(_carInfo.model, _carModel);
            assert.strictEqual(_carInfo.pictureHash, CAR_PICTURE_HASH);
            assert.strictEqual(_carInfo.manufacturerPrice.toNumber(), MANUFACTURER_PRICE);
            assert.strictEqual(_carInfo.salePrice.toNumber(), SALE_PRICE);
        });
    });

    describe('add car to specific dealer with different account than the dealer', () => {
        it('should revert the transaction', async () => {
            let _client_contract = helpers.loadContractToClient(client, provider, cryptoCarsContract.address, CryptoCars.abi);
            let _carBrand = ethers.utils.formatBytes32String('BMW');
            let _carModel = ethers.utils.formatBytes32String('M5');

            await assert.revert(_client_contract.addCarToDealer(CAR_DEALER_NAME, _carBrand, _carModel, CAR_PICTURE_HASH, MANUFACTURER_PRICE, SALE_PRICE));
        });
    });

    describe('buy car from car dealer', () => {
        it('should have car owner entity created, the bought car should be stored into mapping, the bough car should be removed from the car dealer, event should be emiited ', async () => {
            let _carBrand = ethers.utils.formatBytes32String('BMW');
            let _carModel = ethers.utils.formatBytes32String('M5');
            let _buyerName = ethers.utils.formatBytes32String('Kevin');
            // Adds a car to the dealer
            await cryptoCarsContract.addCarToDealer(CAR_DEALER_NAME, _carBrand, _carModel, CAR_PICTURE_HASH, MANUFACTURER_PRICE, SALE_PRICE);
            // Loads a ready to use contract for a client
            let _client_contract = helpers.loadContractToClient(client, provider, cryptoCarsContract.address, CryptoCars.abi);
            const approveTransaction = await cryptoCarsTokenContract.approve(_client_contract.address, 200);
            await approveTransaction.wait();
            let _transaction = await _client_contract.buyCarFromDealer(owner_address, CAR_DEALER_NAME, 0,SALE_PRICE, _buyerName);
            await _transaction.wait();
            let _createdCarOwner = await _client_contract.carOwners(client_address);
            let _pushedCarToCarOwnerCarsMapping = await _client_contract.carOwnerCars(client_address, 0);
            let _removedCarFromDealer = await cryptoCarsContract.getCarByDealer(owner_address, 0);
            let _transactionReceipt = await provider.getTransactionReceipt(_transaction.hash);
             // Check for event
            let _transactionEvent = helpers.getTransactionEventLogs(_transactionReceipt, cryptoCarsContract, 'BoughtCarFromDealer')

            assert.isNotNull(_createdCarOwner);
            assert.isNotNull(_pushedCarToCarOwnerCarsMapping);
            assert.strictEqual(_createdCarOwner.name, _buyerName);
            assert.strictEqual(_createdCarOwner.addr, client.wallet.address);
            assert.strictEqual(_pushedCarToCarOwnerCarsMapping.brand, _carBrand);
            assert.strictEqual(_pushedCarToCarOwnerCarsMapping.model, _carModel);
            assert.strictEqual(_removedCarFromDealer.brand, '');
            assert.strictEqual(_removedCarFromDealer.model, '');
            assert(_transactionEvent.isEventEmitted, 'Event BoughtCarFromDealer not emitted');
            //Check log details
            assert(_transactionEvent.logs[0].brand, _carBrand);
            assert(_transactionEvent.logs[0].model, _carModel);
        });
    });

    // describe('buy car from directly from car owner', () => {
    //     it('TODO', async () => {
    //         await contract.addCarToDealer(CAR_DEALER_NAME, 'BMW', 'M5', HALF_ETHER, ONE_ETHER);
            // let _clientWallet = new ethers.Wallet(client.secretKey, provider);
            // let _client_contract = new ethers.Contract(contract.address, CryptoCars.abi, _clientWallet);
            // let _transaction = await _client_contract.buyCarFromDealer(owner_address, CAR_DEALER_NAME, 'BMW', 'M5', 'Kevin', {value: ONE_ETHER});

    //         let _transaction_from_owner = await contract.buyCarFromOwner(_clientWallet.address, 'BMW', 'M5', 'Joel', {value: ONE_ETHER});
    //         let _transactionReceipt = await provider.getTransactionReceipt(_transaction_from_owner.hash);
    //         let _createdCarOwner = await contract.carOwners(owner_address);
    //         let _pushedCarToCarOwnerCarsMapping = await contract.carOwnerCars(owner_address, 0);
    //         let _removedCarFromOwner = await contract.getCarByOwner(_clientWallet.address, 'BMW', 'M5');
    //          // Check for event
    //         let _isEventEmitted = utils.hasEvent(_transactionReceipt, contract, 'BoughtCarFromOwner');
    //         let _logs = utils.parseLogs(_transactionReceipt, contract, 'BoughtCarFromOwner');

    //         assert.isNotNull(_createdCarOwner);
    //         assert.isNotNull(_pushedCarToCarOwnerCarsMapping);
    //         assert.strictEqual(_createdCarOwner.name, 'Joel');
    //         assert.strictEqual(_createdCarOwner.addr, owner_address);
    //         assert.strictEqual(_pushedCarToCarOwnerCarsMapping.brand, 'BMW');
    //         assert.strictEqual(_pushedCarToCarOwnerCarsMapping.model, 'M5');
    //         assert.strictEqual(_removedCarFromOwner.brand, '');
    //         assert.strictEqual(_removedCarFromOwner.model, '');
    //         assert(_isEventEmitted, 'Event BoughtCarFromOwner not emitted');
    //         //Check log details
    //         assert(_logs[0].brand, "BMW");
    //         assert(_logs[0].model, "M5");
    //     });
    // });
});
