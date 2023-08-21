const net = require('net');
const {hexToDec} = require("hex2dec");
const {Mathem} = require("./Mathem");
DeviceManager= {
    tcpSockets:{},
    savesend:{},
    tend:{},
    ff:[],
    init() {

        nd=1;


            this.tend=nd;
            this.tcpSockets[nd] = new net.Socket();
            this.tcpSockets[nd].setTimeout(50000);//вочдог таймаут ыл 10000
            this.tcpSockets[nd].on('timeout', () => {
                console.log("timeout");
                let pakkhex = Buffer.from("009100000006010400010001", "hex");
                debugr = this.tcpSockets[nd].write(pakkhex);
                /*this.tcpSockets[nd].end();*/
                /*   this.savesend=5;
                   setTimeout(() => {
                       this.savesend=5;
                       this.tcpSockets[nd].destroy();

                   }, 1000);
               });
               this.tcpSockets[nd].on('close', () => {
                   console.log("IN CLOSE SOCKET");/*this.tcpSockets[nd].end();*/

                /*
                                setTimeout(() => {
                                        console.log("IN CLOSE SOCKET SET TIMEOUT");
                                        console.log(this.savesend);
                                    if(this.savesend>3)
                                    {
                                        this.savesend=6

                                        this.tcpSockets[nd].destroy();
                                        this.tcpSockets[nd].connect("505", "10.4.1.11");
                                        let pakkhex = Buffer.from("009100000006010400010001", "hex");
                                        debugr=this.tcpSockets[nd].write(pakkhex);
                                        this.savesend=1;
                                    }


                                },
                                    3000);
                */


            });
            this.tcpSockets[nd].on('ready',function ()  {
                console.log("IN READY SOCKET"+this.tend);
                console.log("IN READY SOCKET EVENT TERGET");
                //console.log(this)
                //EventTarget.dispatchEvent()
                //console.log(EventTarget.);
                let pakkhex = Buffer.from("009100000006010400010001", "hex");
                debugr = this.write(pakkhex);
                /*
                            console.log("IN READY SOCKET");
                            console.log(this.savesend);
                            setInterval(() =>
                            {
                                console.log(this.savesend);
                                if(this.savesend<1)
                                {
                                    let pakkhex = Buffer.from("009100000006010400010001", "hex");
                                    debugr=this.tcpSockets[nd].write(pakkhex);
                                    this.savesend=1;
                                    console.log(this.savesend)
                                }
                                else
                                {
                                   if(this.savesend==1)
                                   {
                                       this.savesend=2
                                       setTimeout(()=>{
                                           if(this.savesend==2)
                                           {
                                               this.savesend=3
                                               this.tcpSockets[nd].destroy();
                                               this.tcpSockets[nd].connect("505", "10.4.1.11");

                                               //this.savesend=0
                                           }

                                       },10000)
                                   }
                                    if(this.savesend==3)
                                    {
                                        this.savesend=4
                                        setTimeout(()=>{
                                            if(this.savesend==4)
                                            {
                                                this.savesend=5
                                                this.tcpSockets[nd].destroy();
                                                this.tcpSockets[nd].connect("505", "10.4.1.11");

                                                this.savesend=2
                                            }
                                        },5000)
                                    }
                                    if(this.savesend==5)
                                    {
                                        this.savesend=6
                                        setTimeout(()=>{
                                            if(this.savesend==6)
                                            {
                                                this.savesend=7
                                                this.tcpSockets[nd].destroy();
                                                this.tcpSockets[nd].connect("505", "10.4.1.11");

                                                this.savesend=0
                                            }
                                        },5000)
                                    }


                                }

                            }, 200);

                        });
                        this.tcpSockets[nd].on('error', (e) => {
                            console.log("error TCP " + nd);/*this.tcpSockets[nd].end();*/
                /*  console.log(e);
                  this.errors = e;*/
            });
            this.tcpSockets[nd].on("data", (data) => {
                // console.log("indata dev:"+nd);
                console.log("IN RECIVE DATA")
                let ds = Buffer.from(data, 'hex').toString("hex");
                let dec;
                if (data.length > 1)
                    this.savesend = 0;
                console.log(data);
                console.log(ds);


            });
            this.tcpSockets[nd].connect("505", "10.4.1.11");
            //let pakkhex = Buffer.from("009100000006010400010001", "hex");
           // debugr = this.tcpSockets[nd].write(pakkhex);
            //console.log(debugr)
            setInterval(()=>{console.log(this.tcpSockets[nd].readyState);console.log(this.tcpSockets[nd].bytesWritten);console.log(this.tcpSockets[nd].bufferSize)},50)

    }
}
DeviceManager.savesend=0;
DeviceManager.init();
/*
function ff(par)
{
    console.log(par)
}



/*

//let List = require("collections/list");
t1={
    "_id":  "1"
    ,
    "deviceId": "6405b649b535d8a2a4cf77b6",
    "nameData": "temperature",
    "type": "ModbusTCP",
    "units": "dC",
    "lastAnswerDec": "60664",
    "periodArchive": "10000",
    "periodTime": "2000",
    "dateLastAnswer": 1682567007173,
    "variableType": "Uint16",
    "message": "008800000006010300000001",
    "actual": true,
    "stationId": "6417e51d946361502a330103"
}
t2={
    "_id":  "2"
    ,
    "deviceId": "6405b649b535d8a2a4cf77b6",
    "nameData": "temperature",
    "type": "ModbusTCP",
    "units": "dC",
    "lastAnswerDec": "60664",
    "periodArchive": "10000",
    "periodTime": "2000",
    "dateLastAnswer": 1682567007173,
    "variableType": "Uint16",
    "message": "008800000006010300000001",
    "actual": false,
    "stationId": "6417e51d946361502a330103"
}
l=new List();
l.push(t1);
l.push(t2);

/*len=l.length;
while(len>0)
{
    el=l.shift()
    if(el.actual==true)l.push(el)
    len--;
}*/
/*
function dectobin(dec,num)
{

    const numberToConvert = Number(dec);
    const numberOfBits = num; // 32-bits binary
    const arrBitwise = [0]; // save the resulting bitwise

    for (let i=0; i<numberOfBits; i++) {
        let mask = 1;

        const bit = numberToConvert & (mask << i); // And bitwise with left shift

        if(bit === 0) {
            arrBitwise[i] = 0;
        } else {
            arrBitwise[i] = 1;
        }
    }
    console.log(arrBitwise)
    return arrBitwise;
}
dectobin("35",16)
let a=35;
console.log(a.toString(2).split(''))
    //console.log(l.);



*/

