//let List = require("collections/list");
//const {decToHex} = require("hex2dec");
/*
const ProgramManager=
{
    programCounter:1,
    programs:new List(),
    RunCyclProgram(),
    AddProgramToCyclDevice()
    {

    },
    AddProgram(program)
    {
        if(program["type"]=="ModbusTCP")
        {
            const buf = Buffer.allocUnsafe(2);
            buf.writeUInt16BE(Number(ProgramManager.programCounter), 0);
            program["tcpnum"]=buf.toString('hex');
            const regex = /^..../i;
            program["str"].replace(regex, program["tcpnum"]);
            ProgramManager.programCounter++;
            if(ProgramManager.programCounter==65534)ProgramManager.programCounter=0;

        }
        this.programs.push(program);
    },
    GetNextProgram(deviceId)
    {
        let prog=this.programs.shift();
        prog
        return this.programs.shift();
    }
}
*/