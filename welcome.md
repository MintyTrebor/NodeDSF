# NodeDSF
NodeDSF is a set of nodes which enable Node-Red to interface with the [Duet Software Framework](https://github.com/Duet3D/DuetSoftwareFramework) (v3+) running on an SBC.

The Duet Software Framework (DSF) is part of a suite of software components (from [Duet3d](https://www.duet3d.com/)) that manage control boards running [RepRap](https://reprap.org/wiki/RepRap) firmware, which execute g-code to operate a physical machine. These are typically used by 3d Printers, CNC machines etc..

DSF calls anything connected to a control board a **Machine**, and constructs a [Machine Model](https://duet3d.dozuki.com/Wiki/Object_Model_of_RepRapFirmware) representing the current state of the entire Machine and its associated components.

DSF can output its Machine Model to a client via a web-socket. NodeDSF enables the connection and provides a set of nodes to use the Machine Model in Node-Red.

The Machine Model is a JSON object representing the current state of the Machine which is constantly updated by DSF and passed to the connected web-socket client.

**NodeDSF has 5 nodes:**

 - **dsf-connector** *(control node)* : Stores the connection details enabling the web-socket connection to DSF.  
 - **dsf-monitor**: Creates the web-socket connection to DSF and processes the Machine Model updates.
 - **dsf-event** : Parses the updated Machine Model for a specified object value change, and triggers when a match if found.
 - **dsf-intercept**: Watches for specially formatted messages embedded within running g-code to trigger events within Node_Red.
 - **dsf-command**: Send a g-code or m-code command to DSF for action.

Please refer to the [NodeDSF wiki](https://github.com/MintyTrebor/NodeDSF) on github for detailed instructions on usage, and example flows.


