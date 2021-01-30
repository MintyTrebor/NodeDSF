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
                                msg.payload.cmdCode = cmdVal;
                                node.send(msg); 
                            };
                        };
                    };
                };
            };
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
            var patchJSON = msg.payload.patchModel;
            if(patchJSON){
                var matchInPatch = jp.query(patchJSON, (`$.${node.modelPath}`));
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
                        msg.payload.eventValue = matchVal;
                        msg.payload.lastEventValue = node.lastValue;
                        node.send(msg);
                        node.lastValue = matchVal;
                        node.lastMsgTime = Date.now();
                    };    
                    sndDelta = false;
                    sndInt = false;
                    currDiff = null;
                };
            };
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
        this.wsurl = (`ws://${this.server.server}/machine`);
        this.ws = require('ws');
        this.dsfFirstMsg = true;
        this.dsfFullModel = null;
        var node = this;
        var msg = null;
        const merge = require('deepmerge')
        
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

        if (node.server) {
            var restartWS = function() {
                msg = null;
                msg = {topic:"dsfModel", payload: "No server defined or cannot connect. Checking again in 10 seconds"};
                node.send(msg);
            };
            
            var setupDSFws = function() {                
                try{
                    node.dsfWS = new node.ws(node.wsurl);
                }
                catch(e){
                    restartWS();
                    setTimeout(() => {  setupDSFws(); }, 10000);
                }
                
                node.dsfWS.on('error', function (){
                    restartWS();
                    setTimeout(() => {  setupDSFws(); }, 10000);
                });
                
                node.dsfWS.on('open', function open() {
                    node.dsfWS.send('OK\n');
                });

                node.dsfWS.on('message', function incoming(data) {
                    msg = null;
                    var mergedModel = null;
                    var parsedData = null;
                    if(node.dsfFirstMsg){
                        //This is the first model return from dsf, so just output the full model only.
                        node.dsfFullModel = JSON.parse(data);
                        msg = {
                            topic:"dsfModel", 
                            payload: {
                                fullModel: JSON.parse(data)
                            }
                        };
                        node.send(msg);
                        node.dsfWS.send('OK\n');
                        node.dsfFirstMsg = false;
                    } else {
                        //merge the update with the model
                        parsedData = JSON.parse(data);
                        mergedModel = merge(node.dsfFullModel, parsedData, { arrayMerge : combineMerge });                       
                        msg = {
                            topic:"dsfModel", 
                            payload: {
                                fullModel: mergedModel,
                                patchModel: JSON.parse(data),
                                prevModel:  node.dsfFullModel 
                            }
                        };
                        node.send(msg);
                        node.dsfFullModel = mergedModel;
                        mergedModel = null;
                        node.dsfWS.send('OK\n');
                    };
                });
            };
            setupDSFws();
        } else {
            msg = null;
            msg = {topic:"dsfModel", payload: "no server defined or cannot connect"};
            node.send(msg);
        };
        node.on('close', function() {
            // close ws
            node.dsfWS.close()
        });
    };
    RED.nodes.registerType("dsf-monitor", dsfMonitorNode);

    function dsfCommandNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.command = n.command;
        this.server = RED.nodes.getNode(n.server);
        this.dsfURL = (`http://${this.server.server}/machine/code/`);
        var node = this;
        const axios = require('axios');

        
        var failedCMD = function() {
            msg = null;
            msg = {topic:"dsfCommand", payload: "No server defined or cannot connect. Command has not been sent!"};
            node.send(msg);
        };
        
        var sndCommand = function(msg) {
            if (node.server) {
                var strCMD = null;

                if (typeof msg.payload.cmd !== "undefined"){
                    strCMD = msg.payload.cmd;
                } else {
                    strCMD = node.command;
                }
                       
                try{
                    axios.post(node.dsfURL, strCMD);
                    node.send(msg);
                }
                catch(e){
                    failedCMD();
                };
            };
        };
        
        node.on('input', function(msg) {
            sndCommand(msg);
        });
    };
    RED.nodes.registerType("dsf-command", dsfCommandNode);
}
