# This is the source code for the optional DWC PLugin

Download the latest NodeDSF_Plugin.zip from the releases section, and upload it to DWC through the Upload System Files function. Confirm you wish to install the plugin and then navigate to Machine Settings -> Plugins to activate the NodeDSF Plugin.

NodeDSF should now appear in the settings section of the DWC side menu.

When you click NodeDSF a small settings button will be shown in the top right of the page section. Clicking this button will open a small input to capture the URL to your node-red dashboard or custom user interface.

Note: Typically the URL to access the node-red dashboard system will be http://[SBC_IP]:1880/ui.

### Important Reminder  
The NodeDSF plugin should only be used if node-red is installed on the same SBC as DSF, and you have created a dashboard using the dashboard nodes or uibuilder. 

## Development Note:
This plugin is a simple configurable iframe, for which browsers by default will limit the ability to perform cross site scripting etc, for (good!) security reasons. It is for this reason alone that it should only be used when node-red & NodeDSF are installed on the same SBC as DSF. Both the node-red dashboard and uiTemplate nodes this plugin is designed for, will not operate correctly unless node-red is operating locally. I am aware of the mitigation methods available but I have no intention of changing this default behaviour.
