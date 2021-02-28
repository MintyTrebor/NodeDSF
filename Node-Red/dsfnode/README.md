# dsfnode
**dsfnode** is a set of nodes which enable Node-Red to interface with the [Duet Software Framework](https://github.com/Duet3D/DuetSoftwareFramework) (v3+) running on an SBC, or a network enabled Duet v2/3 (or compatible) control board running v3+ RepRap firmware.

The Duet Software Framework (DSF) is part of a suite of software components (from [Duet3d](https://www.duet3d.com/)) that manage control boards running [RepRap](https://reprap.org/wiki/RepRap) firmware, which execute g-code to operate a physical machine. This is typically used by 3d Printers, CNC machines etc..

The RepRap firmware labels anything operated by itself a 'Machine', and constructs a [Machine Model](https://duet3d.dozuki.com/Wiki/Object_Model_of_RepRapFirmware) representing the current state of the entire Machine and its associated components.

A network enabled Duet control board or DSF can output its Machine Model to a client via a web-socket or rest api. **dsfnode** enables the connection and provides a set of nodes to use the Machine Model in Node-Red.

The Machine Model is a JSON object representing the current state of the Machine which is constantly updated by DSF and passed to the connected web-socket client.

**dsfnode has 5 nodes:**

 - **dsf-connector** *(control node)* : Stores the mode & connection details enabling the web-socket connection to the DSF or a network enabled Duet control board.  
 - **dsf-monitor**: Creates the web-socket connection to DSF/Duet and processes the Machine Model updates.
 - **dsf-event** : Parses the updated Machine Model for a specified object value change, and triggers when a match if found.
 - **dsf-intercept**: Watches for specially formatted messages embedded within running g-code to trigger events within Node_Red.
 - **dsf-command**: Send a g-code or m-code command to DSF for action.

**dsfnode** is part of a project called NodeDSF which includes a DSF plugin for DWC, plus example Node-Red flows and dashboards. Please refer to the [NodeDSF wiki](https://github.com/MintyTrebor/NodeDSF) on github for detailed instructions on usage, and example flows.  
  
**Note:** Duet control boards have connection/session limitations, and dsfnode consumes at least one of the available sessions, Please refer to the [NodeDSF wiki](https://github.com/MintyTrebor/NodeDSF) on github for more information. The **Duet** mode currently delivers a subset of the full machine model to reduce load on the control boards. If there is data you require that is missing please raise an issue and I will see if it can be added.

**Change Log**  
V1.1.2 - Added support for password protected connections (Note: passwords are in clear text as per Duet spec) & improved error handling.  
V1.1 - Add Duet mode to enable connection to network enabled control boards not running with DSF on SBC  
V1 - Initial Release
