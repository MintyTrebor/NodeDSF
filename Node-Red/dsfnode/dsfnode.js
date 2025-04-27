const { SSL_OP_EPHEMERAL_RSA } = require('constants');

/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
module.exports = function(RED) {
    function dsfConnectorNode(config) {
        RED.nodes.createNode(this,config);
        this.server = config.server;
        this.btype = config.btype;
        this.bPollRate = config.bPollRate;
        this.plainPass = config.plainPass;
    };
    RED.nodes.registerType("dsf-connector",dsfConnectorNode);

    function dsfInterceptNode(config) {
        RED.nodes.createNode(this,config);
        this.server = config.server;
        this.command = config.command;
        this.identifier = config.identifier;
        this.msgBoxTitlePath = "state.messageBox.title";
        this.msgBoxMsgPath = "state.messageBox.message";
        var node = this;
        const jp2 = require('jsonpath');
    
        var processMessage = function(msg) {
            var cmdId = null;
            var cmdCode = null;
            
            try{
                if (typeof msg.payload.cmdIdentifier !== "undefined"){
                    cmdId = msg.payload.cmdIdentifier;
                } else {
                    cmdId = node.identifier;
                }

                if (typeof msg.payload.cmdCode !== "undefined"){
                    cmdCode = msg.payload.cmdCode;
                } else {
                    cmdCode = node.command;
                }

                var patchJSON = msg.payload.patchModel;
                if(patchJSON){
                    var matchInPatch = jp2.query(patchJSON, (`$.${node.msgBoxTitlePath}`));
                    if(JSON.stringify(matchInPatch) != "[]"){
                        var matchVal = matchInPatch[0];
                        if (matchVal == cmdId){
                            //this is a command msg 
                            var cmdInPatch = jp2.query(patchJSON, (`$.${node.msgBoxMsgPath}`));
                            if(JSON.stringify(cmdInPatch) != "[]"){
                                var cmdVal = cmdInPatch[0];
                                if (cmdVal == cmdCode){
                                    if (typeof msg.dsf !== "undefined"){
                                        msg.dsf.cmdCode = cmdVal;
                                    }else {
                                        msg.dsf = {cmdCode: cmdVal};
                                    }
                                    node.send(msg); 
                                };
                            };
                        };
                    };
                };
            } catch {
                //do nothing - here in case a non compliant msg is received
            }
        };

        node.on('input', function(msg) {
            processMessage(msg);
        });

    };
    RED.nodes.registerType("dsf-intercept",dsfInterceptNode);

    
    function dsfEventNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.interval = n.interval;
        this.delta = n.delta;
        this.modelPath = n.modelPath;
        this.lastMsgTime = 0;
        this.lastValue = 0;
        var node = this;
        var sndDelta = false;
        var sndInt = false;
        var currDiff = null;

        const jp = require('jsonpath');
        const diff = (a, b) => {
            return Math.abs(a - b);
        };
        
        var processMessage = function(msg) {
            try{
                var patchJSON = msg.payload.patchModel;
                if(patchJSON){
                    //console.log(patchJSON);
                    var matchInPatch = jp.query(patchJSON, (`$.${node.modelPath}`));
                    //console.log(matchInPatch);
                    if(JSON.stringify(matchInPatch) != "[]"){
                        var matchVal = matchInPatch[0];
                        //we have a match so check if other conditions are met.
                        //check if interval condition is met
                        if(Number(node.interval) > 0 && node.lastMsgTime > 0){
                            var currTime = Date.now();
                            var millInt = (Number(node.interval) * 1000);
                            var millTarget = (node.lastMsgTime + millInt);
                            if (currTime >= millTarget){
                                sndInt = true;
                            }
                        } else {
                            sndInt = true;
                        };
                        //check if delta condition is met
                        if(Number(node.delta) > 0 && !(isNaN(Number(matchVal)))) {
                            currDiff = diff(Number(matchVal), Number(node.lastValue));
                            if (currDiff >= Number(node.delta)){
                                sndDelta = true;
                            };
                        } else {
                            sndDelta = true;
                        };
                        if (sndDelta && sndInt){
                            if (typeof msg.dsf !== "undefined"){
                                msg.dsf.eventValue = matchVal;
                                msg.dsf.lastEventValue = node.lastValue;
                            } else {
                                msg.dsf = {
                                    eventValue: matchVal,
                                    lastEventValue: node.lastValue
                                };
                            }
                            node.send(msg);
                            node.lastValue = matchVal;
                            node.lastMsgTime = Date.now();
                        };    
                        sndDelta = false;
                        sndInt = false;
                        currDiff = null;
                    };
                };
            } catch{
                //do nothing - here in case a non compliant msg is received
            }
        };
        
        node.on('input', function(msg) {
            processMessage(msg);
        });

    };
    RED.nodes.registerType("dsf-event", dsfEventNode);

    function dsfMonitorNode(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.server = RED.nodes.getNode(config.server);
        this.password = this.server.plainPass;
        this.wsurl = (`ws://${this.server.server}/machine`);
        this.duetUrl = (`http://${this.server.server}`);
        this.duetLogoff = (`http://${this.server.server}/rr_disconnect`);
        this.autoStart = config.autoStart;
        this.ws = require('ws');
        this.dsfFirstMsg = true;
        this.dsfFullModel = null;
        if(!this.password || this.password === "") {this.password = "reprap"};
        this.duetLogin = (`/rr_connect?password=${this.password}&time=`); //login info
        this.duetEMReq = "/rr_model"; //empty model
        this.duetFNReq = "/rr_model?flags=d99fn"; //quick info update
        //this.duetBIReq = "/rr_config"; //board & firmware info *** depreciated in fw 3.5+ ****
        this.duetBIReq = "/rr_model?key=boards[0]"; //board & firmware info
        this.duetGVReq = "/rr_model?key=global&flags=d99vn"; //global variables
        this.duetMsgReq = "/rr_reply"; //Check For Display Msgs (only needed in Duet Mode
        this.duetStateReq = "/rr_model?key=state&flags=d99vn"; //Check For Display Msgs (only needed in Duet Mode
        this.duetFileInfoReq = "/rr_model?key=job&flags=d99vn"; //get info on current print job file
        this.duetEmptyModel = "";
        this.lastDispMsg = "";
        this.nodeRun = true;
        this.pollRate = this.server.bPollRate;
        this.duetModeErr = false;
        this.dsfModeErr = false;
        this.restarting = false;
        this.tmout = false;
        var node = this;
        var msg = null;
        var mergedModel = null;
        var parsedData = null;
        var emptyModel = null;
        var patchModel = null;
        var quickModel = null;
        var bHasMsg = false;
        var timer1 = null;
        const merge = require('deepmerge')
        const axios = require('axios');
        const duetPing = require('ping');
        const {setIntervalAsync, clearIntervalAsync} = require('set-interval-async/fixed');
        const cleanDeep = require('clean-deep');
        axios.defaults.timeout = 1000;
        //axios.defauts.timeoutErrorMessage = 'timeout';

        //validate pollRate
        if(!isNaN(Number(node.pollRate))){
            if(Number(node.pollRate) <= 199){node.pollRate = 500};
            if(Number(node.pollRate) >= 7001){node.pollRate = 7000};
        } else{
            //not a number so set to default of 500ms
            node.pollRate = 500;
        };

        var failedLogin = function(e, monMode) {
            msg = {
                topic:"dsfModel", 
                payload: null,
                dsf: {
                    monitorMode: monMode,
                    monitorError: "ERROR: Reason = " + e
                }
            };
            node.send(msg);
        };

        function diff(obj1, obj2) {
            try{
                const result = {};
                if (Object.is(obj1, obj2)) {
                    return undefined;
                }
                if (!obj2 || typeof obj2 !== 'object') {
                    return obj2;
                }
                Object.keys(obj1 || {}).concat(Object.keys(obj2 || {})).forEach(key => {
                    if(obj2[key] !== obj1[key] && !Object.is(obj1[key], obj2[key])) {
                        result[key] = obj2[key];
                    }
                    if(typeof obj2[key] === 'object' && typeof obj1[key] === 'object') {
                        const value = diff(obj1[key], obj2[key]);
                        if (value !== undefined) {
                            if (value != null && value != ''){
                                result[key] = value;
                            }
                        }
                    }
                });
                return result;
            }catch(e){
                //console.log("diff error:", e)
                return obj2;
            }
        };
        
        var timeToStr = function (time) {
            let result = "";
            result += time.getFullYear() + "-";
            result += (time.getMonth() + 1) + "-";
            result += time.getDate() + "T";
            result += time.getHours() + ":";
            result += time.getMinutes() + ":";
            result += time.getSeconds();
            return result;
        };
        
        const combineMerge = (target, source, options) => {
            const destination = target.slice()
        
            source.forEach((item, index) => {
                if (typeof destination[index] === 'undefined') {
                    destination[index] = options.cloneUnlessOtherwiseSpecified(item, options)
                } else if (options.isMergeableObject(item)) {
                    destination[index] = merge(target[index], item, options)
                } else if (target.indexOf(item) === -1) {
                    destination.push(item)
                }
            })
            return destination
        };

        function restartDSFMode(){
            setupDSFws();
        }

        async function startDSFInTen(){
            try{
                clearTimeout(node.tmout);
                node.status({fill:"yellow",shape:"dot",text:"No Connection"});
                const resp2 = await doDuetPingCheck()
                    .then(res => res)
                    .catch(function (){
                        failedLogin("Error Pinging DSF", "DSF");
                        node.status({fill:"yellow",shape:"dot",text:"No Response"});
                        return {alive: false}
                    });                
                if(resp2.alive){
                    if(node.nodeRun){
                        node.dsfModeErr = false;
                        setupDSFws();
                    }
                }else{
                    failedLogin("Error connecting to DSF will try again in 10 Seconds", "DSF");
                    setTimeout(() => {  
                        if(node.nodeRun){
                            restartDSFMode();
                        }
                        return;    
                    }, 1000);
                }
            }catch{}
        }

        var setupDSFws = function() {                
            try{
                if(node.nodeRun){
                    node.dsfModeErr = false;
                    const dsfWS = new node.ws(node.wsurl);
                    
                    function heartbeat() {
                        clearTimeout(node.tmout);
                        node.dsfModeErr = true;
                        node.tmout = setTimeout(() => {
                            try{dsfWS.terminate();}catch{}
                            if(node.nodeRun){
                                //restartWS();
                                //console.log("hartbeat restart")
                                startDSFInTen()
                            }
                        }, 30000 + 1000);
                    }

                    dsfWS.on('error', function (){
                        //console.log("socket error")
                        node.status({fill:"yellow",shape:"dot",text:"disconnected"});
                        node.dsfModeErr = true;
                        clearTimeout(node.tmout);
                        try{dsfWS.terminate();}catch{}
                        if(node.nodeRun){
                            //restartWS();
                            startDSFInTen()
                        }
                    });
                    
                    dsfWS.on('open', function open() {
                        node.dsfModeErr = false;
                        node.status({fill:"green",shape:"dot",text:"connected"});
                        dsfWS.send('OK\n');
                        heartbeat();
                    });
        
                    dsfWS.on('close', function open() {
                        //console.log("socket close")
                        if(!node.nodeRun){
                            clearTimeout(node.tmout);
                        }
                    });
        
                    dsfWS.on('message', function incoming(data) {
                        heartbeat(); 
                        if(node.nodeRun){
                            msg = null;
                            var mergedModel = null;
                            var parsedData = null;
                            if(node.dsfFirstMsg){
                                //This is the first model return from dsf, so just output the full model only.
                                node.dsfFullModel = JSON.parse(data);
                                //add msg keys for use later
                                node.dsfFullModel.state.messageBox = {
                                    title: null,
                                    message: null
                                };
                                msg = {
                                    topic:"dsfModel", 
                                    payload: {
                                        fullModel: node.dsfFullModel,
                                        patchModel: null,
                                        prevModel: null
                                    },
                                    dsf: {monitorMode: "DSF"}
                                };
                                node.send(msg);
                                dsfWS.send('OK\n');
                                node.dsfFirstMsg = false;
                            } else {
                                //merge the update with the model
                                parsedData = JSON.parse(data);
                                mergedModel = merge(node.dsfFullModel, parsedData, { arrayMerge : combineMerge });                       
                                //check for msg.timeout if not there then clear any previous msg values (we need this to be statefull to allow for valid consecutive duplicate msg from DSF)
                                //has to be a try/catch as keys may not always exist
                                try {
                                    if(typeof parsedData.state !== "undefined") {
                                        if(typeof parsedData.state.messageBox !== "undefined"){
                                            if(typeof parsedData.state.messageBox.timeout !== "undefined"){
                                                bHasMsg = true;
                                            };
                                        };
                                    };
                                    if (bHasMsg == false){
                                        //the timeout property has gone so assume msg has been cleared. Therefore clear current fullModel values if they exist
                                        if(mergedModel.state.hasOwnProperty('messageBox')){
                                            mergedModel.state.messageBox = {
                                                title: null,
                                                message: null
                                            };
                                        };
                                    } else {
                                        bHasMsg = false;
                                    };
                                }
                                catch(e) {
                                    //do nothing
                                    //console.log("dsf patch error:", e)
                                }                           
                                msg = {
                                    topic:"dsfModel", 
                                    payload: {
                                        fullModel: mergedModel,
                                        patchModel: parsedData,
                                        prevModel:  node.dsfFullModel
                                    },
                                    dsf: {monitorMode: "DSF"}
                                };
                                node.send(msg);
                                node.dsfFullModel = mergedModel;
                                mergedModel = null;
                                dsfWS.send('OK\n');
                            };
                        }
                    });
                }
            }catch(e){
                //console.log(e)
                try{dsfWS.terminate();}catch{}
                if(node.nodeRun){
                    //restartWS();
                    startDSFInTen()
                }
            }               
        };    
            

        async function duetModel() {
            msg = null;
            mergedModel = null;
            parsedData = null;
            node.dsfFullModel = null;
            try{
                let tmpDate = timeToStr(new Date());
                let [tmpLogin] = await Promise.all([
                    axios.get(`${node.duetUrl}${node.duetLogin}${tmpDate}`, { headers: {'Content-Type': 'application/json'}})
                ]).catch(function (error){
                    failedLogin("Error logging into board = " + error, "Duet");
                    node.status({fill:"yellow",shape:"dot",text:"error logging into board"});
                    node.duetModeErr = true;
                    return false;
                }); ;
                let tmpLogErr = tmpLogin.data['err'];
                if (tmpLogErr != 0){
                    if (tmpLogErr == 1) {
                        failedLogin("Invalid Password", "Duet");
                        return false;
                    } else {
                        failedLogin("No Available User Sessions", "Duet");
                        return false;
                    }
                } else{
                    //Get the emty model, board info, quick info, global variables data in stages to avoid overloading board
                    let [tmpEmptyModel] = await Promise.all([
                        axios.get(`${node.duetUrl}${node.duetEMReq}`, { headers: {'Content-Type': 'application/json'}})
                    ]).catch(function (error){
                        console.log("Error getting Empty Model = " + error);
                        node.status({fill:"yellow",shape:"dot",text:"error"});
                        node.duetModeErr = true;
                        return false;
                    }); 
                    const tmpEmptyModel2 = await tmpEmptyModel;

                    let [tmpBoardInfo] = await Promise.all([
                        axios.get(`${node.duetUrl}${node.duetBIReq}`, { headers: {'Content-Type': 'application/json'}})
                    ]).catch(function (error){
                        console.log("Error getting Board Info = " + error);
                        node.status({fill:"yellow",shape:"dot",text:"error"});
                        node.duetModeErr = true;
                        return false;
                    });
                    const tmpBoardInfo2 = await tmpBoardInfo;

                    let [tmpExtdInfo] = await Promise.all([
                        axios.get(`${node.duetUrl}${node.duetFNReq}`, { headers: {'Content-Type': 'application/json'}})
                    ]).catch(function (error){
                        console.log("Error getting Info Update = " + error);
                        node.status({fill:"yellow",shape:"dot",text:"error"});
                        node.duetModeErr = true;
                        return false;
                    });
                    const tmpExtdInfo2 = await tmpExtdInfo;
                    
                    let [tmpGlobalVar] = await Promise.all([
                        axios.get(`${node.duetUrl}${node.duetGVReq}`, { headers: {'Content-Type': 'application/json'}})
                    ]).catch(function (error){
                        console.log("Error getting Global Var Info = " + error);
                        node.status({fill:"yellow",shape:"dot",text:"error"});
                        node.duetModeErr = true;
                        return false;
                    });
                    const tmpGlobalVar2 = await tmpGlobalVar;

                    let [tmpStateInfo] = await Promise.all([
                        axios.get(`${node.duetUrl}${node.duetStateReq}`, { headers: {'Content-Type': 'application/json'}})
                    ]).catch(function (error){
                        console.log("Error getting State Info = " + error);
                        node.status({fill:"yellow",shape:"dot",text:"error"});
                        node.duetModeErr = true;
                        return false;
                    });
                    const tmpStateInfo2 = await tmpStateInfo;

                    mergedModel = tmpEmptyModel2.data['result'];
                    
                    //add null keys for intercept node as not returned as part of model
                    mergedModel.state = tmpStateInfo2.data['result'];
                    mergedModel.state['messageBox'] = {};
                    mergedModel.state.messageBox['title'] = null;
                    mergedModel.state.messageBox['message'] = null;
                    mergedModel['seqs']['reply'] = 0;
                    mergedModel['seqs']['state'] = 0;
                    mergedModel['seqs']['job'] = 0;
                    mergedModel['seqs']['global'] = 0;
                    mergedModel['seqs']['volumes'] = 0;
                    mergedModel['state']['displayMessage'] = null;
                    node.duetEmptyModel = tmpEmptyModel2.data['result'];
                    //mergedModel.boards[0] = tmpBoardInfo2.data; changed due to changes in fw 3.5+
                    mergedModel.boards[0] = tmpBoardInfo2.data['result'];
                    mergedModel.global = tmpGlobalVar2.data['result'];
                    mergedModel = merge(mergedModel, tmpExtdInfo2.data['result'], { arrayMerge : combineMerge });

                    //now get file info - do this here to avoid to many parralell requests
                    let [tmpFileInfo] = await Promise.all([
                        axios.get(`${node.duetUrl}${node.duetFileInfoReq}`, { headers: {'Content-Type': 'application/json'}})                        
                    ]).catch(function (error){
                        console.log("Error getting file info data = " + error);
                        node.status({fill:"yellow",shape:"dot",text:"error"});
                        node.duetModeErr = true;
                        return false;
                    }); 
                    const tmpFileInfo2 = await tmpFileInfo;
                    mergedModel.job = tmpFileInfo2.data['result'];

                    //populate the full model
                    node.dsfFullModel = mergedModel;
                    msg = {
                        topic:"dsfModel", 
                        payload: {
                            fullModel: mergedModel,
                            patchModel: null,
                            prevModel: null
                        },
                        dsf: {monitorMode: "Duet"}
                    };
                    node.dsfFirstMsg = false;
                    node.status({fill:"green",shape:"dot",text:"connected"});
                    node.send(msg);
                    return true;
                }
            }catch(e){                
                console.log("Error connecting/getting data duetModel = " + e.message);
                node.status({fill:"yellow",shape:"dot",text:"error"});
                node.duetModeErr = true;
                return false;
            }
        }; 
            
        async function duetPartModel() {
            mergedModel = null;
            msg = null;
            patchModel = null;
            tmpMsgModel = null;
            tmpFileMod = {};
            if(!node.dsfFirstMsg && node.nodeRun && !node.duetModeErr){
                try{
                    let [tmpExtdInfo, tmpGlobalVar] = await Promise.all([
                            axios.get(`${node.duetUrl}${node.duetFNReq}`, { headers: {'Content-Type': 'application/json'}}),
                            axios.get(`${node.duetUrl}${node.duetGVReq}`, { headers: {'Content-Type': 'application/json'}})
                        ]).catch(function (error){
                            //failedLogin("Error getting main msg data = " + error.toJSON(), "Duet");
                            console.log("part model err:", error.toJSON())
                            node.status({fill:"yellow",shape:"dot",text:"error"});
                            node.duetModeErr = true;
                            return false;
                        });
                    const tmpExtdInfo2 = await tmpExtdInfo;
                    const tmpGlobalVar2 = await tmpGlobalVar;
                    mergedModel = tmpExtdInfo2.data['result'];
                    mergedModel.global = tmpGlobalVar2.data['result'];
                    //check to see if the message or Job count has increased
                    if(mergedModel.hasOwnProperty('seqs')){
                        //console.log("SEQ:", mergedModel.seqs)
                        var bGetExMsg = false;
                        var bGetJobInfo = false;
                        var bGetSateInfo = false;
                        var tmpMsgStr = "";
                        if(mergedModel.seqs.hasOwnProperty('reply')){
                            if(mergedModel.seqs.reply > node.dsfFullModel.seqs.reply){
                                //console.log("Using reply Req");
                                bGetExMsg = true;                               
                            }
                        }
                        if(mergedModel.seqs.hasOwnProperty('job')){
                            if(mergedModel.seqs.job > node.dsfFullModel.seqs.job){
                                //console.log("Using reply Job");
                                bGetJobInfo = true;                                
                            }
                        }
                        if(mergedModel.seqs.hasOwnProperty('state')){
                            if(mergedModel.seqs.state > node.dsfFullModel.seqs.state){
                                //when the state also increases use the state req
                                //console.log("Using Reply State");
                                bGetSateInfo = true; 
                            }
                        }
                        if(bGetExMsg){
                            //console.log("Getting Msg Text")
                            let [tmpDispMsg] = await Promise.all([axios.get(`${node.duetUrl}${node.duetMsgReq}`, { headers: {'Content-Type': 'application/json'}})])
                                .catch(function (error){
                                    //failedLogin("Error getting displayMsg data = " + error.toJSON(), "Duet");
                                    console.log("Failed to retrieve msg text: ", error)
                                    node.duetModeErr = true;
                                    return false;
                                });
                            const tmpDispMsg2 = await tmpDispMsg;
                            tmpMsgStr = tmpDispMsg2.data.trim();
                            mergedModel['state']['consoleMessage'] = tmpMsgStr
                        }
                        if(bGetJobInfo){
                            let [tmpFileInfo] = await Promise.all([
                                axios.get(`${node.duetUrl}${node.duetFileInfoReq}`, { headers: {'Content-Type': 'application/json'}})                        
                            ]).catch(function (error){
                                console.log("Error getting file data = ", error);
                                node.status({fill:"yellow",shape:"dot",text:"error"});
                                node.duetModeErr = true;
                                return false;
                            }); 
                            const tmpFileInfo3 = await tmpFileInfo;
                            tmpFileMod = tmpFileInfo3.data['result'];
                            mergedModel.job = tmpFileMod;
                        }
                        //get state info last
                        if(bGetSateInfo){
                            let [tmpStateMsg] = await Promise.all([axios.get(`${node.duetUrl}${node.duetStateReq}`, { headers: {'Content-Type': 'application/json'}})
                            ]).catch(function (error){
                                //failedLogin("Error getting state data = " + error.toJSON(), "Duet");
                                console.log("Failed to retrieve state data update: ", error)
                                node.duetModeErr = true;
                                return false;
                            });     
                            const tmpStateMsg2 = await tmpStateMsg;
                            mergedModel.state = tmpStateMsg2.data['result'];
                            //check if last disp msg is the same as the last msg and we have a msg box then remove old msg
                            if(mergedModel.state.hasOwnProperty('dispalyMessage')){
                                if(mergedModel.state.hasOwnProperty('messageBox') && node.lastDispMsg === mergedModel.state.displayMessage){
                                    mergedModel.state.displayMessage = "";
                                }
                                node.lastDispMsg = mergedModel.state.displayMessage;
                            }else{

                            }
                        }
                        //update msg string last
                        if(tmpMsgStr.length > 0 && mergedModel.hasOwnProperty('state')){
                            mergedModel['state']['consoleMessage'] = tmpMsgStr;
                        }
                    }

                    //remove previous msgs from full model if they have not changed
                    if(node.dsfFullModel.hasOwnProperty('state')){
                        node.dsfFullModel["state"]["consoleMessage"] = "";
                    }
 
                    patchModel = diff(node.dsfFullModel, mergedModel);
                    patchModel = cleanDeep(patchModel);
                    mergedModel = merge(node.dsfFullModel, mergedModel, { arrayMerge : combineMerge });
                    
                    //override job data if count increased this is to ensure finished jobs are cleared
                    if(bGetJobInfo){
                        mergedModel.job = tmpFileMod;
                    }
                    //override global merge as is causes problems with arrays
                    mergedModel.global = tmpGlobalVar2.data['result'];
                    patchModel.global = tmpGlobalVar2.data['result'];

                    msg = {
                        topic:"dsfModel", 
                        payload: {
                            fullModel: mergedModel,
                            patchModel: patchModel,
                            prevModel:  node.dsfFullModel
                        },
                        dsf: {monitorMode: "Duet"}
                    };
                    
                    node.dsfFullModel = mergedModel;
                    mergedModel = null;
                    node.send(msg);
                }
                catch(e){
                    //failedLogin("Error getting data duetPartModel = " + e, "Duet");
                    console.log("part model err2:", e)
                    node.status({fill:"yellow",shape:"dot",text:"error"});
                    node.duetModeErr = true;
                    return false;
                }
                return true;
            }else{
                return false;
            }
        };

        function stopDuetMode(){
            node.nodeRun = false;
            //console.log("NodeDSF Stopping")
            node.status({fill:"red",shape:"dot",text:"Stopped"});
            //stop the polling
            try{
                if(timer1){clearIntervalAsync(timer1);}
            }catch{}
            timer1 = null;
            let lout = null;
            if(!node.duetModeErr){
                //normal shutdown so end sessions etc
                try{
                    lout = axios.get(`${node.duetLogoff}`, { headers: {'Content-Type': 'application/json'}})
                    .then(res => res)
                    .catch(function (){
                        node.dsfFirstMsg = true;
                        node.duetModeErr = false;
                    });
                }catch{}
                node.dsfFirstMsg = true;
                node.duetModeErr = false;
                node.status({fill:"red",shape:"dot",text:"Stopped"});
            }else{
                //
            }

        }

        function restartDuetMode(){
            node.restarting = true;
            //stop the polling
            //console.log("NodeDSF Restarting")
            node.status({fill:"green",shape:"ring",text:"starting"});
            try{
                if(timer1){clearIntervalAsync(timer1);}
            }catch{}
            timer1 = null;
            node.dsfFirstMsg = true;
            node.duetModeErr = false;
            node.restarting = false;
            nodeFirstStart();
        }

        async function startDuetMode(){
            node.status({fill:"green",shape:"ring",text:"starting"});
            const bGotFirstModel = duetModel().then(res => res);
            let dpm = false;
            if(bGotFirstModel && !node.duetModeErr){
                //run the partModel
                timer1 = setIntervalAsync(function() {
                    if(node.nodeRun && !node.duetModeErr) {
                        dpm = duetPartModel()
                        .then(res => res)
                        .catch(function (){
                            failedLogin("Error Getting Poll Data", "Duet");
                        });
                    }else{
                        if(node.nodeRun){
                            restartDuetMode();
                        }
                        else{
                            stopDuetMode();
                        }
                    }
                }, Number(node.pollRate));
            }else{
                if(node.nodeRun && !node.restarting){
                    restartDuetMode();
                }
            }

        }

        async function doDuetPingCheck(){
            try{
                var host = node.server.server;
                const resp1 = await duetPing.promise.probe(host, {
                    timeout: 2,
                })
                .then(res => res)
                .catch(function (){
                    failedLogin("Error Pinging board", "Duet");
                    return {alive: false};
                });
                return resp1;
            }catch{

            }
        }
        
        async function nodeFirstStart() {
            try{
                node.status({fill:"green",shape:"ring",text:"starting"});
                const resp2 = await doDuetPingCheck()
                    .then(res => res)
                    .catch(function (){
                        failedLogin("Error Pinging board", "Duet");
                        return {alive: false}
                    });                
                if(resp2.alive){
                    //start montior
                    node.duetModeErr = false;
                    node.dsfFirstMsg = true;
                    startDuetMode()
                }else{
                    failedLogin("Error connecting to Duet. Either the board is turned off, or unreachable by NodeRed ping. Use the Ping node to check if your Duet is reachable from NodeRed. The system will try to connect again in 10 seconds", "Duet");
                    setTimeout(() => {  
                        if(node.nodeRun){
                            restartDuetMode();
                        }else{
                            stopDuetMode();
                        }
                        return;    
                    }, 10000);
                }
            }catch{

            }
        }

        //run the node
        node.status({fill:"red",shape:"dot",text:"Stopped"});
        if (node.server) {          
            if(node.autoStart){
                if(node.server.btype == "DSF"){
                    setupDSFws();
                }else if(node.server.btype == "Duet"){
                    nodeFirstStart();
                };
            };
        } else {
            failedLogin("No server defined or cannot connect", "NONE");
        };

        node.on('close', function() {           
            node.status({fill:"red",shape:"dot",text:"Stopped"});
            if(node.server.btype == "DSF"){
                try{
                    // close ws
                    node.nodeRun = false; 
                    //console.log("Stopping NodeDSF")
                    try{dsfWS.terminate();}catch{}
                }
                catch(e){
                   console.log(e);
                }
            }else{
                //try to clear async timers just in case
                try{
                    stopDuetMode();
                }
                catch(e){
                    console.log(e);
                }
            }
        });

        node.on('input', function(msg) {
            //toggle start/stop of polling
            try{
                let toggle = msg.payload.monitorState;
                if(toggle == "ON"){
                    node.status({fill:"green",shape:"ring",text:"starting"});
                    node.nodeRun = true;
                    node.dsfFirstMsg = true;
                    if(node.server.btype == "DSF"){
                        setupDSFws();
                    }
                    else if(node.server.btype == "Duet"){
                        if(node.server){
                            if(node.server.btype == "Duet"){
                                nodeFirstStart();
                            };
                        };
                    };
                }
                else if(toggle == "OFF"){
                    node.status({fill:"red",shape:"dot",text:"Stopped"});
                    if(node.server.btype == "DSF"){
                        try{
                            // close ws
                            node.nodeRun = false; 
                            //console.log("Stopping NodeDSF")
                            try{dsfWS.terminate();}catch{}
                        }
                        catch(e){
                            console.log(e);
                        }
                    }else{
                        node.nodeRun = false;
                        try{
                            stopDuetMode();  
                        }
                        catch(e){
                            console.log(e);
                        }
                    }
                    node.status({fill:"red",shape:"dot",text:"Stopped"});
                }
            }
            catch(e) {
                //no msg.payload.monitorState was received so take no action just fwd on the msg for completeness
                msg.dsf = {
                    monitorMode: node.server.btype,
                    monitorError: "No monitorState specified or Uncaught Error : err = " + e
                }
                node.send(msg);
                node.status({fill:"red",shape:"dot",text:"Stopped"});
            }
        });
    };
    RED.nodes.registerType("dsf-monitor", dsfMonitorNode);

    function dsfCommandNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.command = n.command;
        this.server = RED.nodes.getNode(n.server);
        this.password = this.server.plainPass;
        if(!this.password || this.password === "") {this.password = "reprap"};
        this.duetLogin = (`http://${this.server.server}/rr_connect?password=${this.password}&time=`); //login info
        this.dsfURL = (`http://${this.server.server}/machine/code/`);
        this.duetURL = (`http://${this.server.server}/rr_gcode?gcode=`);
        var node = this;
        var tmpLogErr = null;
        const axios = require('axios');

        var timeToStr = function (time) {
            let result = "";
            result += time.getFullYear() + "-";
            result += (time.getMonth() + 1) + "-";
            result += time.getDate() + "T";
            result += time.getHours() + ":";
            result += time.getMinutes() + ":";
            result += time.getSeconds();
            return result;
        };

        var failedCMD = function(e, msg) {
            if (typeof msg.dsf !== "undefined"){
                msg.dsf.cmdSent = "ERROR: No DSF server or Duet Board defined, or cannot connect. Command has not been sent! error = " + e;
            } else {
                msg.dsf = {cmdSent: "ERROR: No DSF server or Duet Board defined, or cannot connect. Command has not been sent! error = " + e};
            }
            node.send(msg);
        };

        var failedLogin = function(e, msg) {
            if (typeof msg.dsf !== "undefined"){
                msg.dsf.cmdSent = "ERROR: CMD Rejected. Command has not been sent! Reason = " + e;
            } else {
                msg.dsf = {cmdSent: "ERROR: CMD Rejected. Command has not been sent! Reason = " + e};
            }
            node.send(msg);
        };
        
        var sndCommand = async function(msg) {
            if (node.server) {
                var strCMD = null;

                if (typeof msg.payload.cmd !== "undefined"){
                    strCMD = msg.payload.cmd;
                } else {
                    strCMD = node.command;
                }
                       
                try{
                    if(node.server.btype == "DSF"){
                        axios.post(node.dsfURL, strCMD);
                        if (typeof msg.dsf !== "undefined"){
                            msg.dsf.cmdSent = node.dsfURL+strCMD;
                        } else {
                            msg.dsf = {cmdSent: node.dsfURL+strCMD};
                        }
                        node.send(msg);
                    }
                    if(node.server.btype == "Duet"){
                        let tmpDate = timeToStr(new Date());
                        let [tmpLogin] = await Promise.all([
                             axios.get(`${node.duetLogin}${tmpDate}`, { headers: {'Content-Type': 'application/json'}})
                        ]);
                        tmpLogErr = tmpLogin.data['err'];
                        if (tmpLogErr != 0){
                            if (tmpLogErr == 1) {
                                failedLogin("Invalid Password", msg);
                                return;
                            } else {
                                failedLogin("No Available User Sessions", msg);
                                return;
                            }
                        } else{
                            axios.get(`${node.duetURL}${strCMD}`, { headers: {'Content-Type': 'application/json'}})
                            if (typeof msg.dsf !== "undefined"){
                                msg.dsf.cmdSent = node.duetURL+strCMD;
                            } else {
                                msg.dsf = {cmdSent: node.duetURL+strCMD};
                            }
                            node.send(msg);
                        };        
                    };
                    
                }
                catch(e){
                    failedCMD(e, msg);
                };
            };
        };
        
        node.on('input', function(msg) {
            sndCommand(msg);
        });
        node.on('close', function() {
            // close ws
            //node.dsfWS.close()
        });
    };
    RED.nodes.registerType("dsf-command", dsfCommandNode);

}
