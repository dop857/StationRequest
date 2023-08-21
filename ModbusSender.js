
const net = require('net');
class ModbusSender extends net.Socket
{
    ip;
    port;
    mtcpclient;

    constructor(ip,port,reciver)
    {
        super();
        this.ip=ip;
        this.port=port;
        this.mtcpclient=new net.Socket();
        this.mtcpclient.on("error",(err)=>{console.log("ERROR:"+err);});
        this.mtcpclient.on("data",(data)=>
        {
            console.log("reciver");
            console.log(this.mtcpclient.bytesRead);
            console.log("DATA:"+data.toString('hex'));
            reciver=data.toString('hex');
        });

    }

    sendModbus(MessageHex)
    {
        const pakkhex=Buffer.from(MessageHex, "hex");
        this.mtcpclient.connect(this.port,this.ip,
        function()
        {
            console.log('Connected');
            this.mtcpclient.write(pakkhex);

        });
    }

}

module.exports=ModbusSender;



//console.log(paket.toString(parseInt(paket,16)));

