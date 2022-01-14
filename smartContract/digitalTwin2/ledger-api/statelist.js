/*
SPDX-License-Identifier: Apache-2.0
*/

'use strict';
const State = require('./state.js');

/**
 * StateList provides a named virtual container for a set of ledger states.
 * Each state has a unique key which associates it with the container, rather
 * than the container containing a link to the state. This minimizes collisions
 * for parallel transactions on different states.
 */
class StateList {

    /**
     * Store Fabric context for subsequent API access, and name of list
     * @param {ctx} the transaction context
     * @param (listName} name of StateList object that is referenced
     */
    constructor(ctx, listName) {
        this.ctx = ctx;
        this.name = listName;
        this.supportedClasses = {};

    }

    /**
     * Add a state to the list. Creates a new state in worldstate with
     * appropriate composite key.  Note that state defines its own key.
     * State object is serialized before writing.
     * @param {state} Javascript object/record to be stored to state
     */
    async addState(state) {
        let key = this.ctx.stub.createCompositeKey(this.name, state.getSplitKey());
        console.log(key)
        let data = State.serialize(state);
        await this.ctx.stub.putState(key, data);
    }

    /**
     * Get a state from the list using supplied keys. Form composite
     * keys to retrieve state from world state. State data is deserialized
     * into JSON object before being returned.
     * @param (key) key of record to get state for
     */
    async getState(key) {
        let ledgerKey = this.ctx.stub.createCompositeKey(this.name, State.splitKey(State.makeKey([key])));
        console.log(ledgerKey)
        let data = await this.ctx.stub.getState(ledgerKey);
        let state = State.deserialize(data, this.supportedClasses);
        return state;
    }

    /**
     * Get a state from the list using supplied keys. Form composite
     * keys to retrieve state from world state. State data is deserialized
     * into JSON object before being returned.
     * @param (key) key of record to get state for
     */
     async getHistory(key) {
        let ledgerKey = this.ctx.stub.createCompositeKey(this.name, State.splitKey(State.makeKey([key])));
        console.log(ledgerKey)
        let iterator = await this.ctx.stub.getHistoryForKey(ledgerKey);
        // let state = State.deserialize(data, this.supportedClasses);
        return iterator;
    }

    /**
     * Get a list of states from the ledger using supplied start and end key values.
     * Returns a list of strings.
     * @param (start) key to query from
     * @param (end) key to query to
     */
    async getStateByRange(start, end) {
        let iterator = await this.ctx.stub.getStateByRange(start, end);
        let allResults = [];

        while (true) {
            let res = await iterator.next();
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
                await iterator.close();
                return allResults;
            }
        }
    }

    /**
     * Get a f state from the ledger based on a part of a composite key.
     * Returns a state.
     * @param (key) key of the record to get state of
     */
    async getStateByPartialCompositeKey(key) {
        const iterator = await this.ctx.stub.getStateByPartialCompositeKey(key, []);
        return iterator;
    }

    /**
     * Update a state in the list. Puts the new state in world state with
     * appropriate composite key.  Note that state defines its own key.
     * A state is serialized before writing. Logic is very similar to
     * addState() but kept separate becuase it is semantically distinct.
     * @param {state} state to be updated/put
     */
    async updateState(state) {
        console.log(state)
        let key = this.ctx.stub.createCompositeKey(this.name, state.getSplitKey());
        let data = State.serialize(state);
        await this.ctx.stub.putState(key, data);
    }

    /** Stores the class for future deserialization
     * @param {stateClass} class name.
     */
    use(stateClass) {
        this.supportedClasses[stateClass.getClass()] = stateClass;
    }

    /**
     * Get a list of all keys from the ledger.
     * Returns a list of strings.
     * @param {recordType} record/document type to returns keys of
     */
    async getAllKeysForRecordType(recordType) {
        const iterator = await this.ctx.stub.getStateByRange('', '');
        const allkeys = [];

        while (true) {
            const res = await iterator.next();
            if (res.done) {
                await iterator.close();
                return allkeys;
            }
            let record;
            try {
                record = JSON.parse(res.value.value.toString('utf8'));
            } catch (err) {
                record = res.value.value.toString('utf8');
            }
            if (res.value && res.value.value.toString()) {
                const Key = res.value.key;
                if (record['recordType'] == recordType){
                    allkeys.push(Key);
                }
            }
        }
    }

    /**
     * Get a list of all states from the ledger.
     * Returns a list of strings.
     * @param {recordType} record/document type to returns keys of
     */
    async getAllStatesForRecordType(recordType) {
        const iterator = await this.ctx.stub.getStateByRange('', '');

        const allResults = [];
        while (true) {
            const res = await iterator.next();
            if (res.done) {
                await iterator.close();
                return JSON.stringify(allResults);
            }
            if (res.value && res.value.value.toString()) {
                const Key = res.value.key;
                let record;
                try {
                    record = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    record = res.value.value.toString('utf8');
                }
                if (record['recordType'] == recordType) {
                    allResults.push({Key, record});
                }
            }

        }
    }
    
}

module.exports = StateList;