const fs=require("fs/promises");
const Emitter = require("events");
const {DeviceManager} = require("./DeviceManager");

//Логгер Мэнеджер идентичный серврерному
const LoggerManager=
{
    Name:"",
    timeUpdate:"",
    emitter:"",
    path:"",
    data: {},
    timeClear:"",
    Construct(timeUpdate,name,path,timeClear)
    {
        this.Name=name;
        this.path=path;
        this.emitter=new Emitter();
        this.timeClear=timeClear;

        this.emitter.on("loggerUpdateExe",this.RecordData);
        setInterval(this.UpdateData,timeUpdate);
    },
    UpdateData()
    {
        LoggerManager.ClearHandler();
        LoggerManager.emitter.emit("loggerUpdateExe");
    },
    async RecordData()
    {
      //  console.log("PATH");
    //    console.log(LoggerManager.path)
        let date=new Date(Date.now());
        let datepath=String(("0" + (date.getMonth() + 1)).slice(-2))+String(date.getFullYear());
        let dateday=String(("0" + (date.getDate() )).slice(-2));
        let data=date.getHours()+":"+date.getMinutes()+":"+date.getSeconds()+JSON.stringify(LoggerManager.data)+";\r\n";
        await fs.access(LoggerManager.path+'/logs/'  + datepath +'/'+ dateday+'.log',fs.constants.F_OK).catch(async ()=>{
            await LoggerManager.CreateFolders();
            await LoggerManager.AddDataToFirstFile();
        })

       fs.appendFile(LoggerManager.path+'/logs/'  + datepath +'/'+ dateday+'.log', data).then()
            .catch(async()=>
            {
                 console.log("FOR DEBUG in catch data LoggerManager")
               console.log(data)

               fs.writeFile(LoggerManager.path+'/logs/' +  datepath +'/'+ dateday+'.log', data).then()



            })
    },
    add(data,tagName)
    {
        LoggerManager.data[tagName]=data;
    },
    ClearHandler()
    {
        resregex=LoggerManager.timeClear.match(/(\d*)(\S*)/g);
        numbertime=resregex[0];
        texttime=resregex[2];
        let period=1000*60*60*24*1;
        switch (texttime) {
            case "Month":
                period= 1000*60*60*24*30*Number(numbertime);
            break;
            case "Day":
                period= 1000*60*60*24*Number(numbertime);
            break;
        }
        let compareDate=Date.now()-period;
        fs.readFile(LoggerManager.path+'/logs/data.log','utf8').then((dataFile)=>{
            let allLines=dataFile.split('\r\n');
            let line = allLines[0];
            linejson=JSON.parse(line)
            if(linejson.timestamp<=compareDate)
            {
                resultStringForRecord=dataFile.substring(line.length+2);
                fs.rm(LoggerManager.path+'/logs/' +  linejson.datepath +'/'+ linejson.dateday+'.log').then();
                fs.writeFile(LoggerManager.path+'/logs/data.log',resultStringForRecord).then();
            }
            //console.log(line)
        }).catch((e)=>{console.log(e)})
    },
    async CreateFolders()
    {
        let date=new Date(Date.now());
        let datepath=String(("0" + (date.getMonth() + 1)).slice(-2))+String(date.getFullYear());
        let dateday=String(("0" + (date.getDate() )).slice(-2));
        await fs.mkdir(LoggerManager.path+'/logs/' +   datepath,{ recursive: true } );


    },
    async AddDataToFirstFile()
    {
        let date=new Date(Date.now());
        let datepath=String(("0" + (date.getMonth() + 1)).slice(-2))+String(date.getFullYear());
        let dateday=String(("0" + (date.getDate() )).slice(-2));
        datarecord={"datepath":datepath,"dateday":dateday,"timestamp":Date.now()}
        await fs.appendFile(LoggerManager.path+'/logs/data.log',JSON.stringify(datarecord)+"\r\n").catch(()=>{
            fs.writeFile(LoggerManager.path+'/logs/data.log',JSON.stringify(datarecord)+"\r\n").then();
        });
    }

}
module.exports.LoggerManager=LoggerManager;