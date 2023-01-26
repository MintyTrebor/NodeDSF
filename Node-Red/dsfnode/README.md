# dsfnode
**dsfnode** is a set of nodes which enable Node-Red to interface with the [Duet Software Framework](https://github.com/Duet3D/DuetSoftwareFramework) (v3+) running on an SBC, or a network enabled Duet v2/3 (or compatible) control board running v3.3+ RepRap firmware.  

The RepRap firmware labels anything operated by itself a 'Machine', and constructs a [Object Model](https://duet3d.dozuki.com/Wiki/Object_Model_of_RepRapFirmware) representing the current state of the entire Machine and its associated components. A network enabled Duet control board, or DSF running on an SBC, can output the Object Model to a client via a web-socket or rest api. **dsfnode** enables the connection and provides a set of nodes to use the Object Model in Node-Red. The Object Model is a JSON object representing the current state of the Machine which is constantly updated by DSF and passed to the connected web-socket client.  
 
**dsfnode has 5 nodes:**

 - **dsf-connector** *(control node)* : Stores the mode & connection details enabling the web-socket connection to the DSF or a network enabled Duet control board.  
 - **dsf-monitor**: Creates the web-socket connection to DSF/Duet and processes the Machine Model updates.  
 - **dsf-event** : Parses the updated Machine Model for a specified object value change, and triggers when a match if found.  
 - **dsf-intercept**: Watches for specially formatted messages embedded within running g-code to trigger events within Node_Red.  
 - **dsf-command**: Send a g-code or m-code command to DSF for action.  

Please refer to the [NodeDSF wiki](https://github.com/MintyTrebor/NodeDSF) on github for detailed instructions on usage, and example flows.  
  
**Note:** Duet control boards have connection/session limitations, and dsfnode consumes at least one of the available sessions. Please refer to the [NodeDSF wiki](https://github.com/MintyTrebor/NodeDSF) on github for more information. When operating in Duet mode it is not recommended to have the DWC web interface open on the same computer running **dsfnode**/node-red. The **Duet** mode currently delivers a subset of the full Object Model to reduce load on the control boards. If there is data that is missing please raise an issue and I will see if it can be added.
  
**Change Log**  
V1.1.10 - Updated to NodeRed V3+. Fixed buggy Intercept Node, and messaging system. M118 and other console messages will now be found in state.consoleMessage. M117 message text will remain in state.displayMessage.
V1.1.9 - Improved Msg Handling in Duet mode.  
V1.1.8 - Added status indicators to monitor node.  
V1.1.7 - Better recovery handling for emergency stop situations and power failures. Further changes to M118 & M291 handling, General Bug Fixes.  
V1.1.6 - For Node-Red V2+ & Tested on RepRapFirmware 3.4RC1. Changes to the way M118 & M291 are handled. General Bug Fixes.  
V1.1.5 - Improved communication in Duet mode which should resolved rare issue where board could crash or fail to respond, plus fixed node not stopping on deploy when active.  
V1.1.4 - Fixed issue with M117/M118 Messages not being included in the model when in Duet Mode  
V1.1.3 - Added Global Variables to the Monitor Node  
V1.1.2 - Added support for password protected connections (Note: passwords are in clear text as per Duet spec) & improved error handling.  
V1.1 - Add Duet mode to enable connection to network enabled control boards not running with DSF on SBC  
V1 - Initial Release  
