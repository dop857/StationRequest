'use strict';
//import net from "net";
const DeviceManager=require("./DeviceManager").DeviceManager;
const ServerManager=require("./ServerManager").ServerManager;
const net = require('net');
const fs=require("fs/promises");

let config={};

fs.readFile('./config.json', { encoding: 'utf8' }).then((contents)=>
{
    config = JSON.parse(contents);
    console.log(config);
    setInterval(ServerProcess,config.interval);
}).catch((err)=>{
    console.error(err.message);
});

function ServerProcess()
{
    //проверка существуют ли устройства
    if(Object.keys(DeviceManager.devices).length==0)
    {
        const data=JSON.stringify(
            {
                         "stationId": config.id,
                        "lastActive": Date.now().toString(),
                        "company": config.company,
                  });
        fetch("http://"+config.server+":"+config.port+config.entryPoint+"/station",{method: "POST",headers:{'Accept': 'application/json, text/plain, */*','Content-Type': 'application/json'},body: data
            }).then((res)=>
                {
                    res.json().then((resp)=>{

                        for(let dev in resp)
                        {
                            console.log(resp[dev]);
                            DeviceManager.addDevice(resp[dev]);
                        }



                    });
                    //console.log(res.body);
                }).catch(function (error)
                {
                    console.log("errrr");
                    // ... ошибки.
                });
    }
    else //если устройства имеются в мэнеджере устройств то все устройства у которых буфер не пустой отправляются на сервер
    {
        const data=JSON.stringify(DeviceManager.devices);//переписать!!!!!!!!!!!!
        fetch("http://"+config.server+":"+config.port+config.entryPoint+"/device",{method: "POST",headers:{'Accept': 'application/json, text/plain, */*','Content-Type': 'application/json'},body: data
        }).then((res)=>
        {
            res.json().then((resp)=>{

                for(let dev in resp)
                {
                    console.log(resp[dev]);
                    DeviceManager.addDevice(resp[dev]);
                }



            });
            //console.log(res.body);
        }).catch(function (error)
        {
            console.log("errrr");
            // ... ошибки.
        });
    }
}





/*
const device={
    _id: '6405b649b535d8a2a4cf77b6',
    ip: '127.0.0.1',
    port: '504',
    name: 'm1',
    programPackets: { '1': [Object] },
    datePackUpdate: '',
    userId: '1',
    lastSendTime: '0',
    periodTime: '100',
    placeStation: '1'



};
const device2={
    "ip":"127.0.0.1",
    "port":"504",
    "packets":{"1":{"str":"008800000006010300000002"}},
    "lastSendTime":"0",
    "periodTime":"100",
    "reciever":{"0":{"p":""}},

};
*/
//DeviceManager.addDevice(device);
//DeviceManager.addDevice(device2);








