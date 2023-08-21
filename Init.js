import fs from "fs/promises";
import {ServerManager} from "./ServerManager";
import {DeviceManager} from "./DeviceManager";

let Init={
    configFilePath:'./config.json',
    InitStation()
    {
        fs.readFile(this.configFilePath, { encoding: 'utf8' }).then((contents)=>
        {
            let config = JSON.parse(contents);
            let needRewriteConfigId=0;
            if(config._id=="")
            {
                let data=config;
                fetch("http://"+config.server+":"+config.port+config.entryPoint+'/station/regNew',
                    {method: "POST",headers:{'Accept': 'application/json, text/plain, */*','Content-Type': 'application/json'},
                        body: JSON.stringify(data)}).
                then((res)=>
                {
                    res.text().then((r)=>{
                        r=JSON.parse(r);
                        console.log(r["_id"]);
                        config._id=r["_id"];

                        fs.writeFile(this.configFilePath,JSON.stringify(config)).then(()=>{
                            ServerManager.Construct(config.server,config.port,config._id,ParsingDataFromServer);
                            DeviceManager.AddFuncListner(ListnerReadyFromModbus);
                            setInterval(()=>{StationIsActive();},config.interval);
                        })


                    }).catch((err)=>
                    {
                        console.error(err.message);
                    });
                });
            }
            else
            {
                ServerManager.Construct(config.server,config.port,config._id,ParsingDataFromServer);
                DeviceManager.AddFuncListner(ListnerReadyFromModbus);
                setInterval(()=>{StationIsActive();},config.interval);

            }



        });
    }

}
