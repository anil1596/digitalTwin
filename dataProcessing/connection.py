import json
import requests

# deviceID = "ubuntu-b8:27:eb:e1:16:19"

def accessNewToken():
    print('Getting Bearer Token for User')
    url = "35.235.92.92:4000"    
    channelName = "common"
    smartContractName = "digitalTwin2"
    postURL = 'http://{}/users/register'.format(url)

    headers = {
        'Content-Type':'application/json',        
    }

    body = {
        "username": "user1",
        "orgName": "Manufacturer",
        "role": "manufacturer",
        "attrs": [
            {
                "name":"client1",
                "value":"yes",
                "ecert": True
            }, 
        ],
        "secret": "9198e23d54de4cc9a887d003f5872df2"
    }

    response = requests.post(postURL, data=json.dumps(body), headers=headers)
    token = response.json()['token']
    tokenFile = open('token.txt', 'w')
    tokenFile.write(token)
    tokenFile.close()
    return token

def getData(deviceID):
    headers = {
    'Content-Type':'application/json',
    'Accept':'application/json',
    'Authorization': 'Bearer ' + accessNewToken()
    }

    body = {
            "peers": ["peer1.machine1.manufacturers.org"],
            "fcn": "getHistoryForDigitalTwin",
            # "args": ["{\"id\": /{}}".format(deviceID)]
            "args": ["{\"id\":\"raspberrypi-b8:27:eb:e1:16:19\"}"]
    }

    url = '35.235.92.92:4000'
    channel_name = 'common'
    chaincode_name = 'digitalTwin2'
    postURL = "http://{}/channels/{}/chaincodes/{}".format(url, channel_name, chaincode_name)
    return requests.post(postURL, data=json.dumps(body), headers=headers)

def getHistoricalData(deviceID="ubuntu-b8:27:eb:e1:16:19"):
    try:
        response = getData(deviceID)
        with open('data.txt', 'w') as dataFile:
            dataFile.write(response.text)
        return json.load(open('data.txt', 'r'))
    except:
        print('Something Went Wrong')
        return 'Error'