These flows demonstrate how to create HTML based interfaces for Node-DSF's optional plugin.

2 Nodes are added:

NodeDSF - This is the main page and also provides the sidebar menu. Edit this to link to your own uiBuilder nodes. You will need to edit the HTML to update IP addresses.  

NodeDSFHome - The NodeDSF basic HTML home page.

They rely on the 3rd party uiBuilder node. Once the flow is deployed then copy the uiBuilder code sets into the appropriate directory in your node-red folder.
Typically this is

    /home/pi/.node-red/uibuilder/[node name]
    

