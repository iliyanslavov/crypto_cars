declare let require: any;
declare var web3: any;
import { Component } from '@angular/core';
import * as ethers from 'ethers';
import * as IPFS from 'ipfs-api';
const ipfs = new IPFS();
declare const Buffer;

const CryptoCars = require('./contract_interfaces/CryptoCars.json');

@Component({
  selector: 'dapp-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent {

  public address: string;
  public privateKey: string;
  public infuraApiKey = '4c2a6be609d14c4cb37a776acc1c32df';
  public infuraProvider: ethers.providers.InfuraProvider;
  public contractAddress = '0x489619Ad9E8C05971e4591bDcFe46870E48ED535';
  public deployedContract: ethers.Contract;
  public cars: Array<string>;
  public moneySpent: number;
  public manufacturerPrice: number;
  public salePrice: number;
  public carDealerAddress: string;
  public carDealer: string;
  public carBrand: string;
  public carModel: string;
  public carPrice: number;
  public buyerAddress: string;
  public buyerName: string;
  public password: string;;
  public encryptPassword: string;
  public pictureHash: string;

  constructor() {
    this.infuraProvider = new ethers.providers.InfuraProvider('rinkeby', this.infuraApiKey);
    this.deployedContract = new ethers.Contract(this.contractAddress, CryptoCars.abi, this.infuraProvider);
  }

  public async moneySpentByCarOwner() {
    const moneySpent = await this.deployedContract.carOwnerMoneySpent(this.address);
  }

  public async getCarOwnersCars() {
    let carOwnerCarsLength = await this.deployedContract.getCarOwnerCarsNumber(this.address)
    console.log(carOwnerCarsLength)
    carOwnerCarsLength = carOwnerCarsLength.toNumber()
    let tasks = []

    for (var i = 0; i < carOwnerCarsLength; i++) {
      tasks.push(await this.deployedContract.carOwnerCars(this.address, i))
    }

    Promise.all(tasks).then(result => {
      this.cars = result
    })

    const money = await this.deployedContract.carOwnerMoneySpent(this.address)
    this.moneySpent = money.toNumber()
  }

  public async getBoughtCarPrice() {
    const result = await this.deployedContract.getCarByOwner(this.address, this.carBrand, this.carModel)

    this.carPrice = result[3].toNumber()
  }

  public async addCarToDealer() {
    const json = window.localStorage.getItem('wallet');
    const initialWallet = await ethers.Wallet.fromEncryptedJson(json, this.password, callback);
    const wallet = initialWallet.connect(this.infuraProvider);
    const connectedContract = this.deployedContract.connect(wallet);
    const sentTransaction = await connectedContract.addCarToDealer(this.carDealer, this.carBrand, this.carModel, this.manufacturerPrice, this.salePrice, this.pictureHash);
    const transactionComplete = await this.infuraProvider.waitForTransaction(sentTransaction.hash);
    console.log(transactionComplete);
    alert('we are done');
    function callback(progress) {
      console.log('Decrypt: ' + progress * 100 + ' % completed');
    }
  }

  public async buyCarFromDealer() {
    const json = window.localStorage.getItem('wallet');
    const initialWallet = await ethers.Wallet.fromEncryptedJson(json, this.password, callback);
    const wallet = initialWallet.connect(this.infuraProvider);
    const connectedContract = this.deployedContract.connect(wallet);
    const sentTransaction = await connectedContract.buyCarFromDealer(this.carDealerAddress, this.carDealer, this.carBrand, this.carModel, this.buyerName, { value: 51 });
    const transactionComplete = await this.infuraProvider.waitForTransaction(sentTransaction.hash);
    console.log(transactionComplete);
    alert('we are done');
    function callback(progress) {
      console.log('Decrypt: ' + progress * 100 + ' % completed');
    }
  }

  // Create random wallet and encrypt it with password to encrypted Json
  public async createWallet() {
    const wallet = ethers.Wallet.createRandom();
    const encryptedJson = await wallet.encrypt(this.encryptPassword, callback);
    console.log(encryptedJson);
    function callback(progress) {
      console.log('Encrypt: ' + progress * 100 + ' % completed');
    }
    window.localStorage.setItem('wallet', encryptedJson);
  }


  // Download the encrypted Json wallet from local storage
  public downloadOldJSONFile() {
    const json = JSON.parse(window.localStorage.getItem('wallet'));
    const downloader = document.createElement('a');
    document.body.appendChild(downloader); // Needed for ff;

    const data = JSON.stringify(json);
    const blob = new Blob([data], { type: 'text/json' });
    const url = window.URL;
    const fileUrl = url.createObjectURL(blob);

    downloader.setAttribute('href', fileUrl);
    downloader.setAttribute('download', 'wallet-backup.json');
    downloader.click();
  }

  public async upload() {
    const reader = new FileReader();
    const self = this;
    reader.onloadend = function () {
      const buf = Buffer(reader.result); // Convert data into buffer
      ipfs.files.add(buf, (error, result) => {
        if (error) {
          console.log("something went wrong");
        }
        console.log(result[0].hash);
        self.pictureHash = result[0].hash;
      })
    }
    const photo = document.getElementById("photo");
    reader.readAsArrayBuffer(photo['files'][0]); // Read Provided File
  }
}
