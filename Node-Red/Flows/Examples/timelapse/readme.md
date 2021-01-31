This sample flow is a simple time-lapse solution for recording images @ each layer change and compiling the images into a video once the job has completed.

It was designed to capture a static image from a webcam provisioned with [motion/motioneye](https://github.com/ccrisan/motioneye/wiki), and uses ffmpeg to process the images into a video. You will need to install ffmpeg on the SBC, and have a working webcam solution that provides a url for static images (eg motion).

To build the flow the following additional nodes were added to node-red through the palette manager:

 - node-red-contrib-fs-ops - used to manage filesystem functions  
 - node-red-dashboard - used to create a dashboard to manage user defined settings  
 - node-red-contrib-uibuilder -  used to create an alternative HTML based interface to manage user defined settings  
 
The flow also uses node-reds persistence feature to store the user defined settings to a file. See this [wiki page](https://github.com/MintyTrebor/NodeDSF/wiki/Installing-Node-Red) for instruction on how to enable persistence in node-red.  


### Deployment 

Copy the contents of [NodeDSF Timelapse 300121.json](https://github.com/MintyTrebor/NodeDSF/blob/main/Node-Red/Flows/Examples/timelapse/NodeDSF%20Timelapse%20300121.json) and import into a new flow in node-red using the import function from the main menu in the node-red interface.





Once you have deployed the flow, you must connect the **Timelapse monitor in** node to your DSF-Monitor out node.

Within the flow is the **Timelapse Defaults** inject node which if activated will set the default parameters for the flow. You can change these to reflect your settings if you wish. (I recommend activating this node at once before using for the first time to ensure the values are setup, before you change them in a dashboard etc).

Within the dashboard nodes are the instruction on how to setup your slicer to enable the time-lapse to function, for ease of reference these are replicated below.


### Slicer Settings
To enable Timelapse enter the following command into your slicers start g-code:

    M291 P"Reset File Counter" R"NRCMD"

To take a photo at every layer change, enter the following command into your slicers before layer change g-code:

    M291 P"SnapShot Me" R"NRCMD"

To start the video conversion at the end of a job, enter the following command into your slicers end gcode:

    M291 P"Convert To Video" R"NRCMD"

### Example 'before layer change' g-code

The g-code below shows a basic set of instructions for a cartesian style 3d Printer:

  

    G60 R1 ; Save Current Co-ords to slot 1  
    M83 ; Relative Moves  
    G91 ; Relative positioning  
    G1 Z5 F360 ; lift Z by 5mm  
    G90 ; absolute positioning  
    G1 X0 Y100 F6000 ; go to X=0 Y=100  
    G4 S1 ; wait 2 secs  
    M291 P"SnapShot Me" R"NRCMD" ; snd command to NodeDSF & wait for reply  
    G4 S2 ; wait 2 secs  
    G1 R1 X0 Y0 ; go back to the last print move stored in slot 1  
    M83 ; relative extruder moves  

You will need to adapt these to suit your printer and to control things like ooze etc.

To enable automatic video creation, install ffmpeg on your r-pi by running the following from a terminal/ssh session:

    sudo apt-get install ffmpeg

## User Interfaces
There are two example user interfaces provided.

### Dashboard
This will auto configure when you deploy the flow. You can adjust the dashboard layout and setting by accessing the dashboard menu from the top right of the right-side-panel of the node-red interface.

### uibuilder
This will require you to copy the additional files [here](https://github.com/MintyTrebor/NodeDSF/tree/main/Node-Red/Flows/Examples/timelapse/uibuilder%20code/NodeDSFTimeLapse/src) to the directory created by the **NodeDSFTimeLapse** uibuilder node in the flow. This directory is normally in

    ~/.node-red/uibuilder/NodeDSFTimeLapse/src

Re-deploy the flow once the files have been copied. The UI can be accessed by navigating to `http://[node-red-ip]:1880/NodeDSFTimeLapse`.

If you do not wish to use uibuilder you can remove **NodeDSFTimeLapse** and its associated nodes from the flow with no impact.
