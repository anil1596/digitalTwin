function dumpError(err) {
    if (typeof err === 'object') {
        if (err.message) {
            console.log('\nMessage: ' + err.message)
        }
        if (err.stack) {
            console.log('\nStacktrace:')
            console.log('====================')
            console.log(err.stack);
        }
    } else {
        console.log('dumpError :: argument is not an object');
    }
}

module.exports.dumpError = dumpError
// Organizations constants here:
module.exports.endUserMSP = "EndUserMSP"
module.exports.manufacturerMSP = "ManufacturerMSP"
module.exports.securityMSP = "securityMSP"

module.exports.communicationChannel = "common"