const etherlime = require('etherlime');
const CryptoCars = require('../build/CryptoCars.json');


const deploy = async (network, secret) => {

	const deployer = new etherlime.InfuraPrivateKeyDeployer(secret, network, '4c2a6be609d14c4cb37a776acc1c32df');
	const result = await deployer.deploy(CryptoCars);

};

module.exports = {
	deploy
};
