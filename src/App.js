import React, { Component } from 'react';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import LinearProgress from '@material-ui/core/LinearProgress';
import Card from '@material-ui/core/Card';
import IconButton from '@material-ui/core/IconButton';
import AccountBalanceWallet from '@material-ui/icons/AccountBalanceWallet';
import Dialog from '@material-ui/core/Dialog';
import Slide from '@material-ui/core/Slide';
import CloseIcon from '@material-ui/icons/Close';
import Send from '@material-ui/icons/Send';
import Lock from '@material-ui/icons/Lock';
import VpnKey from '@material-ui/icons/VpnKey';
import Explore from '@material-ui/icons/Explore';
import Dashboard from '@material-ui/icons/Dashboard';
import LockOpen from '@material-ui/icons/LockOpen';
import SpeakerNotes from '@material-ui/icons/SpeakerNotes';
import LinkIcon from '@material-ui/icons/Link';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import CallReceived from '@material-ui/icons/CallReceived';
import CallMade from '@material-ui/icons/CallMade';
import KeyboardArrowDown from '@material-ui/icons/KeyboardArrowDown';
import OpenInNew from '@material-ui/icons/OpenInNew';
import ErrorOutline from '@material-ui/icons/ErrorOutline';
import Refresh from '@material-ui/icons/Refresh';


import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Tooltip';
import TextField from '@material-ui/core/TextField';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Snackbar from '@material-ui/core/Snackbar';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import RadioGroup from '@material-ui/core/RadioGroup';
import Radio from '@material-ui/core/Radio';
import GridList from '@material-ui/core/GridList';
import GridListTile from '@material-ui/core/GridListTile';
import GridListTileBar from '@material-ui/core/GridListTileBar';
import ListSubheader from '@material-ui/core/ListSubheader';

import * as QRCode from "qrcode";
import xhr from "axios";
import moment from 'moment';
import CryptoJS from 'crypto-js';
import AES from 'crypto-js/aes';
import SHA256 from 'crypto-js/sha256';
import SHA512 from 'crypto-js/sha512';
import qs from 'qs';
import Identicon from 'identicon.js';
import { CopyToClipboard } from "react-copy-to-clipboard";

import logo from './digiwage-logo.png';
import './App.css';
import { generateMnemonic } from 'digiwagejs-wallet';
import { networks } from './digiwageNetworks';
import { deployContract, deployFeeBreakdown, MAX_SCRIPT_ELEMENT_SIZE } from './deploy';
import { supportsSidePanel, isSidePanelMode, getPanelMode, setPanelMode, openSidePanel, closeSidePanel } from './sidepanel';
import VerticalSplit from '@material-ui/icons/VerticalSplit';
import PictureInPictureAlt from '@material-ui/icons/PictureInPictureAlt';
import Tune from '@material-ui/icons/Tune';


const dappurl = null;

