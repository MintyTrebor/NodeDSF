These flows demonstrate how to create HTML based interfaces for Node-DSF's optional plugin.

2 Nodes are added:

NodeDSF - This is the main page and also provides the sidebar menu. Edit this to link to your own uiBuilder nodes. You will need to edit the HTML to update IP addresses.  

NodeDSFHome - The NodeDSF basic HTML home page.

Relys on the 3rd party uiBuilder node. Please review the instructions for this node [here](https://flows.nodered.org/node/node-red-contrib-uibuilder). It relies on the vuejs framework being added to uibuilder (see nodes help for instructions on how to add frameworks)

Once the flow is deployed in node-red, copy the uiBuilder code sets into the appropriate directory in your node-red folder and edit as required.  

Typically this is

    /home/pi/.node-red/uibuilder/[node name]
    

The NodeDSF DWC plugin can be set to open any uibuilder node by changing the url to the name of the node..  
eg. NodeDSF