/*const xxHash3 =require('xxhash-addon').XXHash3;
const salute = 'socket= new net.Socket();\n' +
    'socket.on("error",()=>console.log("error"));\n' +
    'socket.on("close",()=>console.log("close"));\n' +
    'socket.on("data",()=>console.log("data"));\n' +
    'socket.on("ready",()=>console.log("ready"));\n' +
    'socket.on("connect",()=>console.log("connect"));\n' +
    'socket.connect(23,"127.0.0.1",()=>';
const buf_salute = Buffer.from(salute);

console.log(xxHash3.hash(buf_salute).toString('hex'));
//console.log()

*/

//data={"dfdsf":"d"};
//fetch('http://127.0.0.1:80/receiver/station/regNew',{method: 'POST',headers:{'Accept': 'application/json, text/plain, */*','Content-Type': 'application/json'},body: JSON.stringify(data)
//}).then((res)=>{
//    console.log(res);
//});



/*
let str= "008800000005010302c27a";
let numpak="0001";
const regex = /^..../i;
str.replace(regex, numpak);
console.log(str.replace(regex, numpak));*/
/*
const buf = Buffer.allocUnsafe(2);

buf.writeUInt16BE(Number(255), 0);

//console.log(Number(256).toString(16,));
console.log(buf.toString('hex'));
*/
/*const net = require('net');
socket= new net.Socket();
socket.on("error",()=>console.log("error"));
socket.on("close",()=>console.log("close"));
socket.on("data",()=>console.log("data"));
socket.on("ready",()=>console.log("ready"));
socket.on("connect",()=>console.log("connect"));
socket.connect(23,"127.0.0.1",()=>
{
    console.log("connect start");

});*/

//console.log(obj.addDevice);


/*let List = require("collections/list");
let list = new List();
let data={};
for(let i=0;i<10;i++)
{
    list.add("l"+i);
}
*/
/*
console.log(list.toJSON());
for(let i=0;i<5;i++)
{

    console.log(list.shift());
}
console.log(list.toArray());

/*
fetch("http://127.0.0.1:80/receiver/test",{method: "POST",headers:{'Accept': 'application/json, text/plain, *','Content-Type': 'application/json'},body: data
}).then((res)=>
{
    console.log(res);
    /*res.json().then((resp)=>{
        for(let dev in resp)
        {
            console.log(resp[dev]);
        }
}})
    //console.log(res.body);
.catch(function (error)
{
    console.log("errrr");
    // ... ошибки.
});*/