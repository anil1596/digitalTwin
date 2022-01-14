'use strict'
const State = require('./ledger-api/state.js')
const { v4: uuidv4 } = require('uuid');

class digitalTwinEntryRecord extends State {

    constructor(obj) {
        super(digitalTwinEntryRecord.getClass(), [obj.ID])
        Object.assign(this, obj)
    }


    deviceName() { return this.deviceName }
    owner() { return this.owner }
    state() { return this.state }
    MACaddress() { return this.MACaddress }
    serialNumber() { return this.serialNumber }
    manufacturer() { return this.manufacturer }
    hardware() { return this.hardware }
    memorySize() { return this.memorySize }
    osInfo() { return this.osInfo }
    staticIP() { return this.staticIP }
    dynamicParams() { return this.dynamicParams }
    price() { return this.price }
    updateState(dynamicParams){ this.dynamicParams = dynamicParams  }

    static fromBuffer(buffer) {
        return digitalTwinEntryRecord.deserialize(Buffer.from(JSON.parse(buffer)))
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this))
    }

    static deserialize(data) {
        return State.deserializeClass(data, digitalTwinEntryRecord)
    }

    static createInstance(args) {
        let inputData = JSON.parse(args)
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
        let ID = inputData['deviceName']
        return new digitalTwinEntryRecord({ ID, deviceName, owner, state, MACaddress, serialNumber, manufacturer, hardware, memorySize, osInfo, staticIP, dynamicParams, price})
    }

    static getClass() {
        return 'digitalTwinEntryRecord'
    }

}

module.exports = digitalTwinEntryRecord