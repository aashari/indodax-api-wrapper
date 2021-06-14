# Indodax API Wrapper

This is not an official Indodax API Wrapper, this package is made to help you to use Indodax private and public API, you need to provide your API and Secret key to use this package

---
## Requirements

You will only need Node.js / Yarn, installed in your environement.

### Node
- #### Node installation on Windows

  Just go on [official Node.js website](https://nodejs.org/) and download the installer.
Also, be sure to have `git` available in your PATH, `npm` might need it (You can find git [here](https://git-scm.com/)).

- #### Node installation on Ubuntu

  You can install nodejs and npm easily with apt install, just run the following commands.
```
      $ sudo apt install nodejs
      $ sudo apt install npm
```
- #### Other Operating Systems
  You can find more information about the installation on the [official Node.js website](https://nodejs.org/) and the [official NPM website](https://npmjs.org/).

If the installation was successful, you should be able to run the following command.
```
    $ node --version
    v15.8.0

    $ npm --version
    7.5.1
```
If you need to update `npm`, you can make it using `npm`! Cool right? After running the following command, just open again the command line and be happy.
```
    $ npm install npm -g
```
###
### Yarn installation
  After installing node, this project will need yarn too, so just run the following command.
```
      $ npm install -g yarn
```
---

## Install
```
    $ npm instalal indodax-api-wraapper
```
## Configure app

You need to provide your Indodax API and Secret key to use this package, this is an example of how to configure the package:
```
    const indodaxAPIWrapper = require('indodax-api-wrapper');
    indodaxAPIWrapper.configure("{{YOUR_API_KEY}}", "{{YOUR_API_SECRET}}", {{IS_DEBUGGING}});
```
The `configure` function required 3 mandatory parameters,
* `key` is your Indodax API Key
* `secret` is your Indodax API Secret
* `is_debugging` a boolean value, if you set to `true`, you will receive a log verbose of the package

You don't have to call the `configure` function if you provide these Environment variables:
* IDX_KEY
* IDX_SECRET
* IS_DEBUGGING

## Available Function
These are the available private functions that can you consume by using this package:
* getInfo: This method gives user balances and server's timestamp.
* transHistory: This method gives list of deposits and withdrawals of all currencies.
* trade: This method is for opening a new order.
* tradeHistory: This method gives information about transaction in buying and selling history.
* openOrders: This method gives the list of current open orders (buy and sell).
* orderHistory: This method gives the list of order history (buy and sell).
* getOrder: Use getOrder to get specific order details.
* cancelOrder: This method is for canceling an existing open order.

These are the available public functions that can you consume by using this package:
* getTicker: This method gives you pair ticker
* getTrades: This method gives you pair trades
* getDepth: This method gives you pair depth

To see full detail of private API documentation (to get the detail parameter required for each function), you can refer to the Indodax official [documentation here](https://indodax.com/downloads/INDODAXCOM-API-DOCUMENTATION.pdf)


## Example of Usage
```
    const indodaxAPIWrapper = require('indodax-api-wrapper');
    indodaxAPIWrapper.configure("{{YOUR_API_KEY}}", "{{YOUR_API_SECRET}}", {{IS_DEBUGGING}});
    
    indodaxAPIWrapper.getInfo(response=>{
        console.log(response)
    })
```