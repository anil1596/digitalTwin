'use strict'

const StateList = require('./ledger-api/statelist.js')

const digitalTwinEntryRecord = require('./digitalTwinEntryRecord.js')

class digitalTwinEntriesRecordList extends StateList {
    constructor(ctx) {
        super(ctx, 'digitalTwinEntryRecordlist')
        this.use(digitalTwinEntryRecord)
    }

    async addRecord(record) {
        return this.addState(record)
    }

    async getRecord(key) {
        return this.getState(key)
    }

    async updateRecord(record) {
        return this.updateState(record)
    }


}

module.exports = digitalTwinEntriesRecordList