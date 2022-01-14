'use strict'

const digitalTwinEntryRecord = require('./digitalTwinEntryRecord.js')
const digitalTwinEntriesRecordList = require('./digitalTwinEntriesRecordList.js')

const { Contract, Context } = require('fabric-contract-api')
const Utils = require('./utils.js')

const shim = require('fabric-shim');
const ClientIdentity = shim.ClientIdentity;

class digitalTwinEntryContext extends Context {

    constructor() {
        super()
        this.digitalTwinEntriesRecordList = new digitalTwinEntriesRecordList(this)
    }

}

/**
 * Smart contract managing Digital Twin data entries
 *
 */
class digitalTwinContract extends Contract {

    constructor() {
        super('digitalTwinContract')
    }

    createContext() {
        return new digitalTwinEntryContext()
    }

    async init(ctx) {
        console.log('Successfully instantiated the digitalTwin smart contract.');
    }

    async unknownTransaction(ctx) {
        throw new Error('Function name is missing.')
    }

    async beforeTransaction(ctx) {
        console.log('---------------------beforeTransaction-----------------------')
        let func_and_params = ctx.stub.getFunctionAndParameters()
        console.log('---------------------func_and_params-----------------------')
        console.log(func_and_params)
        let cid = new ClientIdentity(ctx.stub);
        console.log('---------------------FUNCTION EXECUTION START-----------------------')
        ctx.enrollmentID = cid.getAttributeValue('hf.EnrollmentID')
        ctx.mspID = cid.getMSPID()
        console.log(`Caller MSP: ${ctx.mspID}, Caller username: ${ctx.enrollmentID}`)
    }

    async afterTransaction(ctx, results) {
        console.log('---------------------afterTransaction-----------------------')
        console.log(results)
    }


    /**
     * Create a new Digital Twin
     *
     * @param {Context} ctx the transaction context
     * @param {String} args the String containing all the elements 
     * @throws {shim.error} transaction execution failure
     */
    async createDigitalTwin(ctx, args) {
        try {

            let record = digitalTwinEntryRecord.createInstance(args)
            await ctx.digitalTwinEntriesRecordList.addRecord(record)
            console.log(`Created digitalTwin record: ${JSON.stringify(record)}`)
            return record
        } catch (e) {
            let message = `Error in createDT function: ${e}`
            Utils.dumpError(e);
            return shim.error(message)
        }
    }

    /**
     * Get Asset State 
     *
     * @param {Context} ctx the transaction context
     * @param {Array} args the array of String  
     * @throws {shim.error} transaction execution failure
     */
    async getDigitalTwinByID(ctx, args) {
    
        let inputData = JSON.parse(args)
        let id = inputData['id']
        if (!id) {
            throw new Error(' Asset key must not be empty')
        }

        let asset = await ctx.digitalTwinEntriesRecordList.getRecord(id)

        console.info('=======================================')
        console.log(asset)
        console.info('=======================================')
        return asset
    }

    /**
     * Update Asset State 
     *
     * @param {Context} ctx the transaction context
     * @param {Array} args the array of String  
     * @throws {shim.error} transaction execution failure
     */
    async updateDigitaltTwin(ctx, args) {
	
        console.log(args)
        let inputData = JSON.parse(args)
		let deviceId = inputData['id']
        let currentOwner = inputData['owner']
		let currentState = inputData['dynamicParams']
        
        //check diff b/w GPIO pin o/p and encoder o/p
        // if(inputData["dynamicParams"]["GPIO Pin Output"] == "Moving" && inputData["dynamicParams"]["State"].includes("Not Moving")){
        //     throw new Error("Something wrong with Device state")
        // }

		console.info('- Start updating asset - ')
		let asset = await ctx.digitalTwinEntriesRecordList.getRecord(deviceId)
        
        //only update asset if ownerId matches && device state is active on blockchain
        if(currentOwner == asset["owner"] && "active" == asset["state"]){
            asset.updateState(currentState)
            // console.log('Updated Asset', asset)
            await ctx.digitalTwinEntriesRecordList.updateRecord(asset)
            console.info('- End update asset (success) -')
        }else{
            throw new Error("Not authorized to update Asset State")
        }
	}

    /**
     * getHistoryForAsset - gets all previous transactions for asset
     *
     * @param {Context} ctx the transaction context
     * @param {Array} args the array of String  
     * @throws {shim.error} transaction execution failure
     */
    async getHistoryForDigitalTwin(ctx, args) {
        
        console.log(args)
        let inputData = JSON.parse(args)
		let deviceId = inputData['id']
        console.info('- start getHistoryForAsset: %s', deviceId)
    
        let resultsIterator = await ctx.digitalTwinEntriesRecordList.getHistory(deviceId)
        let results = await this.getAllResults(resultsIterator, true)
    
        return results
    }

