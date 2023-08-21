const {ServerManager} = require("./ServerManager");
const {DeviceManager} = require("./DeviceManager");
const {decToHex} = require("hex2dec");
//Файл Парсинга ответов от сервера по сути эта функция модуля ServerManager для удобства вынесена в отдельный файл
function ParsingAnswers(ServerManager)
{
    let ListAnswers=ServerManager.answers;
    while(ListAnswers.length>0)
    {
        let answer=ListAnswers.shift();
        console.log("SERVER ANSWERanswer:")
        console.log(answer)
        try
        {
            let ans=JSON.parse(answer);
            //console.log(answer)
            if(Object.hasOwn(ans,"comand"))//если пришла команда от сервера для выполнения на станции опроса
            {
                for(let com in ans.comand)
                {
                    let comandjs=JSON.parse(ans.comand[com].comand);

                    switch (Object.keys(comandjs).at(0))
                    {
                        case "addDevice"://добавить устройство в станцию опроса
                            console.log("IN addDevice");
                            ServerManager.SendData("/receiver/device", JSON.stringify(comandjs.addDevice), "POST");
                            break;

                        case "verification"://верификация станции опроса
                            console.log("IN verification");
                            console.log(DeviceManager.getIdDevices());
                            //console.log(DeviceManager.getIdDevices());
                            ServerManager.SendData("/receiver/device/verification", JSON.stringify({idDevices: DeviceManager.getIdDevices()}), "POST");

                            break;
                        case "addProgram"://тобавить тэг для опроса
                            console.log("IN addProgram");
                            //console.log(DeviceManager.getIdDevices());
                            //ДОПИСАТЬ проверку для возможной ситуации создания команды во время неактивности станции при аварийной ситуации
                            if (Object.keys(comandjs.addProgram).length > 0)
                                ServerManager.SendData("/receiver/getProgram", JSON.stringify({_id: comandjs.addProgram}), "POST");

                            break;
                        case "addOnceProgramPacket"://добавить разовый тэг для исполнения на устройстве
                            console.log("addOnceProgramPacket");
                            let idDM = DeviceManager.getIdDevices();
                            for (let i in idDM) {
                                if (idDM[i] == comandjs.addOnceProgramPacket.deviceId) {
                                    let id = comandjs.addOnceProgramPacket.deviceId;
                                    console.log(id);
                                    console.log(comandjs.addOnceProgramPacket.packet);
                                    let program = {message: comandjs.addOnceProgramPacket.packet};
                                    DeviceManager.addOncePacket(id,comandjs.addOnceProgramPacket.packet);
                                }
                            }


                            break;
                        case "changeActualProgram"://выполнить запрос обновление тэга

                            if (DeviceManager.ChangeProgramActualState(comandjs.changeActualProgram.deviceId, comandjs.changeActualProgram.programPackId, comandjs.changeActualProgram.actual) == "PROGRAM NOT IN LIST")
                            {
                                ServerManager.SendData("/receiver/getProgram", JSON.stringify({_id: comandjs.changeActualProgram.programPackId}), "POST");
                            }
                        break;
                        case "updateProgram"://обновить тэг
                            console.log("updateProgram");
                            console.log(ans)
                            if(DeviceManager.IsProgramInDeviceManager(comandjs.updateProgram.deviceId, comandjs.updateProgram.programPackId))
                            {
                                ServerManager.SendData("/receiver/getProgram", JSON.stringify({_id: comandjs.updateProgram.programPackId}), "POST");

                            }
                        break;

                    }

                }
            }
            if(Object.hasOwn(ans,"device"))//добавление нового устройства
            {
                console.log("DEVICE DETECTED FO ADD");
                console.log(ans);
                DeviceManager.addDevice(ans.device[0],ans.program);
                console.log(DeviceManager.devices);
            }
            if(Object.hasOwn(ans,"programPack"))//добавление тэга
            {
                console.log("Program detected FOR ADD");
                //DeviceManager.AddProgram(ans.programPack);
                DeviceManager.RegistryNewProgramOnStation(ans.programPack);
               // DeviceManager.AddProgramInListDeviceRequest(ans.programPack.deviceId,ans.programPack);

               //
                 console.log(ans.programPack);
            }
        }
        catch (e)
        {
            console.log(e);
        }


    }



}

module.exports.ParsingAnswers=ParsingAnswers;