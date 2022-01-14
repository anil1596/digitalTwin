'use strict'
const shim = require('fabric-shim')
const util = require('util')
var crypto = require('crypto');

// ===============================================
// Chaincode name:[createDT.js]
// Asset key:[digitalTwin]
// Asset values:[deviceId, deviceName, owner, state, staticParams, dynamicParams]
// ===============================================

let Chaincode = class {
    async Init(stub) {
        let ret = stub.getFunctionAndParameters()
        console.info(ret)
        console.info('=========== Instantiated Chaincode ===========')
        return shim.success()
    }

    /****************************************************************
     ******************** IN-BUILT FUNCTIONS ************************
     ****************************************************************/

    async Invoke(stub) {
        console.info('Transaction ID: ' + stub.getTxID())
        console.info(util.format('Args: %j', stub.getArgs()))

        let ret = stub.getFunctionAndParameters()
        console.info(ret)

        let method = this[ret.fcn]
        try {
            if (!method) {
                console.log('no function of name:' + ret.fcn + ' found')
                throw new Error('Received unknown function ' + ret.fcn + ' invocation')
            }
        
            let payload = await method(stub, ret.params, this)
            return shim.success(payload)
        } catch (err) {
            console.log(err)
            return shim.error(err)
        }
    }

    // ===============================================
    // getHistoryForAsset - gets all previous transactions for asset
    // ===============================================
    async getHistoryForAsset(stub, args, thisClass) {
        if (args.length < 1) {
        throw new Error('Incorrect number of arguments. Expecting 1')
        }
        let key = args[0]
        console.info('- start getHistoryForAsset: %s', key)
    
        let resultsIterator = await stub.getHistoryForKey(key)
        let method = thisClass['getAllResults']
        let results = await method(resultsIterator, true)
    
        return Buffer.from(JSON.stringify(results))
    }

    
    async getAssetByKeyRange(stub, args, thisClass) {
        if (args.length < 2) {
            throw new Error('Incorrect number of arguments. Expecting 2')
        }

        let startKey = args[0]
        let endKey = args[1]

        let resultsIterator = await stub.getStateByRange(startKey, endKey)
        let method = thisClass['getAllResults']
        let results = await method(resultsIterator, false)

        return Buffer.from(JSON.stringify(results))
    }
    // ===============================================
    // getAllResults - packs the results to JSON array
    // ===============================================
    async getAllResults(iterator, isHistory) {
        let allResults = []
        while (true) {
        let res = await iterator.next()

        if (res.value && res.value.value.toString()) {
            let jsonRes = {}
            console.log(res.value.value.toString('utf8'))
            if (isHistory && isHistory === true) {
                jsonRes.TxId = res.value.tx_id
                jsonRes.Timestamp = res.value.timestamp
                // jsonRes.IsDelete = res.value.is_delete.toString()
                try {
                    jsonRes.Value = JSON.parse(res.value.value.toString('utf8'))
                } catch (err) {
                    console.log(err)
                    jsonRes.Value = res.value.value.toString('utf8')
                }
            } else {
                jsonRes.Key = res.value.key
                try {
                    jsonRes.Record = JSON.parse(res.value.value.toString('utf8'))
                } catch (err) {
                    console.log(err)
                    jsonRes.Record = res.value.value.toString('utf8')
                }
            }
            allResults.push(jsonRes)
        }
        if (res.done) {
            console.log('end of data')
            await iterator.close()
            console.info(allResults)
            return allResults
            }
        }
    }
  
    // ===============================================
    //  Ad hoc rich query
    // ===============================================
    async queryAssets(stub, args, thisClass) {
        if (args.length < 1) {
            throw new Error('Incorrect number of arguments. Expecting queryString')
        }
        let queryString = args[0]
        if (!queryString) {
            throw new Error('queryString must not be empty')
        }
        let method = thisClass['getQueryResultForQueryString']
        let queryResults = await method(stub, queryString, thisClass)
        return queryResults
    }
  
    // =========================================================================================
    // getQueryResultForQueryString executes the passed in query string.
    // Result set is built and returned as a byte array containing the JSON results.
    // =========================================================================================
    async getQueryResultForQueryString(stub, queryString, thisClass) {
        console.info('- getQueryResultForQueryString queryString:' + queryString)
        let resultsIterator = await stub.getQueryResult(queryString)
        let method = thisClass['getAllResults']
        let results = await method(resultsIterator, false)
        return Buffer.from(JSON.stringify(results))
    }

    /**************************************************************************
     ************************ TAILORED FUNCTIONS ******************************
     **************************************************************************/

    // ===============================================
    // encrypt - used to get deviceID from static parameters
    // ===============================================

    async encrypt(params) {
        var device = ""
        for (var key in params) {
            if(key != "dynamicParams"){
                // console.info(key + " : " + params[key])
                device += params[key]
            }
        }
        return crypto.createHash('md5').update(device).digest('hex');
    }

    // ===============================================
    // Insert Asset - insert Asset to chaincode state
    // ===============================================

    async createDT(stub, args, thisClass) {
        if(args.length < 1){
            console.info(args, args.length)
            throw new Error('Incorrect number of arguments 1')
        }
        let inputData = JSON.parse(args[0])
        if(inputData.length < 12){
            console.info(args, args.length)
            throw new Error('Incorrect number of arguments in dictionary Expecting 12')
        }
        
        let deviceName = inputData['deviceName']
        let owner = inputData['owner']
        let state = inputData['state']
        let MACaddress = inputData['MACaddress']
        let serialNumber = inputData['serialNumber']
        let manufacturer = inputData['manufacturer']
        let hardware = inputData['hardware']
        let memorySize = inputData['memorySize']
        let osInfo = inputData['osInfo']
        let staticIP = inputData['staticIP']
        let dynamicParams = inputData['dynamicParams']
        let price = inputData['price']
        let method = thisClass['encrypt']
        let id =  await method(inputData)
        let assetState = await stub.getState(id)

        if (assetState.toString()) {
            throw new Error('This asset already exists: ' + id)
        }
        let asset = {}
        asset.id = id
        asset.docType = "Digital Twin"
        asset.deviceName = deviceName
        asset.owner = owner
        asset.state = state
        asset.MACaddress = MACaddress
        asset.serialNumber = serialNumber
        asset.manufacturer = manufacturer
        asset.hardware = hardware
        asset.memorySize = memorySize
        asset.osInfo = osInfo
        asset.staticIP = staticIP
        asset.price = price
        asset.dynamicParams = dynamicParams

        await stub.putState(id, Buffer.from(JSON.stringify(asset)))
    }

    // ===============================================
    // update Asset state
    // ===============================================

    async updateAsset(stub, args, thisClass) {
		if (args.length < 3) {
			throw new Error('Incorrect number of arguments. Expecting key and new value.')
		}
		let deviceId = args[0]
        let currentOwner = args[1]
		let currentState = args[2]
		console.info('- Start updating asset - ')
		let assetAsBytes = await stub.getState(deviceId)
		if (!assetAsBytes || !assetAsBytes.toString()) {
			throw new Error('Asset does not exist')
		}
		let asset = {}
		try {
			asset = JSON.parse(assetAsBytes.toString())
		} catch (err) {
			let jsonResp = {}
			jsonResp.error = 'Failed to decode JSON of: ' + key
			throw new Error(jsonResp)
		}
		
        if(currentOwner == asset["owner"]){
            asset.dynamicParams = currentState
            console.info(asset)
            await stub.putState(deviceId, Buffer.from(JSON.stringify(asset)))
            console.info('- End update asset (success) -')
        }else{
            throw new Error("Not authorized to update Asset State")
        }
	}
    
    // ===============================================
    // update Asset owner
    // ===============================================

    async updateAssetOwner(stub, args, thisClass) {
		if (args.length < 3) {
			throw new Error('Incorrect number of arguments. Expecting key and new value.')
		}
		let key = args[0]
        let currentOwner = args[1]
		let newOwner = args[2]
		console.info('- Start updating asset owner - ')
		let assetAsBytes = await stub.getState(key)
		if (!assetAsBytes || !assetAsBytes.toString()) {
			throw new Error('Asset does not exist')
		}
		let asset = {}
		try {
			asset = JSON.parse(assetAsBytes.toString())
		} catch (err) {
			let jsonResp = {}
			jsonResp.error = 'Failed to decode JSON of: ' + key
			throw new Error(jsonResp)
		}
		
        if(currentOwner == asset["owner"]){
            asset.owner = newOwner
            console.info(asset)
            await stub.putState(key, Buffer.from(JSON.stringify(asset)))
            console.info('- End update asset owner (success) -')
        }else{
            throw new Error("Not authorized to update Asset owner")
        }
	}

    // ===============================================
    // getAssetDetails - get Asset from blockchain
    // ===============================================

    async getAssetDetails(stub, args, thisClass) {
        if (args.length != 1) {
            throw new Error('Incorrect number of arguments. Expecting name of the asset to query')
        }
        let inputData = JSON.parse(args[0])
        let key = inputData['key']
        if (!key) {
            throw new Error(' Asset key must not be empty')
        }

        let assetAsBytes = await stub.getState(key)
        if (!assetAsBytes.toString()) {
            let jsonResp = {}
            jsonResp.Error = 'Asset does not exist: ' + key
            throw new Error(JSON.stringify(jsonResp))
        }

        console.info('=======================================')
        console.log(assetAsBytes.toString())
        console.info('=======================================')
        return assetAsBytes
    }

    // ===============================================
    // getAssetbyOwner - get Asset by its owner
    // ===============================================

    async getAssetbyOwner(stub, args, thisClass){
        let inputData = JSON.parse(args[0])
        let owner = inputData['owner']
        var queryString = {
            "selector":{
                "owner": owner,
                }
        }
        let resultsIterator = await stub.getQueryResult(JSON.stringify(queryString))
        let method = thisClass['getAllResults']
        let results = await method(resultsIterator, false)
        return Buffer.from(JSON.stringify(results))
    }

    
  
}
shim.start(new Chaincode())