const theme = createMuiTheme({
  palette: {
    type: 'dark',
    background: {
      default: '#131316',
      paper: '#1c1c21',
    },
    primary: {
      // TextField/Input underlines read palette.primary.light for their
      // focused-state color in this MUI version (see node_modules/
      // @material-ui/core/Input/Input.js) -- keeping this a dark surface
      // tone made every focused field invisible against the dark
      // background, so it's set to the accent gold instead. AppBar/Card
      // surfaces get their dark background from CSS classes directly, not
      // from this palette slot, so this doesn't affect them.
      light: '#f0c454',
      main: '#1c1c21',
      dark: '#0d0d0f',
      contrastText: '#ffffff',
    },
    secondary: {
      light: '#f4d074',
      main: '#f0c454',
      dark: '#d1a636',
      contrastText: '#17140b',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
});

function Transition(props) {
  return <Slide direction="up" {...props} />;
}

class App extends Component {
  state = {
    appsalt:null,
    passwordHash:null,
    passwordSHA256:null,
    account:null,
    accounts:null,
    identicon:null,
    activeAccount:null,
    receiveOpen: false,
    sendOpen: false,
    keyOpen:false,
    importPrivateKeyOpen:false,
    importMnemonicOpen:false,
    loading: false,
    loadingMessage: '',
    snackbarOpen: false,
    snackbarMessage: '',
    selectedTab: 0,
    backupPrivateKeyOpen: false,
    showPrivateKey: false,
    createAccountPassword: '',
    importMnemonic:'',
    importMnemonicPassword:'',
    sendToContractPopupOpen: false,
    deployContractPopupOpen: false,
    panelSettingsOpen: false,
    panelMode: 'popup',
    accountsOpen:false,
    anchorEl: null,
    showDappsOpen:false,
    resetWalletOpen: false,
    dapps:null,
  };

  clear = async () => {
    this.setState({
      passwordHash:null,
      passwordSHA256:null,
      privateKey: null,
      address: null,
      account: null,
      accounts:null,
      identicon:null,
      activeAccount:null,
      accountDetailsOpen: false,
      receiveOpen: false,
      sendOpen: false,
      keyOpen:false,
      importPrivateKeyOpen:false,
      importMnemonicOpen:false,
      freezeOpen: false,
      snackbarOpen: false,
      isLoading: false,
      backupPrivateKeyOpen: false,
      showPrivateKey: false,
      transactions: undefined,
      importPrivateKey: '',
      createAccountPassword: '',
      importMnemonic:'',
      importMnemonicPassword:'',
      sendToContractPopupOpen: false,
      deployContractPopupOpen: false,
      accountsOpen: false,
      anchorEl: null,
      showDappsOpen:false,
      resetWalletOpen: false,
      dapps:null,
    });

    await this.setPasswordHashFromBackgroundPage(null);
    await this.setActiveAccountFromBackgroundPage(null);
    await this.setActivePrivateKeyFromBackgroundPage(null);
  };

  componentDidMount() {
    this.initData();
    // The side panel never hosts a dApp confirmation: those keep opening
    // their own popup window, so this is only read outside side-panel mode.
    if (!isSidePanelMode()) {
      this.initConfirmationPopup();
    } else {
      document.body.classList.add('dw-sidepanel-body');
    }
    if (supportsSidePanel()) {
      getPanelMode().then(panelMode => this.setState({ panelMode }));
    }
    window.chrome.storage.onChanged.addListener(this.onStorageChanged);
    window.addEventListener("beforeunload", this.onUnload);
    // Chrome wipes session storage when the extension is reloaded or the
    // browser restarts, without firing a change event. A view left open
    // would keep showing "unlocked" while dApps (which read that storage)
    // see a locked wallet, so check now and then and fall back to the lock
    // screen instead of pretending.
    this.sessionCheck = setInterval(async () => {
      if (this.state.sendToContractPopupOpen || this.state.deployContractPopupOpen) {
        return;
      }
      if (this.state.passwordHash && !(await this.getPasswordHashFromBackgroundPage())) {
        this.syncFromStorage();
      }
    }, 2000);
  }

  componentWillUnmount() {
    window.removeEventListener("beforeunload", this.onUnload);
    window.chrome.storage.onChanged.removeListener(this.onStorageChanged);
    clearTimeout(this.syncTimer);
    clearInterval(this.sessionCheck);
  }

  // Popup and side panel are two views of one wallet. Unlock state lives in
  // chrome.storage.session and the network/accounts in chrome.storage.local,
  // so a change made in one view is picked up here. Only values that differ
  // from what this view already shows trigger a resync, which keeps the
  // writes done by loadActiveAccount() from echoing back into a loop.
  onStorageChanged = (changes, area) => {
    // A dApp confirmation window is self-contained; leave it alone.
    if (this.state.sendToContractPopupOpen || this.state.deployContractPopupOpen) {
      return;
    }
    const accountKey = account => (account ? account.account : null);
    let relevant = false;
    if (area === 'session') {
      if (changes.passwordHash && (changes.passwordHash.newValue || null) !== (this.state.passwordHash || null)) {
        relevant = true;
      }
      if (changes.activeAccount && accountKey(changes.activeAccount.newValue) !== accountKey(this.state.activeAccount)) {
        relevant = true;
      }
    }
    if (area === 'local') {
      if (changes.network && changes.network.newValue && changes.network.newValue !== this.state.network) {
        relevant = true;
      }
      if (changes.accounts) {
        relevant = true;
      }
      if (changes.panelMode) {
        this.setState({ panelMode: changes.panelMode.newValue === 'sidepanel' ? 'sidepanel' : 'popup' });
      }
    }
    if (relevant) {
      clearTimeout(this.syncTimer);
      this.syncTimer = setTimeout(this.syncFromStorage, 150);
    }
  };

  syncFromStorage = async () => {
    const passwordHash = await this.getPasswordHashFromBackgroundPage();
    if (!passwordHash) {
      // Locked in the other view: drop the secrets held in this one. This
      // deliberately does not write to storage (clear() does), so it cannot
      // bounce the lock back.
      this.setState({
        passwordHash: null,
        privateKey: null,
        address: null,
        identicon: null,
        activeAccount: null,
        transactions: undefined,
        sendOpen: false,
        receiveOpen: false,
        keyOpen: false,
        showPrivateKey: false
      });
      return;
    }
    const network = await this.getNetworkFromLocalStorage();
    const accounts = await this.getAccountsFromLocalStorage();
    const activeAccount = await this.getActiveAccountFromBackgroundPage();
    this.setState({
      passwordHash,
      accounts,
      activeAccount,
      network: network === 'DIGIWAGE_MAINNET' ? 'DIGIWAGE_MAINNET' : 'DIGIWAGE_FORKTEST'
    }, this.loadActiveAccount);
  };

  openInSidePanel = async () => {
    try {
      await openSidePanel();
      window.close();
    } catch (e) {
      this.setState({ snackbarOpen: true, snackbarMessage: `Could not open the side panel: ${e.message}` });
    }
  };

  switchToPopupMode = async () => {
    await setPanelMode('popup');
    await closeSidePanel();
  };

  changePanelMode = async event => {
    const panelMode = event.target.value;
    await setPanelMode(panelMode);
    this.setState({ panelMode });
  };

  onUnload = event => {
    if (this.state.sendToContractPopupOpen || this.state.deployContractPopupOpen) {
      this.cancelTransaction();
    }
  };

  initData = async () =>{

    // initialize appsalt, generated per install
    // get from storage or set in storage if does not exist

    let appSalt = await this.getAppSaltFromLocalStorage();
    if(!appSalt)
    {
      appSalt = await this.setAppSaltLocalStorage();
    }
    this.setState({ appSalt });



    if (!this.state.network) {
      const network = await this.getNetworkFromLocalStorage();
      if(network) {
        if(network === 'DIGIWAGE_MAINNET') {
          this.setState({ network: 'DIGIWAGE_MAINNET' });
        } else {
          this.setState({ network: 'DIGIWAGE_FORKTEST' });
        }
      } else {
        this.setState({ network: 'DIGIWAGE_FORKTEST' });
        await this.setNetworkLocalStorage('DIGIWAGE_FORKTEST');
      }
    }
    this.loadPrice();

    // Retrieve passwordHash
    // passwordHash is generated from user password and stored in background page
    // it is only required every time user open chrome
    // passwordHash is used for encrypt all the private keys
    var passwordHash = await this.getPasswordHashFromBackgroundPage();

    this.setState({ passwordHash });

    var passwordSHA256 = await this.getPasswordSHA256FromLocalStorage();
    this.setState({ passwordSHA256 });

    if(passwordSHA256)
    {
       let walletLabel = 'Unlock Wallet';
       this.setState({walletLabel});
       this.setState({walletInitialised: true});
    }else{
       let walletLabel = 'Create Wallet';
       this.setState({walletLabel});
       this.setState({walletInitialised: false});
    }

    var accounts = await this.getAccountsFromLocalStorage();
    this.setState({accounts});

    if(!this.state.accounts)
    {
      this.setState({importOpen:true});
    }else
    {
      this.setState({importOpen:false});
    }

    var activeAccount = await this.getActiveAccountFromBackgroundPage();

    this.setState({activeAccount});

    await this.loadActiveAccount();

    if (!this.state.sendFeeRate) {
      this.setState({ sendFeeRate: 1000 });
    }
  };

  loadDapp = async () => {
      const { data } = await xhr.get(dappurl, {timeout: 5000});
      this.setState({ dapps : data.result });
  };

  loadActiveAccount = async() =>{
    let accounts = this.state.accounts;
    let passwordHash = this.state.passwordHash;
    if(accounts && passwordHash)
    {

      let activeAccount = this.state.activeAccount;

      if(!activeAccount)
      {
        activeAccount = this.state.accounts[0];
        await this.setActiveAccountFromBackgroundPage(activeAccount);
      }

      if(activeAccount)
      {
        let privateKey = (AES.decrypt(activeAccount.account,passwordHash)).toString(CryptoJS.enc.Utf8);
        await this.setActivePrivateKeyFromBackgroundPage(privateKey);

        const network = this.getNetwork();
        const wallet = await network.fromWIF(privateKey);
        let address = wallet.address;
        let identicon = new Identicon(address, 64).toString();

        try{
          this.setState({
            address,
            identicon,
            privateKey: privateKey,
            accounts: this.state.accounts
          }, () => {
            this.prepareKey(privateKey);
          });
        } catch(e) {
          console.log(e);
        }
      }
    }
  };

  // ******************
  // Local Storage
  // ******************

  setAppSaltLocalStorage = () => {
    return new Promise(resolve => {
       var wordArray = CryptoJS.lib.WordArray.random(32);
       /* eslint-disable no-undef */
       chrome.storage.local.set(
        {'appsalt': wordArray.toString()},function (result) {
        resolve(wordArray.toString());
       });
     });
  };

  getAppSaltFromLocalStorage = () => {
    return new Promise(resolve => {
      /* eslint-disable no-undef */
      chrome.storage.local.get('appsalt', function (result) {
        let appsalt = result.appsalt;
        if (appsalt)
        {
          resolve(appsalt.toString());
        } else {
          resolve(null);
        }
      });
    });
  };


 setPasswordSHA256LocalStorage = (pwdhash) => {
    return new Promise(resolve => {
      /* eslint-disable no-undef */
       chrome.storage.local.set(
        {'pwdhash': pwdhash},function (result) {
        resolve(pwdhash);
       });
     });
  };

  getPasswordSHA256FromLocalStorage = () => {
    return new Promise(resolve => {
      /* eslint-disable no-undef */
      chrome.storage.local.get('pwdhash', function (result) {
        let pwdhash = result.pwdhash;
        if(pwdhash)
        {
          resolve(pwdhash.toString());
        }else{
          resolve(null);
        }
      });
    });
  };

  getAccountsFromLocalStorage = () => {
    return new Promise(resolve => {
      /* eslint-disable no-undef */
      chrome.storage.local.get('accounts', function (result) {
        let accounts = result.accounts;
        if(accounts)
        {
          resolve(accounts);
        }else{
          resolve(null);
        }
      });
    });
  };

  setAccountsLocalStorage = (accounts) => {
    return new Promise(resolve => {
      /* eslint-disable no-undef */
       chrome.storage.local.set(
        {'accounts': accounts},function (result) {
        resolve(accounts);
       });
     });
  };

  getNetworkFromLocalStorage = () => {
    return new Promise(resolve => {
      /* eslint-disable no-undef */
      chrome.storage.local.get('network', function (result) {
        let network = result.network;
        if(network)
        {
          resolve(network);
        }else{
          resolve(null);
        }
      });
    });
  };

  setNetworkLocalStorage = (network) => {
    return new Promise(resolve => {
      /* eslint-disable no-undef */
       chrome.storage.local.set(
        {'network': network},function (result) {
        resolve(network);
       });
     });
  };

  // MV3 service workers have no persistent `window` to call into directly
  // (chrome.extension.getBackgroundPage() does not exist for them), so this
  // ephemeral unlock state lives in chrome.storage.session instead -- it is
  // memory-only (never written to disk) and is cleared when the browser
  // closes, matching the previous background-page lifetime.
  getPasswordHashFromBackgroundPage = () => {
    return new Promise(resolve => {
      window.chrome.storage.session.get(['passwordHash'], result => {
        resolve(result.passwordHash || null);
      });
    });
  };

  setPasswordHashFromBackgroundPage = (data) => {
    return new Promise(resolve => {
      window.chrome.storage.session.set({passwordHash: data}, () => {
        resolve(data);
      });
    });
  };

  getActiveAccountFromBackgroundPage = () => {
    return new Promise(resolve => {
      window.chrome.storage.session.get(['activeAccount'], result => {
        resolve(result.activeAccount || null);
      });
    });
  };

  setActiveAccountFromBackgroundPage = (data) => {
    return new Promise(resolve => {
      window.chrome.storage.session.set({activeAccount: data}, () => {
        resolve(data);
      });
    });
  };

  setActivePrivateKeyFromBackgroundPage = (data) => {
    return new Promise(resolve => {
      window.chrome.storage.session.set({activePrivateKey: data}, () => {
        resolve(data);
      });
    });
  };

  getAppSalt(){
    return this.state.appsalt;
  }

  createAppHashPassword = async () => {
    let {createAppHashPassword} = this.state;
    let appSalt = await this.getAppSaltFromLocalStorage();

    var passwordSHA256 = await this.getPasswordSHA256FromLocalStorage();
    var pwdSHA256 = SHA256(createAppHashPassword).toString();

    var passwordValid = true;
    if (passwordSHA256) { // if there is a passwordSHA256 in local storage, compare to what is entered
      if(pwdSHA256 !== passwordSHA256) {
        passwordValid = false;
      }
    } else {
      await this.setPasswordSHA256LocalStorage(pwdSHA256);
    }

    if (!passwordValid) {
      console.log('invalid password');
      return false;
    }

    //generate passwordHash and set to background page
    var pwdHashObj = SHA512(createAppHashPassword, appSalt);
    var pwdHash = pwdHashObj.toString();

    let passwordHash = await this.setPasswordHashFromBackgroundPage(pwdHash);

    this.setState({ passwordHash });

    var accounts = await this.getAccountsFromLocalStorage();
    this.setState({accounts});

    var activeAccount = await this.getActiveAccountFromBackgroundPage();
    this.setState({activeAccount});

    await this.loadActiveAccount();

    this.setState({createAppHashPassword: ''});
  };

  resetAppHashPassword = async () => {
    await this.setAppSaltLocalStorage(null);
    await this.setPasswordSHA256LocalStorage(null);
    await this.setAccountsLocalStorage(null);

    await this.setPasswordHashFromBackgroundPage(null);
    await this.setActiveAccountFromBackgroundPage(null);
    await this.setActivePrivateKeyFromBackgroundPage(null);


    this.setState({resetWalletOpen : false});
    this.setState({ passwordHash: null});
    this.setState({accounts : null});
    this.setState({activeAccount : null});
    this.setState({createAppHashPassword:''});

    let walletLabel = 'Create Wallet';
    this.setState({walletLabel});
    this.setState({walletInitialised: false});
  };


  initConfirmationPopup = () => {
    const parsedQueryString = qs.parse(window.location.search.substr(1));

    if (!parsedQueryString
      || !parsedQueryString.data) {
      return;
    }

    const queryData = JSON.parse(parsedQueryString.data);
    if (!queryData
      || !queryData.data
      || !queryData.serialNumber
      || !queryData.method) {
      return;
    }

    // deploy a contract: the (possibly large) payload was parked in the
    // background worker's session storage rather than in the URL
    if (queryData.method === 'deployContract') {
      const serialNumber = queryData.serialNumber;
      window.chrome.runtime.sendMessage(
        { target: 'digiwage-background', method: 'getPendingRequest', serialNumber },
        response => {
          const request = response && response.request;
          if (!request) {
            this.setState({ snackbarMessage: 'This deployment request has expired. Please try again from the dApp.' });
            return;
          }
          this.setState({
            deployContractName: request.name || 'Contract',
            deployContractBytecode: request.bytecode || '',
            deployContractAmount: parseInt(request.amount || 0, 10),
            deployContractGasLimit: request.txData.gasLimit,
            deployContractGasPrice: Number(request.txData.gasPrice).toFixed(8),
            deployContractError: null,
            deployContractBusy: false,
            deployContractPopupOpen: true,
            serialNumber
          }, this.updateDeployEstimate);
        }
      );
      return;
    }

    // send to a contract (write function)
    if (queryData.method === 'sendToContract') {
      const sendToContractData = queryData.data;
      const serialNumber = queryData.serialNumber;
      this.setState({
        sendToContractDataContractAddress: sendToContractData.address,
        sendToContractDataContractMethod: sendToContractData.method,
        sendToContractDataContractData: sendToContractData.encodedData,
        sendToContractDataContractHexData: sendToContractData.encodedData.toString('hex'),
        sendToContractDataAmount: sendToContractData.amount,
        // toFixed, not the raw number: JS renders small floats like
        // 0.0000004 in exponential notation ("4e-7") by default, which
        // looked broken in the confirmation popup despite being the
        // correct value.
        sendToContractDataGasPrice: sendToContractData.txData.gasPrice.toFixed(8),
        sendToContractDataGasLimit: sendToContractData.txData.gasLimit,
        sendToContractPopupOpen: true,
        serialNumber
      });
    }
  };

  getNetwork = () =>{
    if(this.state.network === 'DIGIWAGE_MAINNET')
    {
      return networks.digiwageMainnet;
    }else if(this.state.network === 'DIGIWAGE_FORKTEST'){
      return networks.digiwageForktest;
    }else{
      return networks.digiwageForktest;
    }
  };

  // TODO: replace with the permanent production explorer domain before release.
  getExplorerApiAddress = () =>{
    if(this.state.network === 'DIGIWAGE_MAINNET')
    {
      return 'https://api.digiwage.org/insight-api/txs/?pageNum=0&address=';
    }else if(this.state.network === 'DIGIWAGE_FORKTEST'){
      return 'http://194.163.172.250:7001/insight-api/txs/?pageNum=0&address=';
    }else{
      return '';
    }
  };

  getExplorerAddress = () =>{
    if(this.state.network === 'DIGIWAGE_MAINNET')
    {
      return 'https://explorer.digiwage.org/address/';
    }else if(this.state.network === 'DIGIWAGE_FORKTEST'){
      return 'http://194.163.172.250:3000/address/';
    }else{
      return '';
    }
  };

  coinToSatoshi = (amount) =>{
    return amount * 100000000;
  };

  getExplorerTx = () =>{
    if(this.state.network === 'DIGIWAGE_MAINNET')
    {
      return 'https://explorer.digiwage.org/tx/';
    }else if(this.state.network === 'DIGIWAGE_FORKTEST'){
      return 'http://194.163.172.250:3000/tx/';
    }else{
      return '';
    }
  };

  // DigiWage's own explorer (digiwage-explorer-api) exposes /misc/prices
  // for CoinId 1684 (WAGE).
  getPricesApiAddress = () =>{
    if(this.state.network === 'DIGIWAGE_MAINNET')
    {
      return 'https://api.digiwage.org/misc/prices';
    }else if(this.state.network === 'DIGIWAGE_FORKTEST'){
      return 'http://194.163.172.250:7001/misc/prices';
    }else{
      return '';
    }
  };

  //**************************
  //*****Local Functions *****
  //**************************

  createAccount = async () => {
    let {createAccountPassword} = this.state;

    const mnemonic = generateMnemonic();
    const network = this.getNetwork();

    const wallet = await network.fromMnemonic(mnemonic, createAccountPassword)

    let privateKey=wallet.toWIF();

    await this.getAppSaltFromLocalStorage();
    let passwordHash = await this.getPasswordHashFromBackgroundPage();
    let accounts = await this.getAccountsFromLocalStorage();
    if(!accounts)
    {
      accounts = [];
    }

    let encryptedPrivateKey = AES.encrypt(privateKey,passwordHash).toString();

    let activeAccount = {
      'address': wallet.address,
      'account': encryptedPrivateKey
    };

    accounts.push(activeAccount);
    await this.setAccountsLocalStorage(accounts); // set to storage

    await this.setActiveAccountFromBackgroundPage(activeAccount); // set activeAccount to background
    await this.setActivePrivateKeyFromBackgroundPage(privateKey);

    this.setState({
      activeAccount,
      accounts,
      privateKey,
      mnemonic,
      createAccountPassword: '',
      backupPrivateKeyOpen: true,
      importOpen: false,
    });

    await this.loadActiveAccount(); // load active account
  };

  importPrivateKey = async () => {
    let {importPrivateKey} = this.state;

    try{

      const network = this.getNetwork();
      const wallet = await network.fromWIF(importPrivateKey);

      await this.getAppSaltFromLocalStorage();
      let passwordHash = await this.getPasswordHashFromBackgroundPage();
      let accounts = await this.getAccountsFromLocalStorage();
      if(!accounts)
      {
        accounts = [];
      }


      let encryptedPrivateKey = AES.encrypt(importPrivateKey,passwordHash).toString();

      let activeAccount = {
        'address': wallet.address,
        'account': encryptedPrivateKey
      };

      accounts.push(activeAccount);
      await this.setAccountsLocalStorage(accounts); // set to storage

      await this.setActiveAccountFromBackgroundPage(activeAccount); // set activeAccount to background
      await this.setActivePrivateKeyFromBackgroundPage(importPrivateKey);

      this.setState({
        activeAccount:activeAccount,
        accounts:accounts,
        privateKey:importPrivateKey,
        importPrivateKey: '',
        importMnemonic:'',
        importMnemonicPassword:'',
        importPrivateKeyOpen:false,
        importMnemonicOpen:false,
        importOpen: false,
      });

      await this.loadActiveAccount(); // load active account

    } catch(e) {
      console.log(e);
      this.setState({
        isLoading: false,
        snackbarOpen: true,
        snackbarMessage: `Fail to process, make sure you select the correct network`,
      });
    }
  };

   importMnemonic = async () => {
    let {importMnemonic,importMnemonicPassword} = this.state;

    try{

      const network = this.getNetwork();
      const wallet = await network.fromMnemonic(importMnemonic, importMnemonicPassword)
      const privateKey = wallet.toWIF();

      await this.getAppSaltFromLocalStorage();
      let passwordHash = await this.getPasswordHashFromBackgroundPage();
      let accounts = await this.getAccountsFromLocalStorage();
      if(!accounts)
      {
        accounts = [];
      }
      let encryptedPrivateKey = AES.encrypt(privateKey,passwordHash).toString();
      let activeAccount = {
        'address': wallet.address,
        'account': encryptedPrivateKey
      };
      accounts.push(activeAccount);
      await this.setAccountsLocalStorage(accounts); // set to storage

      await this.setActiveAccountFromBackgroundPage(activeAccount); // set activeAccount to background
      await this.setActivePrivateKeyFromBackgroundPage(privateKey);

      this.setState({
        activeAccount:activeAccount,
        accounts:accounts,
        privateKey: privateKey,
        importPrivateKey: '',
        importMnemonic:'',
        importMnemonicPassword:'',
        importPrivateKeyOpen:false,
        importMnemonicOpen:false,
        importOpen: false,
      });

      await this.loadActiveAccount(); // load active account

    } catch(e) {
      console.log(e);
      this.setState({
        isLoading: false,
        snackbarOpen: true,
        snackbarMessage: `Fail to process, make sure you select the correct network`,
      });
    }
  };

  prepareKey = (key) => {
    this.setState({
      privateKey: key
    }, () => {
      this.loadAccount();
      this.loadTransactions();
    });
  };

  reloadAccountDetails = () => {
    this.setState({
            isLoading: false,
            snackbarOpen: true,
            snackbarMessage: 'Reloading',
    }, () => {
      this.loadAccount();
      this.loadTransactions();
    });
  };

  //**************************
  //*****Network functions ***
  //**************************

  async loadAccount() {
    if (this.state.address) {
      var that = this;
      const network = this.getNetwork();
      const wallet = await network.fromWIF(this.state.privateKey);
      const info = await wallet.getInfo();
      that.setState({
          account:info
      });
    }
  }

  async loadTransactions() {
    if (this.state.address) {
      const { data } = await xhr.get(`${this.getExplorerApiAddress()}${this.state.address}`);
      if(data && data.txs) {
        this.setState({ transactions: data.txs });
      }
    }
  }

  sendToken = async () => {
    const {sendTo, sendAmount, sendFeeRate} = this.state;
    this.setState({ isLoading: true });

    const network = this.getNetwork();
    const wallet = await network.fromWIF(this.state.privateKey);

    var amt = parseFloat(sendAmount) * 1e8;
    var fr = parseFloat(sendFeeRate);
    try{

      const tx = await wallet.send(sendTo, amt, {
        // rate is 400 satoshi per byte, or  ~0.004 WAGE/KB, as is typical.
        feeRate: fr,
      })

       if (tx) {
        this.setState({
          isLoading: false,
          snackbarOpen: true,
          snackbarMessage: 'Succesfully sent tokens!',
          sendTo: '',
          sendAmount: '',
        }, () => {
          this.loadAccount();
          this.loadTransactions();
          this.handleSendClose();
        });
      }

    }catch(e)
    {
      console.log(e);
      this.setState({
          isLoading: false,
          snackbarOpen: true,
          snackbarMessage: `Sent failed, please retry later.`,
        });
    }
  };

  async loadPrice() {
    try {
      const url = this.getPricesApiAddress();
      if (!url) {
        return;
      }
      const { data } = await xhr.get(url);
      if (data && data.USD) {
        this.setState({ price: { price: data.USD } });
      }
    } catch (err) {
      // Price ticker is informational only; leave it hidden on failure
      // rather than breaking the wallet UI.
    }
  }

  //**************************
  //*****Validation Functions*****
  //**************************

  isPrivateKeyValid = () => {

    let {importPrivateKey} = this.state;
    if (!importPrivateKey || importPrivateKey.length === 0) {
      return false;
    }
    return true; // tokenliqa.util.verifyPrivateKey(importPrivateKey);
  };

  isMnemonicValid = () => {

    let {importMnemonic} = this.state;
    if (!importMnemonic || importMnemonic.length === 0) {
      return false;
    }

    return true;
  };


  //**************************
  //*****Handle Functions*****
  //**************************
  handleChange = name => event => {
    this.setState({
      [name]: event.target.value,
    });
  };

  setSendAmount = (amount) => {
    const sendAmount = amount.replace(/^0+(?!\.|$)/, '').replace(/[^0-9 .]+/g,'').replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1");
    this.setState({
      sendAmount
    });

  };
  setFeeRate = (amount) => {
    const sendFeeRate = amount.replace(/^0+(?!\.|$)/, '').replace(/[^0-9 .]+/g,'').replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1");
    this.setState({
      sendFeeRate
    });
  };

  isSendValid = () => {
    const {sendTo, sendAmount} = this.state;
    const address = this.state.address;
    const addressUpperCase = address?address.toUpperCase():'';
    const sendToUpperCase = sendTo?sendTo.toUpperCase():'';

    return this.isAddress(sendTo) && parseFloat(this.state.account.balance) >= parseFloat(sendAmount) && sendAmount > 0 && sendToUpperCase !== addressUpperCase;
  };

  isAddress = (address) => {
    return address && address.length === 34;
  };

  changeNetwork = async () => {
    const { networkInSelection } = this.state;
    await this.setAccountsLocalStorage(null);
    await this.setNetworkLocalStorage(networkInSelection);
    this.setState({
      network: networkInSelection,
      accounts: null,
      importOpen: true,
      isLoading: false,
      snackbarOpen: true,
      snackbarMessage: 'Network switched',
      networkOpen: false
    }, () => {
      this.clear();
    });

  };

  //**************************
  //*****Render Functions*****
  //**************************

  renderDashboard() {
    if (!this.state.account) {
      return (
        <div>
          <LinearProgress/>
        </div>
      );
    }
    const balance = this.state.account.balance;
    const price = this.state.price;
    const accounts = this.state.accounts;
    const identicon = 'data:image/png;base64,' + this.state.identicon;

    return (
      <div className="dw-cards-wrap">
          <Card className="dw-hero">
              <div className="dw-hero-toprow">
                  <button className="dw-account-chip" aria-haspopup="true"
                    aria-owns={this.state.anchorEl ? 'menuAccountsSelection' : null}
                    onClick={this.handleAccountsOpen}>
                    <span className="dw-identicon-ring"><img src={identicon} alt="identicon" /></span>
                    <span>{this.getAddressAbv(this.state.address)}</span>
                    <KeyboardArrowDown className="dw-caret-sm" />
                  </button>

                  <Menu
                    id='menuAccountsSelection'
                    anchorEl={this.state.anchorEl}
                    open={this.state.accountsOpen}
                    onClose={this.handleAccountsClose.bind(this, null)}
                  >
                    {accounts.map(option => (
                      <MenuItem key={option.account}
                      selected={option.address === this.state.address}
                      onClick={this.handleAccountsClose.bind(this, option.account)}>
                        {option.address}
                      </MenuItem>
                    ))}

                    <MenuItem key='import'
                      onClick={this.handleAccountsCloseImport}>
                        Import Account
                    </MenuItem>
                  </Menu>

                  <Tooltip title="Refresh balance">
                    <IconButton className="dw-icon-btn" onClick={this.reloadAccountDetails} aria-label="Refresh balance">
                      <Refresh fontSize="small" />
                    </IconButton>
                  </Tooltip>
              </div>

              <div className="dw-balance-row">
                <span className="dw-balance-amount">{balance}</span>
                <span className="dw-balance-ticker">WAGE</span>
              </div>
              {price && <div className="dw-balance-usd">${price.price} USD</div>}

              <div className="dw-address-row">
                <span className="dw-address-text">{this.state.address}</span>
                <CopyToClipboard text={this.state.address} onCopy={() => this.handleCopyToClipBoard()}>
                  <Tooltip title="Copy address">
                    <IconButton className="dw-address-action" aria-label="Copy address">
                      <FileCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CopyToClipboard>
                <Tooltip title="View on explorer">
                  <IconButton className="dw-address-action" onClick={this.goToExplorerAddress} aria-label="View on explorer">
                    <OpenInNew fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Show private key">
                  <IconButton className="dw-address-action" onClick={this.showKey} aria-label="Show private key">
                     <VpnKey fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
          </Card>
      </div>
    )
  }

  async loadQRCode() {
    const qrcode = await QRCode.toDataURL(this.state.address);
    this.setState({ qrcode });
  }

  goToExplorerAddress = () => {
    window.open(`${this.getExplorerAddress()}${this.state.address}`, '_blank');
  };

  showReceive = () => {
    this.setState({ receiveOpen: true });
  };

  handleReceiveClose = () => {
    this.setState({ receiveOpen: false });
  };

  showSend = () => {
    this.setState({ sendOpen: true });
  };

  handleSendClose = () => {
    this.setState({ sendOpen: false });
  };

  showKey = () => {
    this.setState({ keyOpen: true });
  };

  handleKeyClose = () => {
    this.setState({ keyOpen: false });
  };

  handleCopyToClipBoard = () => {
    this.setState({
              isLoading: false,
              snackbarOpen: true,
              snackbarMessage: 'Copied to clipboard.'
            });
  };


  handleNetworkClose = () => {
    this.setState({ networkOpen: false });
  };

  showNetwork = () => {
    const { network } = this.state;
    this.setState({ networkOpen: true, networkInSelection: network });
  };

  handleBackupPrivateKeyClose = () => {
    this.setState({
      backupPrivateKeyOpen: false,
    })
  };

  handleDappLinkClicked = (url) => {
    window.open(url, "_blank")
  };

  showImportPrivateKey = () => {
    this.setState({ importPrivateKeyOpen: true });
  };

  handleImportPrivateKeyClose = () => {
    this.setState({ importPrivateKeyOpen: false });
  };

  showImportMnemonic = () => {
    this.setState({ importMnemonicOpen: true });
  };

  handleImportMnemonicClose = () => {
    this.setState({ importMnemonicOpen: false });
  };

  handleAccountsOpen = (event) => {
    this.setState({ accountsOpen: true });
    this.setState({ anchorEl: event.currentTarget  });
  };

  handleAccountsClose = async (value) => {
    this.setState({ accountsOpen: false });
    this.setState({ anchorEl: null });

    // set activeAccounts
    let accounts = this.state.accounts;
    let passwordHash = this.state.passwordHash
    if(accounts && passwordHash)
    {

      let activeAccount = null;
      for(var i=0;i<this.state.accounts.length;i++)
      {
        if(this.state.accounts[i].account === value)
        {
          activeAccount = this.state.accounts[i];
        }
      }
      if(!activeAccount)
      {
        activeAccount = this.state.accounts[0];
      }

      if(activeAccount)
      {
        this.setState({activeAccount});

        await this.setActiveAccountFromBackgroundPage(activeAccount); // set background

        let privateKey = (AES.decrypt(activeAccount.account,passwordHash)).toString(CryptoJS.enc.Utf8);
          await this.setActivePrivateKeyFromBackgroundPage(privateKey);
          const network = this.getNetwork();
          const wallet = await network.fromWIF(privateKey);
          let address = wallet.address;
          try{

            this.setState({
              address,
              privateKey: privateKey,
              accounts: this.state.accounts
            }, () => {
              this.loadActiveAccount();
            });

          } catch(e) {
            console.log(e);
          }

      }

    }

  };

  handleAccountsCloseImport = () => {
    this.setState({ accountsOpen: false });
    this.setState({ anchorEl: null });
    this.setState({ importOpen: true });
  };

  showDapps = () => {
    this.setState({ showDappsOpen: true });
  };

  showHome= () => {
    this.setState({ importOpen: false });
    this.setState({ showDappsOpen: false });
  };

  handleResetWalletOpen = () => {
    this.setState({ resetWalletOpen: true });
  };

  handleResetWalletClose = () => {
    this.setState({ resetWalletOpen: false });
  };

  getAddressAbv = (address) => {
    if (address) {
      return address.substr(0, 5) + '...' + address.substr(address.length-4, 4);
    } else {
      return '';
    }
  };

  getTxAbv = (tx) => {
    if (tx) {
      return tx.substr(0, 5) + '...' + tx.substr(tx.length - 4, 4);
    } else {
      return 'pending...';
    }
  };

  formatAmount = (value) => {
    let n = parseFloat(value);
    if (isNaN(n)) {
      return value;
    }
    return n.toString();
  };

  renderNetwork() {
    return (
      <Dialog
        aria-labelledby="switch-network-title"
        open={this.state.networkOpen}
        onClose={this.handleNetworkClose}
        TransitionComponent={Transition} >
        <div>

          <DialogTitle id="switch-network-title">Switch network</DialogTitle>
          <DialogContent>
            <div className="dw-warning-box" style={{marginBottom: 12}}>
              <ErrorOutline fontSize="small" />
              <span>Switching network will remove imported accounts.</span>
            </div>
            <RadioGroup
              ref={ref => {
                this.radioGroupRef = ref;
              }}
              aria-label="Network"
              name="network"
              value={this.state.networkInSelection}
              onChange={this.handleChange('networkInSelection')}
            >
              <FormControlLabel value='DIGIWAGE_MAINNET' key='DIGIWAGE_MAINNET' control={<Radio />} label='Mainnet' />
              <FormControlLabel value='DIGIWAGE_FORKTEST' key='DIGIWAGE_FORKTEST' control={<Radio />} label='Forktest' />
            </RadioGroup>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleNetworkClose}>
              Cancel
            </Button>
            <Button variant="outlined" onClick={this.changeNetwork} color="secondary">
              Ok
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    )
  }

  renderResetWallet() {
    return (
      <Dialog
        aria-labelledby="switch-network-title"
        open={this.state.resetWalletOpen}
        onClose={this.handleResetWalletClose}
        TransitionComponent={Transition} >
        <div>

          <DialogTitle id="switch-network-title">Reset wallet?</DialogTitle>
          <DialogContent>
            <div className="dw-warning-box">
              <ErrorOutline fontSize="small" />
              <span>Resetting the wallet will remove all imported accounts. This cannot be undone.</span>
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleResetWalletClose}>
              Cancel
            </Button>
            <Button variant="outlined" onClick={this.resetAppHashPassword} color="secondary">
              Reset
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    )
  }

  renderSend() {
    if (!this.state.account) {
      return null;
    }

    return (
      <Dialog
          fullScreen
          open={this.state.sendOpen}
          onClose={this.handleSendClose}
          TransitionComponent={Transition} >
          <AppBar position="static" elevation={0} className="dw-sheet-appbar">
            <Toolbar>
              <Tooltip title="Close">
                <IconButton color="inherit" onClick={this.handleSendClose} aria-label="Close">
                  <CloseIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="title" color="inherit">
                Send WAGE
              </Typography>
            </Toolbar>
          </AppBar>
          <div className="dw-sheet-body">
          <Card className="dw-sheet-card">
            <TextField
              required
              label="To address"
              className="dw-field"
              value={this.state.sendTo}
              onChange={this.handleChange('sendTo')}
              margin="normal" />
            <TextField
              required
              label="Amount"
              className="dw-field"
              value={this.state.sendAmount}
              onChange={(ev) => this.setSendAmount(ev.target.value) }
              margin="normal"
              type="number"
              placeholder="0.00" />
            <TextField
              required
              label="Fee Rate"
              className="dw-field"
              value={this.state.sendFeeRate}
              onChange={(ev) => this.setFeeRate(ev.target.value) }
              margin="normal"
              type="number"
              placeholder="1000" />
            <Button
              id="send-token-button"
              className="dw-primary-btn"
              variant="raised"
              color="secondary"
              disabled={!this.isSendValid() }
              onClick={this.sendToken}>
              Send <Send style={{marginLeft: 8}} fontSize="small"/>
            </Button>
          </Card>
        </div>
      </Dialog>
    )
  }

  renderReceive() {
    if (!this.state.account) {
      return null;
    }
    if (!this.state.qrcode) {
      this.loadQRCode();
    }

    return (
      <Dialog
          fullScreen
          open={this.state.receiveOpen}
          onClose={this.handleReceiveClose}
          TransitionComponent={Transition} >
          <AppBar position="static" elevation={0} className="dw-sheet-appbar">
            <Toolbar>
              <Tooltip title="Close">
                <IconButton color="inherit" onClick={this.handleReceiveClose} aria-label="Close">
                  <CloseIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="title" color="inherit">
                Receive WAGE
              </Typography>
            </Toolbar>
          </AppBar>
          <div className="dw-sheet-body">
          <Card className="dw-sheet-card">
            <div className="dw-sheet-title">Send only WAGE to this address</div>
            {
              this.state.qrcode &&
              <div className="dw-qr-frame">
                <img src={this.state.qrcode} style={{ width: 172, height: 172 }} alt="account address" />
              </div>
            }
            <div className="dw-mono-box">{this.state.address}</div>
            <CopyToClipboard text={this.state.address} onCopy={() => this.handleCopyToClipBoard()}>
              <Button className="dw-primary-btn" variant="raised" color="secondary">
                Copy address <FileCopyIcon style={{marginLeft: 8}} fontSize="small" />
              </Button>
            </CopyToClipboard>
          </Card>
        </div>
      </Dialog>
    )
  }

  renderShowKey() {
    if (!this.state.privateKey) {
      return null;
    }

    let privateKey = this.state.privateKey;


    return (
      <Dialog
          fullScreen
          open={this.state.keyOpen}
          onClose={this.handleKeyClose}
          TransitionComponent={Transition} >
          <AppBar position="static" elevation={0} className="dw-sheet-appbar">
            <Toolbar>
              <Tooltip title="Close">
                <IconButton color="inherit" onClick={this.handleKeyClose} aria-label="Close">
                  <CloseIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="title" color="inherit">
                Private Key
              </Typography>
            </Toolbar>
          </AppBar>
          <div className="dw-sheet-body">
          <Card className="dw-sheet-card">
            <div className="dw-warning-box">
              <ErrorOutline fontSize="small" />
              <span>Never share your private key. Anyone with it can take your funds.</span>
            </div>
            <div className="dw-mono-box">{privateKey}</div>
            <CopyToClipboard text={privateKey} onCopy={() => this.handleCopyToClipBoard()}>
              <Button className="dw-primary-btn" variant="raised" color="secondary">
                Copy private key <FileCopyIcon style={{marginLeft: 8}} fontSize="small" />
              </Button>
            </CopyToClipboard>
          </Card>
        </div>
      </Dialog>
    )
  }

  renderSendReceiveButtons() {
    if (!this.state.account) {
      return null;
    }

    return (
      <div className="dw-actions-row">
        <button className="dw-action-btn" onClick={this.showReceive}>
          <span className="dw-action-circle"><CallReceived fontSize="small" /></span>
          <span className="dw-action-label">Receive</span>
        </button>
        <button className="dw-action-btn" onClick={this.showSend}>
          <span className="dw-action-circle"><CallMade fontSize="small" /></span>
          <span className="dw-action-label">Send</span>
        </button>
      </div>
    )
  }

   renderBackupPrivateKey() {
    let mnemonic = this.state.mnemonic;
    return (
      <Dialog
          open={this.state.backupPrivateKeyOpen}
          TransitionComponent={Transition}
          keepMounted
          aria-labelledby="alert-dialog-slide-title"
          aria-describedby="alert-dialog-slide-description" >
        <DialogTitle id="alert-dialog-slide-title">
          Backup mnemonic
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-slide-description">
            <div className="dw-warning-box" style={{marginBottom: 12}}>
              <ErrorOutline fontSize="small" />
              <span>Write down your mnemonic somewhere safe. You'll need it to restore this account later.</span>
            </div>
            <div className="dw-mono-box" style={{marginTop: 0}}>{mnemonic}</div>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button className="dw-primary-btn" style={{margin: '0 16px 16px'}} variant="raised" color="secondary" onClick={this.handleBackupPrivateKeyClose}>
            I've written it down
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  renderTransactions() {
    const { transactions, account } = this.state;
    if (typeof transactions === 'undefined' || typeof account === 'undefined') {
      return null;
    }
    return (
      <Card className="dw-section">
        <div className="dw-section-title">Activity</div>
          {this.renderTransactionsTable()}
      </Card>
    )
  }

   renderTransactionsTable() {
    const { transactions } = this.state;
    if (!transactions || transactions.length === 0) {
      return (
        <div className="dw-empty">No transactions yet</div>
      );
    }

    return (
      <div>
      {transactions.map(transaction => {
        let amount = transaction.vout[0].value;
        let to = '';
        if (transaction.vout[0].scriptPubKey) {
          if (transaction.vout[0].scriptPubKey.addresses) {
            if (transaction.vout[0].scriptPubKey.addresses.length>0) {
              to = transaction.vout[0].scriptPubKey.addresses[0];
            }
          }
        }
        let txurl = this.getExplorerTx() + transaction.txid;
        let isReceive = to === this.state.address;
        return (
          <a key={transaction.txid} href={txurl} target="_blank" rel="noopener noreferrer" className="dw-tx-row">
            <span className={`dw-tx-icon ${isReceive ? 'receive' : 'send'}`}>
              {isReceive ? <CallReceived fontSize="small" /> : <CallMade fontSize="small" />}
            </span>
            <span className="dw-tx-main">
              <span className="dw-tx-title">{isReceive ? 'Received' : 'Sent'} {this.getAddressAbv(to)}</span>
              <span className="dw-tx-sub">
                {moment(transaction.time * 1000).format('MMM D, h:mm a')} &middot; {this.getTxAbv(transaction.txid)}
              </span>
            </span>
            <span className="dw-tx-amount">{this.formatAmount(amount)} WAGE</span>
          </a>
        );
      })}
      <div className="dw-view-more">
        <Button size="small" color="secondary" className="dw-text-btn" onClick={this.goToExplorerAddress}>
          View all on explorer
        </Button>
      </div>
      </div>
    )
  }

  handleSnackbardClose = () => {
    this.setState({ snackbarOpen: false });
  };

  renderSnackbar() {
    return(
      <Snackbar
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        open={this.state.snackbarOpen}
        autoHideDuration={6000}
        onClose={this.handleSnackbardClose}
        ContentProps={{
          'aria-describedby': 'message-id',
        }}
        message={<span id="message-id">{this.state.snackbarMessage}</span>}
        action={[
          <IconButton
            key="close"
            aria-label="Close"
            color="inherit"
            onClick={this.handleSnackbardClose}
          >
            <CloseIcon />
          </IconButton>,
        ]}
      >
      </Snackbar>
    )
  }


  renderWallet() {
    return (
      <div className="cards">
        {this.renderDashboard()}
        {this.renderSendReceiveButtons()}
        {this.renderTransactions()}

        {this.renderReceive()}
        {this.renderSend()}
        {this.renderShowKey()}
        {this.renderBackupPrivateKey()}
      </div>
    )
  }

  renderCreateWallet() {
    return (
      <div className="dw-onboard-wrap">
        <Card className="dw-onboard-card">

          <img src={logo} alt="DigiWage" className="dw-onboard-logo" />
          <div className="dw-onboard-title">{this.state.walletLabel}</div>
          <div className="dw-sheet-subtitle" style={{textAlign: 'center', marginBottom: 8}}>
            {this.state.walletInitialised
              ? 'Enter your password to unlock your wallet.'
              : 'This password encrypts your keys on this device.'}
          </div>
          <TextField
            label="Password"
            className="dw-field"
            type = "password"
            autoComplete="off"
            value={this.state.createAppHashPassword}
            onChange={this.handleChange('createAppHashPassword')}
            helperText="Your password"
            margin="normal" />
          <Button
            className="dw-primary-btn"
            color="secondary"
            variant="raised"
            onClick={this.createAppHashPassword}>
            {this.state.walletLabel} <AccountBalanceWallet style={{marginLeft: 8}} fontSize="small"/>
          </Button>
          {this.state.walletInitialised && <Button
            className="dw-link-btn"
            size="small"
            onClick={this.handleResetWalletOpen}>Reset Wallet
          </Button>
           }
        </Card>
        <div className="dw-onboard-footer">Secured by DigiWage &middot; Self-custodial</div>
      </div>
    )
  }

  renderDapps() {
    let dappData = this.state.dapps;
    return (
          <div className="cards">
          <Card className="card sign-in-card">
            <div className='grid-root'>
             { dappData &&
              <GridList cellHeight={150} className='grid-list'>

                <GridListTile key="Subheader" cols={2} style={{ height: 'auto' }}>
                  <ListSubheader component="div">Explore dapps on DigiWage</ListSubheader>
                </GridListTile>

                {dappData.map(dapp => (
                  <GridListTile key={dapp.image} style={{ backgroundColor : dapp.backgroundColor}}>
                    <img src={dapp.image} alt={dapp.name} className='grid-image'  />
                    <GridListTileBar
                      title={dapp.name}
                      subtitle={<span>{dapp.desc}</span>}
                      actionIcon={
                           <IconButton onClick={() => { this.handleDappLinkClicked(dapp.url) }} color='contrast'>
                            <LinkIcon className='grid-icon' />
                          </IconButton>
                      }
                    />
                  </GridListTile>

                ))}
                </GridList>
              }
            </div>

           </Card>
      </div>

    )
  }

  renderImportOrCreate() {
    return (

      <div className="dw-onboard-wrap">
        <Card className="dw-onboard-card">

          <img src={logo} alt="DigiWage" className="dw-onboard-logo" style={{height: 48, width: 48}} />
          <div className="dw-onboard-title">Import an account</div>
          <div className="dw-onboard-row">
              <Button
                className="dw-primary-btn"
                style={{marginTop: 0}}
                color="secondary"
                variant="raised"
                onClick={this.showImportPrivateKey}>
                Private Key <VpnKey style={{marginLeft: 8}} fontSize="small"/>
              </Button>
              <Button
                className="dw-primary-btn"
                style={{marginTop: 0}}
                color="secondary"
                variant="raised"
                onClick={this.showImportMnemonic}>
               Mnemonic <SpeakerNotes style={{marginLeft: 8}} fontSize="small"/>
              </Button>
          </div>

        </Card>
        <Card className="dw-onboard-card">
          <div className="dw-onboard-title">Create a new account</div>
          <TextField
            label="Password"
            className="dw-field"
            type = "password"
            autoComplete="off"
            value={this.state.createAccountPassword}
            onChange={this.handleChange('createAccountPassword')}
            helperText="Remember your password"
            margin="normal" />
          <Button
            className="dw-primary-btn"
            color="secondary"
            variant="raised"
            onClick={this.createAccount}>
            Create account <AccountBalanceWallet style={{marginLeft: 8}} fontSize="small"/>
          </Button>
        </Card>
      </div>
    )
  }

  renderImportByPrivateKey(){

    return (
      <Dialog
        fullScreen
        aria-labelledby="switch-network-title"
        open={this.state.importPrivateKeyOpen}
        onClose={this.handleImportyPrivateKeyClose}
        TransitionComponent={Transition} >
        <AppBar position="static" elevation={0} className="dw-sheet-appbar">
          <Toolbar>
            <Tooltip title="Close">
              <IconButton color="inherit" onClick={this.handleImportPrivateKeyClose} aria-label="Close">
                <CloseIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="title" color="inherit">
             Import by Private Key
            </Typography>
          </Toolbar>
        </AppBar>
      <div className="dw-sheet-body">
        <Card className="dw-sheet-card">
          <div className="dw-sheet-subtitle">You can sign in with a <b>Private Key</b></div>
          <TextField
            label="Private key"
            className="dw-field"
            type = "password"
            autoComplete="off"
            value={this.state.importPrivateKey}
            onChange={this.handleChange('importPrivateKey')}
            helperText="We do not store your private key."
            margin="normal" />
          <Button
            className="dw-primary-btn"
            color="secondary"
            variant="raised"
            disabled={!this.isPrivateKeyValid()}
            onClick={this.importPrivateKey}>
            Import <LockOpen style={{marginLeft: 8}} fontSize="small"/>
          </Button>
        </Card>
      </div>
      </Dialog>
    )
  }

  renderImportByMnemonic(){
    return (
      <Dialog
        fullScreen
        aria-labelledby="switch-network-title"
        open={this.state.importMnemonicOpen}
        onClose={this.handleImportMnemonicClose}
        TransitionComponent={Transition} >
        <AppBar position="static" elevation={0} className="dw-sheet-appbar">
          <Toolbar>
            <Tooltip title="Close">
              <IconButton color="inherit" onClick={this.handleImportMnemonicClose} aria-label="Close">
                <CloseIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="title" color="inherit">
              Sign in by Mnemonic
            </Typography>
          </Toolbar>
        </AppBar>
      <div className="dw-sheet-body">
        <Card className="dw-sheet-card">
          <div className="dw-sheet-subtitle">Restore from a <b>Mnemonic</b></div>
          <TextField
            label="Mnemonic"
            className="dw-field"
            autoComplete="off"
            multiLine={true}
            value={this.state.importMnemonic}
            onChange={this.handleChange('importMnemonic')}
            helperText=""
            margin="normal" />
          <TextField
            label="Password"
            className="dw-field"
            type = "password"
            autoComplete="off"
            value={this.state.importMnemonicPassword}
            onChange={this.handleChange('importMnemonicPassword')}
            helperText="Your password"
            margin="normal" />
          <Button
            className="dw-primary-btn"
            color="secondary"
            variant="raised"
            disabled={!this.isMnemonicValid()}
            onClick={this.importMnemonic}>
            Import <SpeakerNotes style={{marginLeft: 8}} fontSize="small"/>
          </Button>
        </Card>
      </div>
      </Dialog>
    )
  }

  renderMainScreen(){
     if (this.state.passwordHash) {
      if (this.state.sendToContractPopupOpen) {
        return this.renderSendToContractPopup();
      }
      if (this.state.deployContractPopupOpen) {
        return this.renderDeployContractPopup();
      }
      if(this.state.importOpen)
      {
        return this.renderImportOrCreate();

      }else{
        if(this.state.showDappsOpen)
        {
          return this.renderDapps();
        }else{

          if(this.state.privateKey)
          {
            return this.renderWallet();
          }
        }
      }

    }else{
      return this.renderCreateWallet();
    }
  }

  signOut = () => {
    this.clear();
  };

  confirmSendToContract = async () => {
    const { serialNumber } = this.state;
    const network = this.getNetwork();
    const wallet = await network.fromWIF(this.state.privateKey);
    const contractAddress = this.state.sendToContractDataContractAddress;
    const encodedData = this.state.sendToContractDataContractData;
    const option = {
      amount: parseInt(this.state.sendToContractDataAmount, 10),
      gasLimit: this.state.sendToContractDataGasLimit,
      gasPrice: this.coinToSatoshi(this.state.sendToContractDataGasPrice), // need to convert to Satoshi
      // feeRate: 0.01
    };
    try {
      const tx = await wallet.contractSend(contractAddress, encodedData, option);
      window.chrome.runtime.sendMessage({
        target: 'digiwage-background',
        method: 'sendTransaction',
        data: {
          serialNumber,
          data: {
            code: 'TX_SENT',
            message: 'User sent transaction',
            tx
          }
        }
      });
    } catch(e) {
      window.chrome.runtime.sendMessage({
        target: 'digiwage-background',
        method: 'sendTransaction',
        data: {
          serialNumber,
          data: {
            code: 'TX_FAILED',
            error: e.message
          }
        }
      });
    }
    window.close();
  };

  updateDeployEstimate = async () => {
    try {
      const wallet = await this.getNetwork().fromWIF(this.state.privateKey);
      const feeRate = Math.ceil(await wallet.feeRatePerByte());
      this.setState({ deployFeeRate: feeRate });
    } catch (e) {
      this.setState({ deployFeeRate: null });
    }
  };

  confirmDeployContract = async () => {
    const { serialNumber } = this.state;
    this.setState({ deployContractBusy: true, deployContractError: null });
    try {
      const wallet = await this.getNetwork().fromWIF(this.state.privateKey);
      const { txid, contractAddress } = await deployContract(wallet, {
        bytecode: this.state.deployContractBytecode,
        gasLimit: this.state.deployContractGasLimit,
        gasPriceSat: this.coinToSatoshi(this.state.deployContractGasPrice),
        amountSat: this.state.deployContractAmount
      });
      window.chrome.runtime.sendMessage({
        target: 'digiwage-background',
        method: 'sendTransaction',
        data: {
          serialNumber,
          data: {
            code: 'TX_SENT',
            message: 'User deployed contract',
            tx: { txid },
            contractAddress
          }
        }
      }, () => window.close());
    } catch (e) {
      // Keep the popup open on a build/broadcast failure (e.g. insufficient
      // funds) so the user can adjust gas and retry; the dApp is only told
      // once they cancel.
      this.setState({ deployContractBusy: false, deployContractError: e.message });
    }
  };

  cancelTransaction = () => {
    const { serialNumber } = this.state;
    window.chrome.runtime.sendMessage({
      target: 'digiwage-background',
      method: 'cancelTransaction',
      data: {
        serialNumber,
        data: {
          code: 'USER_CANCEL',
          error: 'User cancelled transaction'
        }
      }
    });
    window.close();
  };

  renderSendToContractPopup() {
    return (
      <Dialog
        fullScreen
        aria-labelledby="switch-network-title"
        open={this.state.sendToContractPopupOpen}>
        <AppBar position="static" elevation={0} className="dw-sheet-appbar">
          <Toolbar>
            <Typography variant="title" color="inherit">
              Confirm Transaction
            </Typography>
          </Toolbar>
        </AppBar>
      <div className="dw-confirm-body">

        <TextField
          inputProps={{
            readOnly: true
          }}
          label="From"
          className="dw-confirm-field"
          autoComplete="off"
          value={this.state.address}
          helperText=""
          margin="none" />
        <TextField
          inputProps={{
            readOnly: true
          }}
          label="Contract Address"
          className="dw-confirm-field"
          autoComplete="off"
          value={this.state.sendToContractDataContractAddress}
          helperText=""
          margin="normal" />
        <TextField
          inputProps={{
            readOnly: true
          }}
          label="Send to method"
          className="dw-confirm-field"
          autoComplete="off"
          value={this.state.sendToContractDataContractMethod}
          helperText=""
          margin="normal" />
        <TextField
          inputProps={{
            readOnly: true
          }}
          label="Send Data"
          className="dw-confirm-field"
          autoComplete="off"
          value={this.state.sendToContractDataContractData}
          margin="normal" />
        <TextField
          inputProps={{
            readOnly: true
          }}
          label="Send Amount (Satoshi)"
          className="dw-confirm-field"
          autoComplete="off"
          value={this.state.sendToContractDataAmount}
          helperText=""
          margin="normal" />
        <TextField
          label="Gas Limit"
          className="dw-confirm-field"
          autoComplete="off"
          value={this.state.sendToContractDataGasLimit}
          onChange={this.handleChange('sendToContractDataGasLimit')}
          helperText=""
          margin="normal" />
        <TextField
          label="Gas Price"
          className="dw-confirm-field"
          autoComplete="off"
          value={this.state.sendToContractDataGasPrice}
          onChange={this.handleChange('sendToContractDataGasPrice')}
          helperText=""
          margin="normal" />
        <Button
          className="dw-primary-btn"
          color="secondary"
          variant="raised"
          onClick={this.confirmSendToContract}>
          Confirm
        </Button>
        <Button
          className="dw-link-btn"
          onClick={this.cancelTransaction}>
          Cancel
        </Button>
      </div>
      </Dialog>
    )
  }

  renderDeployContractPopup() {
    const bytes = this.state.deployContractBytecode.length / 2;
    const gasLimit = parseInt(this.state.deployContractGasLimit, 10) || 0;
    const gasPriceSat = this.coinToSatoshi(this.state.deployContractGasPrice) || 0;
    const feeRate = this.state.deployFeeRate || 0;
    const fees = deployFeeBreakdown({ gasLimit, gasPriceSat, feeRate, scriptBytes: bytes });
    const toCoin = sat => (sat / 1e8).toFixed(8);
    const isMainnet = this.state.network === 'DIGIWAGE_MAINNET';
    const tooLarge = bytes > MAX_SCRIPT_ELEMENT_SIZE;
    return (
      <Dialog
        fullScreen
        aria-labelledby="deploy-contract-title"
        open={this.state.deployContractPopupOpen}>
        <AppBar position="static" elevation={0} className="dw-sheet-appbar">
          <Toolbar>
            <Typography variant="title" color="inherit">
              Deploy Contract
            </Typography>
          </Toolbar>
        </AppBar>
        <div className="dw-confirm-body">
          <TextField
            inputProps={{ readOnly: true }}
            label="Contract"
            className="dw-confirm-field"
            autoComplete="off"
            value={this.state.deployContractName}
            margin="none" />
          <TextField
            inputProps={{ readOnly: true }}
            label="From"
            className="dw-confirm-field"
            autoComplete="off"
            value={this.state.address}
            margin="normal" />
          <TextField
            inputProps={{ readOnly: true }}
            label="Network"
            className="dw-confirm-field"
            autoComplete="off"
            value={isMainnet ? 'DigiWage Mainnet' : 'DigiWage Forktest'}
            helperText={isMainnet ? 'Real funds: deployments on mainnet are permanent.' : ''}
            margin="normal" />
          <TextField
            inputProps={{ readOnly: true }}
            label="Bytecode size"
            className="dw-confirm-field"
            autoComplete="off"
            value={`${bytes.toLocaleString()} bytes`}
            error={tooLarge}
            helperText={tooLarge ? `Exceeds the ${MAX_SCRIPT_ELEMENT_SIZE.toLocaleString()} byte network limit` : ''}
            margin="normal" />
          <TextField
            inputProps={{ readOnly: true }}
            label="Value sent (Satoshi)"
            helperText="Always 0: this network does not allow value with a deployment."
            className="dw-confirm-field"
            autoComplete="off"
            value={this.state.deployContractAmount}
            margin="normal" />
          <TextField
            label="Gas Limit"
            className="dw-confirm-field"
            autoComplete="off"
            value={this.state.deployContractGasLimit}
            onChange={this.handleChange('deployContractGasLimit')}
            margin="normal" />
          <TextField
            label="Gas Price (WAGE per gas)"
            className="dw-confirm-field"
            autoComplete="off"
            value={this.state.deployContractGasPrice}
            onChange={this.handleChange('deployContractGasPrice')}
            margin="normal" />
          <TextField
            inputProps={{ readOnly: true }}
            label="Maximum fee (WAGE)"
            className="dw-confirm-field"
            autoComplete="off"
            value={toCoin(fees.maxTotal)}
            helperText={`Gas ${toCoin(fees.gasFee)} + network fee ~${toCoin(fees.txFee)}. Unused gas is refunded.`}
            margin="normal" />
          {this.state.deployContractError && (
            <Typography color="error" style={{ marginTop: 8, wordBreak: 'break-word' }}>
              {this.state.deployContractError}
            </Typography>
          )}
          <Button
            className="dw-primary-btn"
            color="secondary"
            variant="raised"
            disabled={this.state.deployContractBusy || tooLarge}
            onClick={this.confirmDeployContract}>
            {this.state.deployContractBusy ? 'Deploying...' : 'Deploy'}
          </Button>
          <Button
            className="dw-link-btn"
            disabled={this.state.deployContractBusy}
            onClick={this.cancelTransaction}>
            Cancel
          </Button>
        </div>
      </Dialog>
    );
  }

  renderAppBar() {
    const isMainnet = this.state.network === 'DIGIWAGE_MAINNET';
    const networkLabel = isMainnet ? 'Mainnet' : 'Forktest';
    return (
      <AppBar position="sticky" elevation={0} className="dw-sheet-appbar">
        <Toolbar className="dw-topbar" disableGutters>
          <div className="dw-brand">
            <img src={logo} className="dw-brand-logo" alt="logo" />
            <span className="dw-brand-name">DigiWage</span>
          </div>

          <div className="dw-topbar-actions">
            { this.state.network &&
              <Tooltip title="Switch network">
                <button className="dw-network-pill" onClick={this.showNetwork}>
                  <span className={`dw-network-dot ${isMainnet ? 'mainnet' : 'forktest'}`} />
                  {networkLabel}
                  <KeyboardArrowDown className="dw-network-caret" />
                </button>
              </Tooltip>
            }

            { this.state.network && this.state.passwordHash &&
              <Tooltip title="Home">
                <IconButton className="dw-icon-btn" onClick={this.showHome} aria-label="Home">
                   <Dashboard fontSize="small"/>
                </IconButton>
              </Tooltip>
            }

            { this.state.dapps &&
             <Tooltip title="Explore Dapps">
                <IconButton className="dw-icon-btn" onClick={this.showDapps} aria-label="Explore Dapps">
                  <Explore fontSize="small"/>
                </IconButton>
              </Tooltip>
            }

            { supportsSidePanel() && !isSidePanelMode() &&
              <Tooltip title="Open in side panel">
                <IconButton className="dw-icon-btn" onClick={this.openInSidePanel} aria-label="Open in side panel">
                  <VerticalSplit fontSize="small"/>
                </IconButton>
              </Tooltip>
            }

            { supportsSidePanel() && isSidePanelMode() &&
              <Tooltip title="Switch back to popup">
                <IconButton className="dw-icon-btn" onClick={this.switchToPopupMode} aria-label="Switch back to popup">
                  <PictureInPictureAlt fontSize="small"/>
                </IconButton>
              </Tooltip>
            }

            { supportsSidePanel() &&
              <Tooltip title="Where the wallet opens">
                <IconButton className="dw-icon-btn" onClick={() => this.setState({ panelSettingsOpen: true })} aria-label="Wallet display settings">
                  <Tune fontSize="small"/>
                </IconButton>
              </Tooltip>
            }

            { this.state.passwordHash &&
              <Tooltip title="Lock wallet">
                <IconButton className="dw-icon-btn" onClick={this.signOut} aria-label="Lock wallet">
                  <Lock fontSize="small"/>
                </IconButton>
              </Tooltip>
            }
          </div>
        </Toolbar>
      </AppBar>
    )
  }

  renderPanelSettings() {
    return (
      <Dialog open={this.state.panelSettingsOpen} onClose={() => this.setState({ panelSettingsOpen: false })}>
        <DialogTitle>Open the wallet in</DialogTitle>
        <DialogContent>
          <RadioGroup value={this.state.panelMode} onChange={this.changePanelMode}>
            <FormControlLabel value="popup" control={<Radio />} label="Popup" />
            <FormControlLabel value="sidepanel" control={<Radio />} label="Side panel" />
          </RadioGroup>
          <DialogContentText>
            The side panel stays docked next to the page you are browsing. It applies when you click the
            DigiWage icon in the toolbar. Your wallet stays unlocked in both.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => this.setState({ panelSettingsOpen: false })} color="secondary">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  render() {
    return (
      <MuiThemeProvider theme={theme}>
        <div className={isSidePanelMode() ? 'App dw-sidepanel' : 'App'}>
          {this.renderAppBar()}
          <div className="dw-content">
            {this.renderMainScreen()}
          </div>
          {this.renderPanelSettings()}

          {this.renderImportByPrivateKey()}
          {this.renderImportByMnemonic()}
          {this.renderNetwork()}
          {this.renderResetWallet()}
          {this.renderSnackbar()}
        </div>
      </MuiThemeProvider>
    );
  }
}

export default App;
