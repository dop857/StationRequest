const Emitter = require('events');
const CRC32 = require("crc-32");
let List = require("collections/list");

const ParsingAnswers=require("./ParsingAnswers").ParsingAnswers;

const ServerManager=
{
    ip:"",//ip сервера
    port:"",//порт
    entryPoint:"",//точка входа
    dataForSend:"",//массив данных для хранения
    stationId:"",//id станции опроса
    isFirstSession:true,//флаг определения первого запуска станции нужен чтоб не ждать 2 секунды
    method:"",//метод запроса
    events: {name:"",emitter:""},
    emitter:"",
    answers:{},//массив для хранения ответов
    Construct(ip,port,stationId,funcPars)
    {
        this.port=port;
        this.ip=ip;
        this.stationId=stationId;
        this.dataForSend=new List();
        this.answers=new List();
        this.emitter=new Emitter();
        //this.eventReadyForSend=new Event("dataExistForSendToServer");
        this.emitter.on("dataExistForSendToServer",this.Session);
        this.emitter.on("dataExistFromServer",funcPars);
    },
    async ConfigIdVerification(config)
    {
        let result;
        if(config._id.length<2)
        {
            let data=config;
        }
        else
        {
            result=config;
        }
        return result;

    },
    SendData(entryPoint,Data,method)//функция для извещения о событии готовности отправки данных
    {
        this.dataForSend.push({entryPoint:entryPoint,data:Data,method:method});
        this.emitter.emit("dataExistForSendToServer");
    },
    Session()//функция подготовки и отправки данных на сервер
    {
        if(ServerManager.dataForSend.length>0)
        {
            let currentObj=ServerManager.dataForSend.shift();
            let data=JSON.parse(currentObj.data);
            data["stationId"]=ServerManager.stationId;
            if(currentObj.method=="POST")
            {
                let dataString=JSON.stringify(data);
                console.log("IN SESSION SERVER MANAGER");
                console.log(dataString);
                let keyAuthor=CRC32.str(dataString+"mer");
                fetch("http://"+ServerManager.ip+":"+ServerManager.port+currentObj.entryPoint,{method: currentObj.method,headers:{'Authorization':keyAuthor,'Accept': 'application/json, text/plain, */*','Content-Type': 'application/json'},body: dataString
                }).then((res)=>
                {
                    if(res.status==200)
                    {
                        res.text().then((r)=>
                        {
                            ServerManager.answers.push(r);
                            ServerManager.emitter.emit("dataExistFromServer");
                        }).catch((e)=>
                        {
                            console.log(e);
                            ServerManager.dataForSend.push(currentObj);
                        });
                    }
                })
                    .catch(function (error)
                    {
                        console.log("ERROR fetch SESSION");
                        console.log(error);
                    });
            }
        }
    }
}
module.exports.ServerManager=ServerManager;