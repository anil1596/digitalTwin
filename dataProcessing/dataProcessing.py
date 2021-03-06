import json
import os
import connection

print('Downloading Historical Data for ')
# data = connection.getHistoricalData()
data = json.load(open('Dynamic_Data.json', 'r'))
if data == 'Error':
    print('Some Error in data Fetching')
    
logFile = open('params.log', 'w')
print("Start Processing Data: ", len(data["response"]["Record"]))
state = ['Fan on Not Moving', 'idle', 'Fan off Moving', 'Fan on Moving']

p1 = "tcpConnections" + ',' + "dnsSize"
p2 = "totalTasks" + ',' + "runningTasks" + ',' + "sleepingTasks" + ',' + "stoppedTasks" + ',' + "zombie"
p3 = "totalMemory" + ',' + "freeMemory" + ',' + "usedMemory" + ',' + "bufferCache"
p4 = "totalSwap" + ',' + "freeSwap" + ',' + "usedSwap" + ',' + "availableMemory"
p5 = "deviceState"
p6_list=[]
SAR=json.loads(data['response']['Record'][-1]["Value"]["dynamicParams"].replace("'", "\""))['System Activity Report']
for item, vals in SAR.items():
    if type(vals)==dict:
        for key,val in vals.items():
            p6_list.append(item+'_'+key)
            
p7 = "GPIO output"
logFile.write(p1 + ',' + p2 + ',' + p3 + ',' + p4 + ',' + p5 + ',' + ','.join(p6_list) + p7 +'\n')


for index, val in enumerate(data):
    try:
        # dynamicParams = json.loads(str(val["Value"]["dynamicParams"]).replace("'", "\""))
        dynamicParams = json.loads(str(val).replace("'", "\""))
        
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
        
        #System Activity Report
        p6_values=[]
        SAR=dynamicParams['System Activity Report']        
        if SAR:
            for key in p6_list:                
                if '_' in key:
                    header,item=key.split('_')                    
                    value=SAR[header][item]                    
                    p6_values.append(value)                    
        
        gpioOP = dynamicParams["GPIO Pin Output"]
        p7 = gpioOP
        
        # print(p1 + ',' + p2 + ',' + p3 + ',' + p4 + ',' + p5 + '\n')
        logFile.write(p1 + ',' + p2 + ',' + p3 + ',' + p4 + ',' + p5 + ',' + ','.join(p6_values) + p7 + '\n')
        
    except Exception as e:
        print('Something Wrong with Record: ', index)
        # if index == 626:
        print(e)
            # print(e, str(val["Value"]["dynamicParams"]).replace("'", "\""))
            # print(str(val["Value"]["dynamicParams"]))
        continue

logFile.close()
os.system('copy params.log params.csv')