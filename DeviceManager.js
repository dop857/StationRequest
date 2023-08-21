const net = require('net');
const CRC32 = require("crc-32");
let List = require("collections/list");
const Emitter = require("events");
const converter = require("hex2dec");
const { hexToDec} = require("hex2dec");


const {Mathem} = require("./Mathem");

//Модуль взаимодействия с подключенными устройствами
const DeviceManager=
    {
        "devices": {},//устройства
        "tcpSockets": {},//сокеты
        "programPackCicl":{},//тэги
        "programCounter":100,//счетчик ModbusTCP пакетов
        "errors":{},//ошибки сокета
        "handlerTcpDevice":{},//обработчик состояний tcp взаимодействия с контроллером
        "emitter":"",//событийный генератор для событий готовности пакетов к отправке на сервер

        "lastSendModbasDate":"",//время последней отправки пакета
        "modbusPacker":{minaddress:{"03":"","04":"","05":"","06":""},maxaddress:{"03":"","04":"","05":"","06":""},period:""},//упаковщик для одного большого пакета
        "archiveDataProgramPack":{},//объект хранения для архивных данных
        "listers":new List(),//функции слушатели событий

        addDevice(device,program)//добавить устройство в станцию опроса где device - объект устройства, program - объект тэгов
        {
            let nd=device._id;//номер девайса
            this.devices[nd]=device;
            this.devices[nd]['receiver']=new List();

            this.programPackCicl[nd]={};
            if(Object.keys(program).length>0)
            {
                this.RegistryNewProgramOnStation(program);
                //добавить программу в очередь отправки
                //this.AddProgramInListDeviceRequest(nd,program)
            }

            this.emitter=new Emitter();

            this.emitter.on("readyToSend",this.ReadyToSend);
            this.emitter.on("errorDevice",this.ErrorDevice);

            this.devices[nd]['hendlers']= {};

            this.tcpSockets[nd]=new net.Socket();
            this.tcpSockets[nd].setTimeout(15000);//вочдог таймаут ыл 10000
            this.tcpSockets[nd]["lastIp"]=DeviceManager.devices[nd].ip;
            this.tcpSockets[nd]["lastPort"]=DeviceManager.devices[nd].port;
            this.tcpSockets[nd]["readyToSend"]=true;

            DeviceManager.devices[nd]["programPackBigPack"]={};
            DeviceManager.devices[nd]["programPackBigPack"]["counter"]=0;
            DeviceManager.devices[nd]["programPackBigPack"]["numPackTCP"]=1;
            DeviceManager.archiveDataProgramPack[nd]={};
            this.tcpSockets[nd].on('timeout',function ()
            {
                let deviceId=DeviceManager.GetDeviceByIp(this.remoteAddress,this.remotePort);
                DeviceManager.handlerTcpDevice[deviceId]="SocketTimeout"
                this.destroy();

            });
            this.tcpSockets[nd].on('close',function ()
            {
                DeviceManager.handlerTcpDevice[DeviceManager.GetDeviceByIp(this.remoteAddress,this.remotePort)]="SocketClose"
            });
            this.tcpSockets[nd].on('ready',function() {
                DeviceManager.handlerTcpDevice[DeviceManager.GetDeviceByIp(this.remoteAddress,this.remotePort)]="SocketReady"
            });
            this.tcpSockets[nd].on('error',(e)=>
            {
                console.log("ERRROROROROROR TCP "+this.remoteAddress);/*this.tcpSockets[nd].end();*/
                console.log(e);
                this.errors=e;
            });
            this.tcpSockets[nd].on("data",function (data)//обработка данных из сети контроллеров
            {
                console.log("IN DATA RECEIVER")
                const nd=DeviceManager.GetDeviceByIp(this.remoteAddress,this.remotePort);
                DeviceManager.handlerTcpDevice[nd]="SocketData"
                let ds=Buffer.from(data, 'hex').toString("hex");
                console.log(ds)
                let parsed;
                try
                {
                    if(DeviceManager.devices[nd].interfaceConnect==="ModbusTCP") parsed=DeviceManager.ParseModbusTCP(ds);
                    if(DeviceManager.ModbusAnswerHasAnError(parsed)===false)
                    {
                        if (parsed.tcpcount === "0001")
                        {
                            //записать ответ разовой команды
                        }
                        if (hexToDec(parsed.tcpcount) >= 100)
                        {
                            if(parsed.tcpcount.substring(0,2)==="03"||parsed.tcpcount.substring(0,2)==="04")//первые два значения определяют принадлежность к большому пакету
                            DeviceManager.PrepareProgramPacksFromBigPackToSendToServer(nd,parsed);
                            else
                            DeviceManager.PrepareProgramPackForSendToServer(nd,parsed)
                        }
                    }
                }
                catch (e){console.log(e);}
            });
            DeviceManager.HandlerTcpDevice(nd,this.tcpSockets[nd]);
        },
        HandlerTcpDevice(device)//обработчик этапов взаимодействия с сетью контроллеров
        {
            let timer={};//таймер для вочдога
            timer[device]=0;

            DeviceManager.handlerTcpDevice[device]="start";
            setInterval(()=>{

                switch (DeviceManager.handlerTcpDevice[device])
                {
                    case "start":

                        DeviceManager.tcpSockets[device].connect(DeviceManager.devices[device].port,DeviceManager.devices[device].ip);
                        timer[device]=Date.now();
                        DeviceManager.handlerTcpDevice[device]="started";
                    break;
                    case "started":
                        if(TimeBreak(timer[device],30000))
                        {
                            DeviceManager.tcpSockets[device].destroy();
                            DeviceManager.handlerTcpDevice[device]="start";
                        }
                    break;
                    case "SocketReady":
                        if (Date.now() - Number(DeviceManager.modbusPacker.period) > Number(DeviceManager.lastSendModbasDate) || DeviceManager.lastSendModbasDate === "")
                        {
                            DeviceManager.SendProgramFromList(device);
                            timer[device] = Date.now();
                            DeviceManager.handlerTcpDevice[device] = "ProgramSend";
                        }
                    break;
                    case "ProgramSend":
                        if(TimeBreak(timer[device],30000))
                        {
                            DeviceManager.tcpSockets[device].destroy();
                            DeviceManager.handlerTcpDevice[device]="start";
                        }
                    break;
                    case "SocketData":
                        timer[device]=Date.now();
                        DeviceManager.handlerTcpDevice[device]="SocketReady";
                    break;
                    case "SocketClose":
                        DeviceManager.tcpSockets[device].destroy();
                        DeviceManager.handlerTcpDevice[device]="start";
                    break;
                    case "SocketTimeout":
                        DeviceManager.tcpSockets[device].destroy();
                        DeviceManager.handlerTcpDevice[device]="start";
                    break;
                }
            },20)

            function TimeBreak(timer,period)
            {
                if(Date.now()-timer>period)return true;
                else return false;
            }

        },
        SendProgramFromList(nd)//отправить пакет программы в устройство nd
        {
            let prog={"message":""};
            try
            {
                    DeviceManager.lastSendModbasDate=Date.now();
                    DeviceManager.PackProgramInOneModbusPacket(nd)
                    prog.message = DeviceManager.GetNextProgramFromBigPack(nd);


                    if (prog.message === undefined)
                        console.log("FOR BREACKPOINT")
                    else
                    {
                        let pakkhex = Buffer.from(prog.message, "hex");
                        if (pakkhex.length > 14) {
                            console.log(pakkhex)
                        }
                        DeviceManager.tcpSockets[nd].write(pakkhex);
                    }


            }
            catch (e) {

            }
        },
        GetDeviceByIp(ip,port)//получить id устройства по ip и port
        {
          for(let dev in DeviceManager.devices)
          {
              if(DeviceManager.devices[dev].ip===ip && DeviceManager.devices[dev].port===port)
              {
                  return dev;
              }
          }
          return 0;
        },
        RegistryNewProgramOnStation(programs)
        {
            if(Object.hasOwn(programs,"_id"))
            {
                let program=programs;
                if(program["type"]==="ModbusTCP")
                {
                    let programPr=this.PrepareProgramForSendByModbusTCP(program);
                    this.programPackCicl[program.deviceId][program._id]=programPr;
                }

            }
            else
            {
                for (let p in programs)
                {
                    let program = programs[p];
                    if (program["type"] === "ModbusTCP")
                    {
                        let programPr=this.PrepareProgramForSendByModbusTCP(program);
                        this.programPackCicl[program.deviceId][program._id]=programPr;
                    }

                }
            }
            console.log("Programs added")
        },
        PrepareProgramForSendByModbusTCP(program)
        {
            const buf = Buffer.allocUnsafe(2);
            buf.writeUInt16BE(Number(this.programCounter), 0);
            program["tcpnum"]=buf.toString('hex');
            let str= program["message"];
            let numpak=program["tcpnum"];
            const regex = /^..../i;
            program["message"]=str.replace(regex, numpak);
            this.programCounter++;
            if( this.programCounter===65534) this.programCounter=100;
            return program;
        },
        PackProgramInOneModbusPacket(deviceId) //упаковка всех программ в один большой пакет
        {
            let prog={};
            let dec={};
            try
            {
                let addressDeviceInPacket="01"
                DeviceManager.devices[deviceId]["programPackBigPack"].numPackTCP++;
                if(DeviceManager.devices[deviceId]["programPackBigPack"].numPackTCP===254)DeviceManager.devices[deviceId]["programPackBigPack"].numPackTCP=1;
                DeviceManager.devices[deviceId].programPackBigPack["ppadres"]={};
                for(let i=0;i<Object.keys(DeviceManager.programPackCicl[deviceId]).length;i++) {
                    prog = DeviceManager.programPackCicl[deviceId][Object.keys(DeviceManager.programPackCicl[deviceId])[i]]
                    if(Number(prog.periodTime)<=Number(DeviceManager.modbusPacker.period) || DeviceManager.modbusPacker.period==="")
                        DeviceManager.modbusPacker.period=Number(prog.periodTime);
                    let message = prog.message;

                    let reg = /(....)(....)(....)(..)(..)(....)(.*)/;
                    let rg = message.match(reg);
                    let parsed =
                        {
                            ad: rg[4],
                            func: rg[5],
                            addresregistr: rg[6],
                            numberOfWords:rg[7]
                        }
                    addressDeviceInPacket=parsed.ad;
                    dec["func"]=converter.hexToDec(parsed.func)
                    dec["addresregistr"]=converter.hexToDec(parsed.addresregistr)
                    dec["numberOfWords"]=converter.hexToDec(parsed.numberOfWords)
                    if(prog.actual===true)
                    DeviceManager.devices[deviceId].programPackBigPack["ppadres"][prog._id]={"func":parsed.func,adres:dec["addresregistr"],"numberOfWords":dec["numberOfWords"]}
                    if(Number(DeviceManager.modbusPacker.maxaddress[parsed.func])<=Number(dec["addresregistr"])|| DeviceManager.modbusPacker.maxaddress[parsed.func]==="")
                    {
                        DeviceManager.modbusPacker.maxaddress[parsed.func]=Number(dec["addresregistr"]);
                        if(Number(dec["numberOfWords"])>1)DeviceManager.modbusPacker.maxaddress[parsed.func]=Number(dec["addresregistr"])+Number(dec["numberOfWords"]);
                    }
                    if(Number(DeviceManager.modbusPacker.minaddress[parsed.func])>=Number(dec["addresregistr"]) || DeviceManager.modbusPacker.minaddress[parsed.func]==="")
                        DeviceManager.modbusPacker.minaddress[parsed.func]=dec["addresregistr"];
                }//end for


                DeviceManager.devices[deviceId].programPackBigPack["pp"]={};
                DeviceManager.devices[deviceId].programPackBigPack["minAddress"]={};
                for(let func in DeviceManager.modbusPacker.minaddress)
                {
                    if (DeviceManager.modbusPacker.maxaddress[func] !== "")
                    {
                        startAddressDec=DeviceManager.modbusPacker.minaddress[func];
                        startAddressHex=Mathem.DecToHex(startAddressDec,4)
                        numberOfWords=Number(DeviceManager.modbusPacker.maxaddress[func])-startAddressDec+1
                        numberOfWordsHex=Mathem.DecToHex(numberOfWords,4)
                        numerofNumPackTcp=Mathem.DecToHex(DeviceManager.devices[deviceId]["programPackBigPack"].numPackTCP,2);

                        pack=func+numerofNumPackTcp+"00000006"+addressDeviceInPacket+func+startAddressHex+numberOfWordsHex
                        DeviceManager.devices[deviceId]["programPackBigPack"].pp[func]=pack;
                        DeviceManager.devices[deviceId].programPackBigPack["minAddress"][func]=DeviceManager.modbusPacker.minaddress[func]

                    }

                }
            }
            catch (e) {
                console.log(e)
            }

        },
        GetNextProgramFromBigPack(deviceId)
        {
            count=DeviceManager.devices[deviceId].programPackBigPack.counter;
            prog =DeviceManager.devices[deviceId].programPackBigPack.pp[Object.keys(DeviceManager.devices[deviceId].programPackBigPack.pp)[count]]
            if((Number(Object.keys(DeviceManager.devices[deviceId].programPackBigPack.pp).length)-1)===DeviceManager.devices[deviceId].programPackBigPack.counter)
                DeviceManager.devices[deviceId].programPackBigPack.counter=0;
            else
                DeviceManager.devices[deviceId].programPackBigPack.counter++;
            return prog;
        },
        GetProgramPackByModbusAnswer(pakTcpNum)
        {
            let result="";
            for(let prog in DeviceManager.programPackCicl)// ИЗНАЧАЛЬНО programPackCicl
            {
                let arr;
                arr=DeviceManager.programPackCicl[prog];
                for(let i in arr)
                {
                    if(arr[i].tcpnum===pakTcpNum)
                    {
                        result=arr[i];
                        break;
                    }
                }
            }
            return result;
        },
        PrepareProgramPackForSendToServer(deviceId,parsedData)//подготовка одинароного пакета для отправки на сервер
        {
            let parsed=parsedData;
            let nd=deviceId;
            let programPack = DeviceManager.GetProgramPackByModbusAnswer(parsed.tcpcount);
            if (programPack.variableType === undefined) {
                console.log("UNDEFINED ANSWER PACK")
                ar = DeviceManager.programPackCicl["6438cc378dae6b90621005fd"].toArray();
                for (a in ar) {
                    console.log(ar[a])
                }
                console.log("K")
            } else {
                let archiveRecord = "false";
                let type = "programCycl";
                let datasend = {};
                buferrors = [];
                bufCurentErrors = [];
                iserrorschanged = 0;

                if (Object.hasOwn(programPack, "lastArchive"))
                {
                    if (Date.now() - programPack.lastArchive > Number(programPack.periodArchive))
                    {
                        programPack.lastArchive = Date.now();
                        archiveRecord = "true";
                    }
                }
                else
                {
                    programPack.lastArchive = Date.now();
                    archiveRecord = "true";
                }
                parsed["dec"] = DeviceManager.ModbusHexToDec(parsed.hex, programPack.variableType);
                parsed["bit"] = Mathem.dectobin(parsed["dec"], Mathem.TypeToNumber(programPack.variableType));
                if (programPack.units === "errorDevice") {
                    if (parsed["dec"] !== programPack.lastAnswerDec) {
                        err = DeviceManager.devices[nd].errors
                        type = "errorDevice"
                        for (bt in parsed["bit"]) {
                            if (parsed["bit"][bt] === 1 && err[bt] != null && err[bt] !== undefined) {
                                p = {}
                                p = err[bt];
                                dontrecord = 0;
                                for (er in DeviceManager.devices[nd]["deviceCurrentErrors"][programPack._id]) {
                                    cbit = Number(bt);
                                    divcbit = Number(DeviceManager.devices[nd]["deviceCurrentErrors"][programPack._id][er].bit)
                                    if (cbit === divcbit)
                                        dontrecord = 1;
                                }
                                if (dontrecord === 0)
                                    p["date"] = Date.now()
                                if (err[bt] !== undefined || err[bt] != null)
                                    bufCurentErrors.push(p)
                            }
                            if (programPack.lastAnswerBit[bt] !== parsed["bit"][bt] && err[bt] !== undefined) {
                                iserrorschanged = 1;
                                err[bt]["status"] = parsed["bit"][bt]
                                buferrors.push(err[bt])
                            }
                        }
                        console.log(buferrors)
                    }
                    if (iserrorschanged === 1)
                    {
                        p = {[programPack._id]: bufCurentErrors}
                        DeviceManager.devices[nd]["deviceCurrentErrors"] = p
                    }
                    programPack.lastAnswerDec = parsed["dec"]
                    programPack.lastAnswerBit = parsed["bit"]

                }
                datasend =
                    {
                        "type": type,
                        "programPackId": programPack._id,
                        "p": ds,
                        "t": Date.now(),
                        "d": parsed.dec,
                        "b": parsed.bit,
                        "archiveRecord": archiveRecord
                    };

                if (buferrors.length > 0) datasend["buferrors"] = buferrors;

                DeviceManager.devices[nd].receiver.push(datasend);
                DeviceManager.emitter.emit("readyToSend", nd);
               }


        },
        PrepareProgramPacksFromBigPackToSendToServer(deviceId,parsedData)//подготовка большого пакета для отправки на сервер
        {
            data=parsedData;
            dataHex=data.hex.match(/(....)/g)
            let dec="";

            let type;
            let archiveRecord = "false";
            nd=deviceId;
            bigpack=DeviceManager.devices[nd].programPackBigPack
            programPack=DeviceManager.programPackCicl[nd]
            count=converter.hexToDec(data.countbyte)
            count=count/2
            dataForSend={};
            startAddress=bigpack.minAddress[data.func];
            let buferrors = [];
            let bufCurentErrors = [];
            let iserrorschanged = 0;
            /*let parsed={
                    tcpcount:rg[1],
                    length:rg[3],
                    adress:rg[4],
                    func:rg[5],
                    countbyte:rg[6],
                    hex:rg[7],*/
            let numByteData=0;
            for(num=startAddress;num<=count;num++)
            {
                for(idpp in bigpack["ppadres"])
                {

                    if(bigpack["ppadres"][idpp].func===data.func && bigpack["ppadres"][idpp].adres===num)
                    {
                        dec = ""
                        type="programCycl"
                        for (i = 0; i < Number(bigpack["ppadres"][idpp].numberOfWords); i++)
                        {
                            dec = dec + dataHex[Number(numByteData) + Number(i)]
                        }
                        parsed={"dec":dec,"bit":[]}
                        programPack=DeviceManager.programPackCicl[nd][idpp]
                        dec=DeviceManager.ModbusHexToDec(dec, programPack.variableType);

                        //ERROR BIT HANDLER
                        parsed["dec"]=dec
                        parsed["bit"] = Mathem.dectobin(dec, Mathem.TypeToNumber(programPack.variableType));
                        sendbit=parsed["bit"]
                        dataForSend[idpp] = {lastAnswerDec: dec,lastAnswerBit:sendbit,type:type};
                        if (programPack.units === "errorDevice")
                        {
                            if (parsed["dec"] !== programPack.lastAnswerDec)
                            {
                                err = DeviceManager.devices[nd].errors

                                type = "errorDevice"
                                for (bt in parsed["bit"]) {
                                    if (parsed["bit"][bt] === 1 && err[bt] != null && err[bt] !== undefined)
                                    {
                                        p = {};
                                        p = err[bt];
                                        dontrecord = 0;
                                        for (er in DeviceManager.devices[nd]["deviceCurrentErrors"][programPack._id]) {
                                            cbit = Number(bt);
                                            divcbit = Number(DeviceManager.devices[nd]["deviceCurrentErrors"][programPack._id][er].bit)
                                            if (cbit === divcbit)
                                                dontrecord = 1;
                                        }
                                        if (dontrecord === 0)
                                            p["date"] = Date.now()
                                        if (err[bt] !== undefined || err[bt] != null)
                                            bufCurentErrors.push(p)
                                    }
                                    if (programPack.lastAnswerBit[bt] !== parsed["bit"][bt] && err[bt] !== undefined) {
                                        iserrorschanged = 1;
                                        err[bt]["status"] = parsed["bit"][bt]
                                        buferrors.push(err[bt])

                                    }

                                }
                                console.log(buferrors)
                            }
                            if (iserrorschanged === 1) {
                                p = {[programPack._id]: bufCurentErrors}
                                DeviceManager.devices[nd]["deviceCurrentErrors"] = p
                            }

                            programPack.lastAnswerDec = parsed["dec"]
                            programPack.lastAnswerBit = parsed["bit"]

                        }
                        //ARCHIVE HANDLER
                        dataForSend[idpp]["archive"]=false;
                        if (DeviceManager.archiveDataProgramPack[nd][idpp] === undefined)
                        {
                            DeviceManager.archiveDataProgramPack[nd][idpp] = Date.now();
                            dataForSend[idpp]["archive"]=true;
                        }
                        if (Date.now() - Number(DeviceManager.archiveDataProgramPack[nd][idpp]) > Number(DeviceManager.programPackCicl[nd][idpp].periodArchive))
                        {
                            DeviceManager.archiveDataProgramPack[nd][idpp] = Date.now();
                            dataForSend[idpp]["archive"]=true;
                        }

                    }
                }
                numByteData++;
            }
            dataForSendEnd={};
            dataForSendEnd["pp"]=dataForSend
            dataForSendEnd["date"]=Date.now();
            dataForSendEnd["archive"]=archiveRecord;
            dataForSendEnd["type"]="bigPack";

            if (buferrors.length > 0)
            {
                dataForSendEnd["buferrors"] = buferrors;
                dataForSendEnd["deviceId"] = nd;
                dataForSendEnd["deviceCurrentErrors"]=DeviceManager.devices[nd].deviceCurrentErrors
            }
            DeviceManager.devices[nd].receiver.push(dataForSendEnd);
            DeviceManager.emitter.emit("readyToSend", nd);

        },
        addOncePacket(deviceId,packet)
        {
            console.log( "addOncePacket");
           //console.log(DeviceManager.tcpSockets[deviceId].closed);
            let con=new net.Socket();
            con.setTimeout(500);
            con.connect(DeviceManager.devices[deviceId].port,DeviceManager.devices[deviceId].ip,()=>
            {

                    const pakkhex = Buffer.from(packet, "hex");
                    DeviceManager.tcpSockets[deviceId].write(pakkhex);

            });
            con.end();
            delete con;
        },
        ReadyToSend(_id)//обработка подписанных функций
        {
            let ar=DeviceManager.listers.toArray();
            for(let f in ar)
            {
                if(ar[f].event==="readyToSend")
               ar[f].func(_id);
            }

        },
        ErrorDevice(_id,error)
        {
            let ar=DeviceManager.listers.toArray();
            for(let f in ar)
            {
                if(ar[f].event==="errorDevice")
                    ar[f].func(_id,error);
            }
        },
        AddFuncListener(func,event)//добавить функции подписанные на событие
        {
            DeviceManager.listers.push({func:func,event:event});
        },
        getIdDevices()//получить все устройства
        {
            let count=0;
            let result={};
            for( let device in this.devices)
            {
                result[count]=this.devices[device]._id;
                count++;
            }
            return result;
        },
        ParseModbusTCP(pak)
        {
            let reg=/(....)(....)(....)(..)(..)(..)(.*)/;
            let rg=pak.match(reg);
            return {
                tcpcount: rg[1],
                length: rg[3],
                adress: rg[4],
                func: rg[5],
                countbyte: rg[6],
                hex: rg[7],
            };
        },
        ModbusAnswerHasAnError(parsed)
        {
            if(Number(parsed.func)>16)return true
            else return false
        },
        ModbusHexToDec(hex,type)
        {
            try
            {
                let packhex=hex.match(/(....)/g);
                let r="";
                let dec=0;
                for(let i=Number(packhex.length);i>0;i--)
                {
                    r=r+packhex[i-1];
                }
                dec=converter.hexToDec(r)
                if(type==="Float32")
                {
                    dec=Mathem.hexxtofloatt(r).BE
                }
                if(type.includes("16"))
                {
                    if(dec>65535)dec=65535
                }
                if(type.includes("32"))
                {
                    if(dec> 4294967295)dec=4294967295
                }
                return dec;
            }
            catch (e)
            {

                while(DeviceManager.programPackCicl.length>0)
                {
                    d=DeviceManager.programPackCicl.shift();
                    console.log(d)
                    console.log(DeviceManager.programPackCicl[d])
                }
                console.log(e)
            }
            return 0;
        },

        ChangeProgramActualState(deviceId,programId,actual)//изменить активность опроса тэга
        {
            result="ok";
            if(DeviceManager.programPackCicl[deviceId][programId]!==undefined)
            {
                DeviceManager.programPackCicl[deviceId][programId]=actual;
                if(actual===true)
                {
                    result = "PROGRAM NOT IN LIST";
                }
            }
            else
                result = "PROGRAM NOT IN LIST";
            return result;
        },
        IsProgramInDeviceManager(deviceId, programId)//
        {
            let result="ok";
            if(DeviceManager.programPackCicl[deviceId][programId]!==undefined)
            {
                //DeviceManager.programPackCicl[deviceId][programId]=actual;
                /*if(actual===true)
                {
                    result = "PROGRAM NOT IN LIST";
                }*/
            }
            else
                result = "PROGRAM NOT IN LIST";
            return result;
        },


    }
module.exports.DeviceManager=DeviceManager;