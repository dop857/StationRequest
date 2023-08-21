'use strict';
const process =require('process');
const DeviceManager=require("./DeviceManager").DeviceManager;//Модуль взаимодействия с устройствами
const ServerManager=require("./ServerManager").ServerManager;//Модуль взаимодействия с сервером
const ParsingAnswers=require("./ParsingAnswers").ParsingAnswers;//Модуль ответом от сервера
const fs=require("fs/promises");
const Log = require("./LoggerManager").LoggerManager;//модуль логов


let config={};//глобальная конфигурация

/* разкоментировать для перенаправления всех исключений в файл
process.on('uncaughtException', (err, origin) => {
    fs.writeFile('./logs/errors'+Date.now()+'_errors.log',process.stderr.fd+
        `Caught exception: ${err}\n` +
        `Exception origin: ${origin}`)

});*/

//чтение файла конфигурации где {"server":ip адрес сервера,"port":порт сервера,"entryPoint":точка входа для станции опроса,"interval":интервал в МС для сеанса с сервером,"_id":уникальный идентификатор,"company":наименование компании,"placeName":месторасположение,"timeClearLog": период хранения логов
fs.readFile('./config.json', { encoding: 'utf8' }).then((contents)=>
{
    config = JSON.parse(contents);

    if(config._id=="")//если идентификатор станции не определен то выполняется участок получения идентификатора с сервера
    {
        let data=config;
        console.log(data)
        fetch("http://"+config.server+":"+config.port+config.entryPoint+'/station/regNew',
            {
                    method: "POST",headers:{'Accept': 'application/json, text/plain, */*','Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                }).
        then((res)=>
        {
            console.log("in result fetch config")
            res.text().then((r)=>
            {
                r=JSON.parse(r);
                config._id=r["_id"];
                fs.writeFile('./config.json',JSON.stringify(config)).then(()=>
                {
                    StartInit();
                })
            }).catch((err)=>
            {
                console.error(err.message);
            });
        });
    }
    else
    {
        StartInit();
    }



});

//инициализация модулей
function StartInit()
{
    let path=String("./");
    Log.Construct(1000,"ActiveLog",path,config.timeClearLog);

    ServerManager.Construct(config.server,config.port,config._id,ParsingDataFromServer);
    DeviceManager.AddFuncListener(ListenerReadyFromModbus,"readyToSend");
    DeviceManager.AddFuncListener(ListenerErrorDevice,"errorDevice");
    setInterval(()=>{StationIsActive();},config.interval);
}

//функция сессии активности станции
function StationIsActive()
{
    const data=JSON.stringify({"stationId": config._id,"lastActive": Date.now().toString(),"interval": config.interval,"isFirstSession":ServerManager.isFirstSession});
    if(ServerManager.isFirstSession==true)ServerManager.isFirstSession=false;
    ServerManager.SendData("/receiver/station",data,"POST");
    Log.add(JSON.stringify({count:Object.keys(DeviceManager.devices).length}),"Device");
}

function ParsingDataFromServer()
{
    ParsingAnswers(ServerManager);
}
//Отправка пакета из модбас по событию readyToSend
function ListenerReadyFromModbus(_id,)
{
    let dev=DeviceManager.devices[_id];
    let rec=dev.receiver.shift();
    if(rec.type=="programCycl" || rec.type=="errorDevice" )//проверка если тип записи programCycl или errorDevice то формирование пакета происходит по этому алгоритму
    {
        let data =
            {
                currentData:
                {
                    type: rec.type,
                    programPackId: rec.programPackId,
                    pack: rec.p,
                    date: rec.t,
                    dec: rec.d,
                    bit:rec.b,
                    buferrors:rec.buferrors
                },
                archiveRecord:rec.archiveRecord,
                deviceId:_id
            }
            if(rec.type=="errorDevice")
            {

                data["deviceCurrentErrors"]=DeviceManager.devices[_id].deviceCurrentErrors
                console.log(data)
            }
        //console.log(data);

        ServerManager.SendData("/receiver/packet",JSON.stringify(data),"POST");
    }
    if(rec.type=="bigPack")//отправка одни сообщением нескольких пакетов
    {

        ServerManager.SendData("/receiver/bigPacket",JSON.stringify(rec),"POST");
    }


}
//функция отправки по событию errorDevice
function ListenerErrorDevice(_id,error)
{
    ServerManager.SendData("/receiver/error",JSON.stringify({_id:_id,error:error,date:Date.now()}),"POST");
}