    /**
     * 
     * getAllResults - packs the results to JSON array
     *
     * 
     */
    async getAllResults(iterator, isHistory) {
        console.log('Start iterating data')
        let result = [];
        let res = await iterator.next();
        while (!res.done) {
            try{
                if (res.value) {
                    let jsonRes = {}
                    console.log(res.value.value.toString('utf8'))
                    if (isHistory && isHistory === true) {
                        jsonRes["TxId"] = res.value.tx_id
                        jsonRes["Timestamp"] = res.value.timestamp
                        try {
                            jsonRes["Value"] = JSON.parse(res.value.value.toString('utf8'))
                        } catch (err) {
                            console.log(err)
                            jsonRes["Value"] = res.value.value.toString('utf8')
                        }
                    } else {
                        jsonRes["Key"] = res.value.key
                        try {
                            jsonRes.Record = JSON.parse(res.value.value.toString('utf8'))
                        } catch (err) {
                            console.log(err)
                            jsonRes["Record"] = res.value.value.toString('utf8')
                        }
                    }
                    result.push(jsonRes)
                }
                res = await iterator.next();
            }catch(e){
                console.log('Error while iterating data: ', e);
            }
        }
        await iterator.close();
        return result;
    }
    
    /**
     * Evaluate a queryString
     * This is the helper function for making queries using a query string
     *
     * @param {Context} ctx the transaction context
     * @param {String} queryString the query string to be evaluated
     */
    async queryWithQueryString(ctx, queryString) {
        
        let resultsIterator = await ctx.stub.getQueryResult(queryString);
        let allResults = [];
        while (true) {
            let res = await resultsIterator.next();
            if (res.value && res.value.value.toString()) {
                let jsonRes = {};
                jsonRes.Key = res.value.key;
                try {
                    jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    jsonRes.Record = res.value.value.toString('utf8');
                }
                allResults.push(jsonRes);
            }
            if (res.done) {
                await resultsIterator.close();
                return allResults
            }
        }
        return allResults
    }


    /**
     * Getting all digital Twin entries.
     *
     * @param {Context} ctx the transaction context
     *
     * @returns {JSON} the required records
     * @throws {shim.error} transaction execution failure
     */
    async getAllDigitalTwinEntries(ctx) {
        try {

            // if (!(ctx.mspID === Utils.manufacturerMSP || ctx.mspID === Utils.securityMSP)) {
            //     return shim.error(`Function private to ${Utils.manufacturerMSP} or ${Utils.securityMSP}.`)
            // }

            let queryString = {
                "selector": {
                    "recordType": 'digitalTwinEntry'
                }
            }
            let queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));
            return queryResults
        } catch (e) {
            let message = `Error in getAllDigitalTwinEntries function: ${e}`
            Utils.dumpError(e);
            return shim.error(message)
        }
    }

    /**
     * Getting all digital Twins by Owner
     *
     * @param {Context} ctx the transaction context
     * @param {args} args the array of input strings
     *
     * @returns {JSON} the required records
     * @throws {shim.error} transaction execution failure
     */
    async getDigitalTwinbyOwner(ctx, args) {
        try {
            // if (!(ctx.mspID === Utils.manufacturerMSP || ctx.mspID === Utils.securityMSP)) {
            //     return shim.error(`Function private to ${Utils.manufacturerMSP} or ${Utils.securityMSP}.`)
            // }
            
            let inputData = JSON.parse(args)
            let owner = inputData['owner']
            var queryString = {
                "selector":{
                    "owner": owner,
                }
            }
            let queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));
            return queryResults
        } catch (e) {
            let message = `Error in getAssetByOwner function: ${e}`
            Utils.dumpError(e);
            return shim.error(message)
        }
    }

    /**
     * Getting all Digital Twin entries in specified time interval.
     *
     * @param {Context} ctx the transaction context
     * @param {Context} x the start of the interval in epoch
     * @param {Context} y the end of the interval in epoch
     *
     * @returns {JSON} the required records
     * @throws {shim.error} transaction execution failure
     */
     async getDigitalsTwinFromXtoY(ctx, x, y) {
        try {
                          
            let queryString = {
                "selector": {
                    "recordType": 'digitalTwinEntry',
                    "$and": [
                        {
                            "createdAt": {
                                "$gt": parseInt(x)
                            }
                        },
                        {
                            "createdAt": {
                                "$lt": parseInt(y)
                            }
                        }
                    ]
                }
            }
            return await this.queryWithQueryString(ctx, JSON.stringify(queryString))
        } catch (e) {
            let message = `Error in getDigitalTwinFromXtoY function: ${e}`
            Utils.dumpError(e);
            return shim.error(message)
        }
    }

}

module.exports = digitalTwinContract