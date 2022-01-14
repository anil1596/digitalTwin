import json
import os
import connection

print('Downloading Historical Data for ')
# data = connection.getHistoricalData()
data = json.load(open('data.txt', 'r'))
if data == 'Error':
    print('Some Error in data Fetching')
    
logFile = open('params.log', 'w')
# print("Start Processing Data: ", len(data["response"]["Record"]))
state = ['Fan on Not Moving', 'idle', 'Fan off Moving', 'Fan on Moving']

p1 = "tcpConnections" + ',' + "dnsSize"
p2 = "totalTasks" + ',' + "runningTasks" + ',' + "sleepingTasks" + ',' + "stoppedTasks" + ',' + "zombie"
p3 = "totalMemory" + ',' + "freeMemory" + ',' + "usedMemory" + ',' + "bufferCache"
p4 = "totalSwap" + ',' + "freeSwap" + ',' + "usedSwap" + ',' + "availableMemory"
p5 = "deviceState"
logFile.write(p1 + ',' + p2 + ',' + p3 + ',' + p4 + ',' + p5 + '\n')


for index, val in enumerate(data["response"]["Record"]):
    try:
        dynamicParams = json.loads(str(val["Value"]["dynamicParams"]).replace("'", "\""))
        
        #TCP connections
        tcpConnections = str(len(dynamicParams["TCP"]["TCP"]))
        dnsSize = str(len(dynamicParams["DNS"]["DNS"]))
        p1 = tcpConnections + ',' + dnsSize
        
        #MetaData of Tasks 
        totalTasks = dynamicParams["Kernel Processes"]["MetaData"]["Tasks"]["total"]
        runningTasks = dynamicParams["Kernel Processes"]["MetaData"]["Tasks"]["running"]
        sleepingTasks = dynamicParams["Kernel Processes"]["MetaData"]["Tasks"]["sleeping"]
        stoppedTasks = dynamicParams["Kernel Processes"]["MetaData"]["Tasks"]["stopped"]
        zombie = dynamicParams["Kernel Processes"]["MetaData"]["Tasks"]["zombie"]
        p2 = totalTasks + ',' + runningTasks + ',' + sleepingTasks + ',' + stoppedTasks + ',' + zombie
        
        #Memory Utilisation
        totalMemory = dynamicParams["Kernel Processes"]["MetaData"]["MiB Mem "]["total"]
        freeMemory = dynamicParams["Kernel Processes"]["MetaData"]["MiB Mem "]["free"]
        usedMemory = dynamicParams["Kernel Processes"]["MetaData"]["MiB Mem "]["used"]
        bufferCache = dynamicParams["Kernel Processes"]["MetaData"]["MiB Mem "]["buff/cache"]
        p3 = totalMemory + ',' + freeMemory + ',' + usedMemory + ',' + bufferCache
        
        #Swap Utilisation
        totalSwap = dynamicParams["Kernel Processes"]["MetaData"]["MiB Swap"]["total"]
        freeSwap = dynamicParams["Kernel Processes"]["MetaData"]["MiB Swap"]["free"]
        usedSwap = dynamicParams["Kernel Processes"]["MetaData"]["MiB Swap"]["used"]
        availableMemory = dynamicParams["Kernel Processes"]["MetaData"]["MiB Swap"]["avail Mem"]
        p4 = totalSwap + ',' + freeSwap + ',' + usedSwap + ',' + availableMemory
        
        #Device State (for Data labelling)
        deviceState = dynamicParams["State"]
        p5 = str(state.index(deviceState))
        
        # print(p1 + ',' + p2 + ',' + p3 + ',' + p4 + ',' + p5 + '\n')
        logFile.write(p1 + ',' + p2 + ',' + p3 + ',' + p4 + ',' + p5 + '\n')
        
    except Exception as e:
        print('Something Wrong with Record: ', index)
        # if index == 626:
        print(e)
            # print(e, str(val["Value"]["dynamicParams"]).replace("'", "\""))
            # print(str(val["Value"]["dynamicParams"]))
        continue

logFile.close()
os.system('copy params.log params.csv')