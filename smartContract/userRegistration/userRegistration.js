
'use strict'
const shim = require('fabric-shim')
const util = require('util')

// ===============================================
// Chaincode name:[userRegistration.js]
// Asset key:[id]
// Asset values:[username, password, role, additionalInfo]
// ===============================================

let Chaincode = class {
    async Init(stub) {
        let ret = stub.getFunctionAndParameters()
        console.info(ret)
        console.info('=========== Instantiated Chaincode ===========')
        return shim.success()
    }

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

    /****************************************************************
     ******************** BUILT-IN FUNCTIONS ************************
     ****************************************************************/

    // ===========================================================================================
    // Read Assets By Key Range - performs a range query based on the start and end keys provided.
    // ===========================================================================================
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
        let Results = []
        while (true) {
        let res = await iterator.next()

        if (res.value && res.value.value.toString()) {
            let jsonRes = {}
            console.log(res.value.value.toString('utf8'))
            if (isHistory && isHistory === true) {
                jsonRes.TxId = res.value.tx_id
                jsonRes.Timestamp = res.value.timestamp
                jsonRes.IsDelete = res.value.is_delete.toString()
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
            Results.push(jsonRes)
        }
        if (res.done) {
            console.log('end of data')
            await iterator.close()
            console.info(Results)
            return Results
            }
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
    // registerUser - register user to chaincode state
    // ===============================================

    async registerUser(stub, args, thisClass) {
        if(args.length != 1){
            throw new Error('Incorrect number of arguments. Expecting 1.')
        }
        let inputData = JSON.parse(args[0])
        let id = inputData['id']
        let assetState = await stub.getState(id)
        if (assetState.toString()) {
            throw new Error('This User already exists: ' + id)
        }
        let username = inputData['username'] 
        let password = inputData['password'] 
        let role = inputData['role']
        let additionalInfo = inputData['additionalInfo']
        if (username.length <= 0) { 
            throw new Error('Argument username must be a non-empty string') 
        }	if (password.length <= 0) { 
            throw new Error('Argument password must be a non-empty string') 
        }	if (role.length <= 0) { 
            throw new Error('Argument role must be a non-empty string') 
        }
        let asset = {}
        asset.docType = "User"
        asset.id = id
        asset.username = username
        asset.password = password
        asset.role = role
        asset.additionalInfo = additionalInfo
    
        await stub.putState(id, Buffer.from(JSON.stringify(asset)))
    }

    // ===============================================
    // Retrieve user - read a user from chaincode state by key
    // ===============================================
    async read(stub, args, thisClass) {
        if (args.length != 1) {
            throw new Error('Incorrect number of arguments. Expecting name of the asset to query')
        }

        let key = args[0]
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
  
    // ===========================================================
    // Update Asset Attributes   - each method updates an asset(user info) for a certain field
    // updateAssetUsername       - method to update username
    // updateAssetPassword       - method to update password
    // updateAssetRole           - method to update user role
    // updateAssetAdditionalInfo - method to update user's additional information
    // ===========================================================
    
    async updateUsername(stub, args, thisClass) {
		if (args.length < 2) {
			throw new Error('Incorrect number of arguments. Expecting key and new value.')
		}
		let key = args[0]
		let newValue = args[1]
		console.info('- Start updating asset - ')
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
		console.info(asset)
		asset.username = newValue
		let assetJSONasBytes = Buffer.from(JSON.stringify(asset))
		await stub.putState(key, assetJSONasBytes)
		console.info('- End update asset (success) -')
	}
    
	async updateAssetPassword(stub, args, thisClass) {
		if (args.length < 2) {
			throw new Error('Incorrect number of arguments. Expecting key and new value.')
		}
		let key = args[0]
		let newValue = args[1]
		console.info('- Start updating asset - ')
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
		console.info(asset)
		asset.password = newValue
		let assetJSONasBytes = Buffer.from(JSON.stringify(asset))
		await stub.putState(key, assetJSONasBytes)
		console.info('- End update asset (success) -')
	}

	async updateAssetRole(stub, args, thisClass) {
		if (args.length < 2) {
			throw new Error('Incorrect number of arguments. Expecting key and new value.')
		}
		let key = args[0]
		let newValue = args[1]
		console.info('- Start updating asset - ')
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
		console.info(asset)
		asset.role = newValue
		let assetJSONasBytes = Buffer.from(JSON.stringify(asset))
		await stub.putState(key, assetJSONasBytes)
		console.info('- End update asset (success) -')
	}

    async updateAssetAdditionalInfo(stub, args, thisClass) {
		if (args.length < 2) {
			throw new Error('Incorrect number of arguments. Expecting key and new value.')
		}
		let key = args[0]
		let newValue = args[1]
		console.info('- Start updating asset - ')
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
		console.info(asset)
		asset.additionalInfo = newValue
		let assetJSONasBytes = Buffer.from(JSON.stringify(asset))
		await stub.putState(key, assetJSONasBytes)
		console.info('- End update asset (success) -')
	}
}
shim.start(new Chaincode())